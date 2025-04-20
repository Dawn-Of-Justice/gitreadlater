import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaStar, FaExternalLinkAlt, FaEdit, FaTrash, FaCircle, FaTimes, FaSpinner, FaCheck } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import { getReadmeContent } from '../services/githubService';
import { updateRepository, deleteRepository } from '../services/repositoryService';

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
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  // Fetch repository data
  useEffect(() => {
    const fetchRepository = async () => {
      try {
        setLoading(true);
        
        // Get repository from Supabase
        const { data, error } = await supabase
          .from('saved_repositories')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          throw new Error('Repository not found');
        }
        
        setRepository(data);
        setNotes(data.notes || '');
        setTags(data.tags || []);
        
        // Get README content
        const readmeData = await getReadmeContent(data.repo_owner, data.repo_name);
        setReadme(readmeData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching repository details:', err);
        setError(err.message || 'Failed to load repository details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRepository();
  }, [id]);
  
  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      await updateRepository(id, {
        notes,
        tags,
      });
      
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
  
  // Handle delete repository
  const handleDeleteRepository = async () => {
    try {
      await deleteRepository(id);
      navigate('/');
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
  
  return (
    <div className="max-w-4xl mx-auto">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-github-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p>{error}</p>
          <Link to="/" className="text-github-blue hover:underline mt-2 inline-block">
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
                    className="btn btn-secondary flex items-center space-x-1"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => setConfirming(true)}
                    className="btn flex items-center space-x-1 bg-red-500 text-white hover:bg-red-600"
                  >
                    <FaTrash />
                    <span>Delete</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="btn btn-primary flex items-center space-x-1"
                  >
                    {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                    <span>Save</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNotes(repository.notes || '');
                      setTags(repository.tags || []);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Repository Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-2">
                    {repository.repo_owner}/{repository.repo_name}
                  </p>
                  
                  {repository.description && (
                    <p className="text-gray-700 mb-3">
                      {repository.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {repository.language && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <FaCircle className="text-github-blue" style={{ fontSize: '10px' }} />
                        <span>{repository.language}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <FaStar className="text-yellow-500" />
                      <span>{repository.stars || 0}</span>
                    </div>
                    
                    <a 
                      href={repository.repo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-github-blue hover:underline flex items-center space-x-1 text-sm"
                    >
                      <span>View on GitHub</span>
                      <FaExternalLinkAlt className="text-xs" />
                    </a>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0">
                  <p className="text-sm text-gray-500">
                    Saved on {new Date(repository.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <hr className="my-4" />
              
              {/* Tags */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                
                {isEditing ? (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add tags..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent"
                      />
                      
                      <button
                        type="button"
                        onClick={addTag}
                        className="btn btn-secondary"
                      >
                        Add
                      </button>
                    </div>
                    
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full flex items-center space-x-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No tags added yet.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    {tags && tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No tags added yet.</p>
                    )}
                  </div>
                )}
              </div>
              
              <hr className="my-4" />
              
              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Notes</h3>
                
                {isEditing ? (
                  <textarea
                    placeholder="Add your notes about this repository..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent"
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md">
                    {notes ? (
                      <p className="whitespace-pre-wrap">{notes}</p>
                    ) : (
                      <p className="text-gray-500">No notes added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* README */}
          {readme && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold">README</h2>
              </div>
              
              <div className="p-6 markdown-content whitespace-pre-wrap">
                {readme.content}
              </div>
            </div>
          )}
          
          {/* Delete Confirmation Modal */}
          {confirming && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Delete Repository</h3>
                
                <p className="mb-6">
                  Are you sure you want to delete <strong>{repository.repo_name}</strong> from your saved repositories? This action cannot be undone.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleDeleteRepository}
                    className="btn bg-red-500 text-white hover:bg-red-600"
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
  );
};

export default RepositoryDetails;