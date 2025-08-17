import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt, FaEdit, FaTrash, FaCircle, FaTimes, FaSpinner, FaCheck, FaArrowLeft, FaSync } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import { getReadmeContent } from '../services/githubService';
import { updateRepository, deleteRepository, getUserTags, refreshRepositoryData } from '../services/repositoryService';
import { useTheme } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const getTagColor = (tag) => {
  // Generate a simple hash from the tag name
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Define a set of visually distinct, accessible colors (avoiding very light colors)
  const colors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
    'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100',
    'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100',
    'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
    'bg-pink-100 text-pink-800 dark:bg-pink-700 dark:text-pink-100',
    'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100'
  ];
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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
  
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  const { invalidateRepositories } = useCache();

  const tagInputRef = useRef(null);
  const tagSuggestionsRef = useRef(null);
  const [deleting, setDeleting] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch repository data
  useEffect(() => {
    const fetchRepository = async () => {
      try {
        setLoading(true);
        
        // Use backend API to fetch repository details
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/repositories/${id}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Repository not found, redirecting to dashboard');
            navigate('/', { replace: true });
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        setRepository(result.data);
      } catch (error) {
        console.error('Error fetching repository:', error);
        setError('Error loading repository details');
      } finally {
        setLoading(false);
      }
    };

    fetchRepository();
  }, [id, navigate]);  useEffect(() => {
    if (repository) {
      // Initialize notes from repository data
      setNotes(repository.notes || '');
      
      // Initialize tags from repository data - ensure it's an array
      setTags(repository.tags || []);
    }
  }, [repository]);

  useEffect(() => {
    const fetchReadme = async () => {
      if (repository) {
        console.log('Repository data for README fetch:', {
          repo_owner: repository.repo_owner,
          repo_name: repository.repo_name,
          full_repository: repository
        });
        
        if (!repository.repo_owner || !repository.repo_name) {
          console.error('Missing repo_owner or repo_name:', {
            repo_owner: repository.repo_owner,
            repo_name: repository.repo_name
          });
          return;
        }
        
        try {
          const readmeData = await getReadmeContent(repository.repo_owner, repository.repo_name);
          setReadme(readmeData);
        } catch (err) {
          console.error('Error fetching README:', err);
          // Don't set an error state here - just leave readme as null
          // which will show the "README not available" message
        }
      }
    };
    
    fetchReadme();
  }, [repository]);

  useEffect(() => {
    const updateRepositoryData = async () => {
      if (repository) {
        try {
          // Attempt to refresh repository data (will only refresh if stale)
          const updatedRepo = await refreshRepositoryData(id);
          
          // Update state with fresh data
          if (updatedRepo) {
            setRepository(updatedRepo);
            setNotes(updatedRepo.notes || '');
            setTags(updatedRepo.tags || []);
            setLastUpdated(new Date(updatedRepo.last_fetched || updatedRepo.updated_at));
          }
        } catch (err) {
          console.error('Error refreshing repository data:', err);
          // Don't show error to user for background refresh
        }
      }
    };
    
    updateRepositoryData();
  }, [repository, id]);

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
  
const handleDeleteRepository = async () => {
  try {
    console.log('Starting repository deletion for ID:', id);
    setDeleting(true);
    
    // Call deleteRepository with the correct parameters
    const result = await deleteRepository(id, invalidateRepositories);
    
    console.log('Delete repository result:', result);
    
    // Successfully deleted
    navigate('/', { 
      replace: true,
      state: { forceRefresh: true, timestamp: Date.now() }
    });
    
  } catch (error) {
    console.error('Error deleting repository:', error);
    setError('Failed to delete repository. Please try again.');
    setConfirming(false);
    setDeleting(false);
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

  const handleTagInputFocus = () => {
    setShowTagSuggestions(true);
  };

  const selectTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    
    // Update the previousTags to remove the selected tag
    setPreviousTags(previousTags.filter(t => t !== tag));
  };

  const filteredTagSuggestions = tagInput.trim() 
    ? previousTags.filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()))
    : previousTags;

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

  useEffect(() => {
    return () => {
      // This will run when component unmounts
      if (invalidateRepositories) {
        invalidateRepositories();
      }
    };
  }, [invalidateRepositories]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      const updatedRepo = await refreshRepositoryData(id, true);
      
      if (updatedRepo) {
        setRepository(updatedRepo);
        setLastUpdated(new Date(updatedRepo.last_fetched || updatedRepo.updated_at));
      }
    } catch (err) {
      console.error('Error refreshing repository data:', err);
      setError('Failed to refresh repository data');
    } finally {
      setIsRefreshing(false);
    }
  };
  
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
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
                    >
                      <FaTimes className="mr-2" />
                      <span>Cancel</span>
                    </button>
                    
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-300`}
                    >
                      {saving ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FaCheck className="mr-2" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
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
                              className={`px-3 py-1.5 rounded-full flex items-center transition-colors duration-300 ${getTagColor(tag)}`}
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-2 text-opacity-70 hover:text-opacity-100 transition-opacity duration-300"
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
                                className={`px-2 py-1 text-sm rounded-md transition-colors duration-300 ${getTagColor(tag)}`}
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
                              className={`px-3 py-1.5 rounded-full transition-colors duration-300 ${getTagColor(tag)}`}
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
                
                <hr className={`my-4 ${themeClasses.divider} transition-colors duration-300`} />
                
                {/* README */}
                {readme && (
                  <div className={`${themeClasses.card} p-6 rounded-lg mt-6`}>
                    <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>README</h2>
                    <div className="prose dark:prose-invert max-w-none readme-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          img: ({node, ...props}) => {
                            // Handle relative URLs for images
                            let src = props.src;
                            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                              // Convert relative image paths to absolute GitHub paths
                              const baseUrl = `https://raw.githubusercontent.com/${repository.repo_owner}/${repository.repo_name}/main`;
                              src = `${baseUrl}/${src.replace(/^\//, '')}`;
                            }
                            return <img src={src} alt={props.alt || ''} style={{maxWidth: '100%'}} />
                          }
                        }}
                      >
                        {readme.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add data freshness indicator */}
            <div className="mt-4 flex items-center justify-between">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                {lastUpdated ? (
                  <>Repository data updated {new Date(lastUpdated).toLocaleDateString()}</>
                ) : (
                  <>Repository data may not be current</>
                )}
              </p>
              
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`${themeClasses.secondaryButton} px-3 py-1 text-sm rounded-md flex items-center transition-colors duration-300`}
              >
                {isRefreshing ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <FaSync className="mr-2" />
                    <span>Refresh data</span>
                  </>
                )}
              </button>
            </div>
            
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
                      disabled={deleting}
                      className={`${themeClasses.dangerButton} px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-300`}
                    >
                      {deleting ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <FaTrash className="mr-2" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RepositoryDetails;