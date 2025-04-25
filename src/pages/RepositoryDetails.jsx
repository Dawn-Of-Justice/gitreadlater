import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt, FaEdit, FaTrash, FaCircle, FaTimes, FaSpinner, FaCheck, FaArrowLeft, FaArrowUp } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import { getReadmeContent } from '../services/githubService';
import { updateRepository, deleteRepository, getUserTags } from '../services/repositoryService';
import { useTheme } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const RepositoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Repository state
  const [repository, setRepository] = useState(null);
  const [readme, setReadme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previousTags, setPreviousTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  // Scroll state
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  const { invalidateRepositories } = useCache();

  // Add this near the top of your component
  const tagInputRef = useRef(null);
  const tagSuggestionsRef = useRef(null);

  // Check scroll position to show/hide the scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Function to scroll back to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Fetch repository data
  useEffect(() => {
    const fetchRepository = async () => {
      try {
        setLoading(true);
        
        // Try to fetch from both repository tables
        let repoData = null;
        
        // Try main repositories table first
        const { data: mainRepo, error: mainError } = await supabase
          .from('repositories')
          .select('*')
          .eq('id', id)
          .single();
          
        if (!mainError && mainRepo) {
          repoData = mainRepo;
        } else {
          // Try saved_repositories table
          const { data: savedRepo, error: savedError } = await supabase
            .from('saved_repositories')
            .select('*')
            .eq('id', id)
            .single();
            
          if (!savedError && savedRepo) {
            repoData = savedRepo;
          }
        }
        
        if (repoData) {
          setRepository(repoData);
        } else {
          // Repository not found - redirect to dashboard
          console.log('Repository not found, redirecting to dashboard');
          navigate('/', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error fetching repository:', error);
        setError('Error loading repository details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRepository();
  }, [id, navigate]);
  
  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      await updateRepository(id, {
        notes,
        tags,
      }, invalidateRepositories); // Pass the cache invalidation function
      
      // Update local state
      setRepository({
        ...repository,
        notes,
        tags,
      });
      
      setIsEditing(false);
      setSaving(false);
    } catch (err) {
      console.error('Error updating repository:', err);
      setError('Failed to save changes. Please try again.');
      setSaving(false);
    }
  };
  
  // Replace both handleDeleteRepository and handleDelete with this unified function:
const handleDeleteRepository = async () => {
  try {
    // Check for active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session');
      setError('Authentication required. Please log in again.');
      return;
    }
    
    // Only allow deletion if this repo belongs to the user
    if (repository.user_id !== session.user.id) {
      console.error('Unauthorized deletion attempt');
      setError('You can only delete your own repositories.');
      return;
    }
    
    // First, try to delete from the main repositories table
    const { error: mainError } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);
    
    // If that fails or if we also need to check saved_repositories
    if (mainError) {
      console.log('Trying saved_repositories table after error:', mainError);
      
      // Try deleting from saved_repositories table
      const { error: savedError } = await supabase
        .from('saved_repositories')
        .delete()
        .eq('id', id);
      
      if (savedError) {
        throw savedError;
      }
    }
    
    // If we have invalidateRepositories, call it to refresh cache
    if (typeof invalidateRepositories === 'function') {
      invalidateRepositories();
    }
    
    // Show a success message if toast is available
    if (typeof toast !== 'undefined') {
      toast.success('Repository deleted successfully');
    } else {
      console.log('Repository deleted successfully');
    }
    
    // Navigate back to the dashboard
    navigate('/', { replace: true });
  } catch (err) {
    console.error('Error deleting repository:', err);
    setError('Failed to delete repository. Please try again.');
    setConfirming(false);
  }
};
  
  // Add a tag
  const addTag = () => {
    const trimmedTag = tagInput.trim();
    
    if (!trimmedTag) return;
    
    // Prevent duplicates
    if (tags.includes(trimmedTag)) {
      setTagInput('');
      return;
    }
    
    setTags([...tags, trimmedTag]);
    setTagInput('');
    setShowTagSuggestions(false); // Hide suggestions after adding
  };
  
  // Remove a tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle Enter key in tag input
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Add function to fetch user's previous tags
  const fetchUserTags = async () => {
    try {
      const userTags = await getUserTags();
      // Filter out tags that are already in the current repository
      setPreviousTags(userTags.filter(tag => !tags.includes(tag)));
    } catch (err) {
      console.error('Error fetching user tags:', err);
    }
  };

  // Load user's previously used tags when edit mode is activated
  useEffect(() => {
    if (isEditing) {
      fetchUserTags();
    } else {
      setShowTagSuggestions(false);
    }
  }, [isEditing]);

  // Add function to handle tag input focus
  const handleTagInputFocus = () => {
    setShowTagSuggestions(true);
  };

  // Add function to select a tag from suggestions
  const selectTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    
    // Update the previousTags to remove the selected tag
    setPreviousTags(previousTags.filter(t => t !== tag));
  };

  // Add a function to filter tag suggestions based on input
  const filteredTagSuggestions = tagInput.trim() 
    ? previousTags.filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()))
    : previousTags;

  // Add this useEffect to handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTagSuggestions && 
          tagSuggestionsRef.current && 
          tagInputRef.current && 
          !tagSuggestionsRef.current.contains(event.target) &&
          !tagInputRef.current.contains(event.target)) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagSuggestions]);
  
  return (
    <div className={`${themeClasses.body} min-h-screen py-8`}>
      <div className="container mx-auto px-6 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className={`${themeClasses.dangerBanner} p-4 rounded-md transition-colors duration-300`}>
            <p>{error}</p>
            <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
              Back to Dashboard
            </Link>
          </div>
        ) : repository ? (
          <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-3xl font-bold mb-2 md:mb-0">{repository.repo_name}</h1>
              
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
                    >
                      <FaEdit className="mr-2" />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => setConfirming(true)}
                      className={`${themeClasses.dangerButton} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
                    >
                      <FaTrash className="mr-2" />
                      <span>Delete</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
                    >
                      {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                      <span>Save</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNotes(repository.notes || '');
                        setTags(repository.tags || []);
                      }}
                      className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md transition-colors duration-300`}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Repository Information */}
            <div className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden mb-6 transition-colors duration-300`}>
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between mb-4">
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-2 transition-colors duration-300`}>
                      {repository.repo_owner}/{repository.repo_name}
                    </p>
                    
                    {repository.description && (
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3 transition-colors duration-300`}>
                        {repository.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {repository.language && (
                        <div className="flex items-center space-x-1 text-sm">
                          <FaCircle className="text-blue-500" style={{ fontSize: '10px' }} />
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{repository.language}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1 text-sm">
                        <FaStar className="text-yellow-500" />
                        <span>{repository.stars || 0}</span>
                      </div>
                      
                      <a 
                        href={repository.repo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center space-x-1 text-sm"
                      >
                        <span>View on GitHub</span>
                        <FaExternalLinkAlt className="text-xs ml-1" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                      Saved on {new Date(repository.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <hr className={`my-4 ${themeClasses.divider} transition-colors duration-300`} />
                
                {/* Tags */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Tags</h3>
                  
                  {isEditing ? (
                    <div>
                      <div className="flex items-center space-x-2 mb-2 relative">
                        {/* Update the tag input and suggestions dropdown */}
                        <div className="relative flex-grow">
                          <input
                            ref={tagInputRef}
                            type="text"
                            placeholder="Add tags..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onFocus={handleTagInputFocus}
                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                          />
                          
                          {/* Tag Suggestions Dropdown */}
                          {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                            <div 
                              ref={tagSuggestionsRef}
                              className={`absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border rounded-md shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-300`}
                            >
                              <div className={`p-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-colors duration-300`}>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                                  Previously used tags
                                </p>
                              </div>
                              <ul>
                                {filteredTagSuggestions.map((tag) => (
                                  <li 
                                    key={tag} 
                                    className={`px-4 py-2 cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-300`}
                                    onClick={() => selectTag(tag)}
                                  >
                                    {tag}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={addTag}
                          className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md transition-colors duration-300`}
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Selected Tags */}
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className={`${themeClasses.tag} px-3 py-1 rounded-full flex items-center transition-colors duration-300`}
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} ml-2 transition-colors duration-300`}
                              >
                                <FaTimes size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>No tags added yet.</p>
                      )}
                      
                      {/* Quick-select Popular Tags */}
                      {previousTags.length > 0 && !showTagSuggestions && (
                        <div className="mt-3">
                          <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                            Quick-select from your tags:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {previousTags.slice(0, 8).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => selectTag(tag)}
                                className={`${themeClasses.tagSuggestion} px-2 py-1 text-sm rounded-md transition-colors duration-300`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Non-editing mode remains the same
                    <div>
                      {tags && tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className={`${themeClasses.tag} px-3 py-1 rounded-full transition-colors duration-300`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>No tags added yet.</p>
                      )}
                    </div>
                  )}
                </div>
                
                <hr className={`my-4 ${themeClasses.divider} transition-colors duration-300`} />
                
                {/* Notes */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  
                  {isEditing ? (
                    <textarea
                      placeholder="Add your notes about this repository..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                    />
                  ) : (
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-md transition-colors duration-300`}>
                      {notes ? (
                        <p className="whitespace-pre-wrap">{notes}</p>
                      ) : (
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>No notes added yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* README */}
            {readme && (
              <div className={`${themeClasses.card} p-6 rounded-lg mt-6`}>
                <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>README</h2>
                <div className="prose dark:prose-invert max-w-none readme-content">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  >
                    {readme.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {confirming && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className={`${themeClasses.modal} rounded-lg shadow-lg p-6 max-w-md w-full transition-colors duration-300`}>
                  <h3 className="text-xl font-semibold mb-4">Delete Repository</h3>
                  
                  <p className="mb-6">
                    Are you sure you want to delete <strong>{repository.repo_name}</strong> from your saved repositories? This action cannot be undone.
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setConfirming(false)}
                      className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md transition-colors duration-300`}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleDeleteRepository}
                      className={`${themeClasses.dangerButton} px-4 py-2 rounded-md transition-colors duration-300`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-full p-3 shadow-md transition-all duration-300 z-50`}
          aria-label="Scroll to top"
        >
          <FaArrowUp />
        </button>
      )}
    </div>
  );
};

export default RepositoryDetails;