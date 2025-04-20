import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaStar, FaSpinner, FaCircle, FaTimes } from 'react-icons/fa';
import { parseGitHubUrl, getRepositoryDetails, getStarredRepositories } from '../services/githubService';
import { saveRepository } from '../services/repositoryService';

const SaveRepository = () => {
  const navigate = useNavigate();
  
  // Form states
  const [repoUrl, setRepoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repoPreview, setRepoPreview] = useState(null);
  const [showStarredRepos, setShowStarredRepos] = useState(false);
  const [starredRepos, setStarredRepos] = useState([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Save repository
      await saveRepository(repoUrl, notes, tags);
      
      // Navigate to dashboard on success
      navigate('/');
    } catch (err) {
      console.error('Error saving repository:', err);
      setError(err.message || 'Failed to save repository. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Preview repository when URL changes
  useEffect(() => {
    const fetchRepoPreview = async () => {
      if (!repoUrl.trim()) {
        setRepoPreview(null);
        return;
      }
      
      try {
        // Parse GitHub URL
        const { owner, repo } = parseGitHubUrl(repoUrl);
        
        // Get repository details
        const repoDetails = await getRepositoryDetails(owner, repo);
        setRepoPreview(repoDetails);
        setError(null);
      } catch (err) {
        console.error('Error fetching repository preview:', err);
        setRepoPreview(null);
        // Don't show error while typing
      }
    };
    
    // Debounce the preview fetch
    const timeoutId = setTimeout(fetchRepoPreview, 500);
    
    return () => clearTimeout(timeoutId);
  }, [repoUrl]);
  
  // Load starred repositories
  const loadStarredRepos = async () => {
    try {
      setLoadingStarred(true);
      const starred = await getStarredRepositories();
      setStarredRepos(starred);
      setShowStarredRepos(true);
    } catch (err) {
      console.error('Error loading starred repositories:', err);
      setError('Failed to load starred repositories. Please try again.');
    } finally {
      setLoadingStarred(false);
    }
  };
  
  // Handle selecting a starred repository
  const selectStarredRepo = (repo) => {
    setRepoUrl(repo.html_url);
    setShowStarredRepos(false);
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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Save Repository</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          {/* Repository URL */}
          <div className="mb-6">
            <label htmlFor="repoUrl" className="block text-gray-700 font-medium mb-2">
              GitHub Repository URL
            </label>
            
            <div className="flex items-center space-x-2">
              <div className="flex-grow relative">
                <FaGithub className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  id="repoUrl"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent"
                />
              </div>
              
              <button
                type="button"
                onClick={loadStarredRepos}
                disabled={loadingStarred}
                className="btn btn-secondary flex items-center space-x-1"
              >
                {loadingStarred ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaStar className="text-yellow-500" />
                )}
                <span>Starred</span>
              </button>
            </div>
          </div>
          
          {/* Repository Preview */}
          {repoPreview && (
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{repoPreview.name}</h3>
                  <p className="text-sm text-gray-600">{repoPreview.full_name}</p>
                </div>
                
                <div className="flex items-center space-x-1 text-sm">
                  <FaStar className="text-yellow-500" />
                  <span>{repoPreview.stargazers_count}</span>
                </div>
              </div>
              
              {repoPreview.description && (
                <p className="text-gray-700 mt-2">{repoPreview.description}</p>
              )}
              
              {repoPreview.language && (
                <div className="mt-2 flex items-center space-x-1 text-sm text-gray-600">
                  <FaCircle className="text-github-blue" style={{ fontSize: '10px' }} />
                  <span>{repoPreview.language}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Starred Repositories List */}
          {showStarredRepos && (
            <div className="mb-6 max-h-64 overflow-y-auto border border-gray-200 rounded-md">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium">Your Starred Repositories</h3>
                <button
                  type="button"
                  onClick={() => setShowStarredRepos(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              {starredRepos.length === 0 ? (
                <p className="p-4 text-gray-500">No starred repositories found.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {starredRepos.map((repo) => (
                    <li key={repo.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => selectStarredRepo(repo)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{repo.name}</p>
                          <p className="text-sm text-gray-600">{repo.full_name}</p>
                        </div>
                        
                        <div className="flex items-center space-x-1 text-sm">
                          <FaStar className="text-yellow-500" />
                          <span>{repo.stargazers_count}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Tags */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-gray-700 font-medium mb-2">
              Tags
            </label>
            
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                id="tags"
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
            
            {tags.length > 0 && (
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
            )}
          </div>
          
          {/* Notes */}
          <div className="mb-6">
            <label htmlFor="notes" className="block text-gray-700 font-medium mb-2">
              Notes (Optional)
            </label>
            
            <textarea
              id="notes"
              placeholder="Add your notes about this repository..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent"
            />
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
              {error}
            </div>
          )}
          
          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading && <FaSpinner className="animate-spin" />}
              <span>Save Repository</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveRepository;