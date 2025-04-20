import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGithub, FaStar, FaSpinner, FaCircle, FaTimes, FaCrown, FaArrowRight } from 'react-icons/fa';
import { parseGitHubUrl, getRepositoryDetails, getStarredRepositories } from '../services/githubService';
import { saveRepository } from '../services/repositoryService';
import { getUserTier, REPOSITORY_LIMITS, TIERS, getUserRepositoryCount, canSaveRepository } from '../services/subscriptionService';

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
  
  // Subscription states
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  const [canSave, setCanSave] = useState(true);
  
  // Check subscription status on load
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const tier = await getUserTier();
        const count = await getUserRepositoryCount();
        const saveAbility = await canSaveRepository();
        
        setUserTier(tier);
        setRepoCount(count);
        setCanSave(saveAbility);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };
    
    checkSubscription();
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    
    // Check if user can save more repositories
    if (!canSave) {
      setError(`You've reached the limit of ${REPOSITORY_LIMITS[TIERS.FREE]} repositories on your free plan. Please upgrade to save more.`);
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
      if (err.message.includes('Repository limit reached')) {
        setError(`You've reached the limit of ${REPOSITORY_LIMITS[TIERS.FREE]} repositories on your free plan. Please upgrade to save more.`);
      } else {
        setError(err.message || 'Failed to save repository. Please try again.');
      }
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
  
  const repoLimit = REPOSITORY_LIMITS[userTier];
  const isAtLimit = !canSave;
  
  // If user is at limit, show upgrade notice
  if (isAtLimit) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Save Repository</h1>
        
        <div className="bg-red-50 border border-red-100 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-700 mb-3">Repository Limit Reached</h2>
          
          <p className="mb-4">
            You've saved {repoCount} repositories, which is the maximum allowed on the free plan.
            To save more repositories, you'll need to upgrade to our Premium plan.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/subscription" 
              className="btn bg-github-blue hover:bg-blue-700 text-white flex items-center justify-center"
            >
              <FaCrown className="mr-2" />
              <span>Upgrade to Premium</span>
              <FaArrowRight className="ml-2" />
            </Link>
            
            <Link 
              to="/" 
              className="btn btn-secondary"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Premium Plan Benefits</h3>
          
          <ul className="space-y-2">
            <li className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Unlimited saved repositories</span>
            </li>
            <li className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Advanced search with filters</span>
            </li>
            <li className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Rich tagging system with nested tags</span>
            </li>
            <li className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Automatic categorization suggestions</span>
            </li>
            <li className="flex items-start">
              <FaCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Export to third-party services</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Save Repository</h1>
      
      {/* Subscription status */}
      {userTier === TIERS.FREE && repoCount >= repoLimit * 0.8 && (
        <div className="mb-6 p-4 rounded-md bg-yellow-50 text-yellow-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">
                You've saved {repoCount} of {repoLimit} repositories ({Math.round((repoCount/repoLimit)*100)}%).
              </p>
              <p className="mt-1">
                You're approaching your free plan limit. Consider upgrading soon.
              </p>
            </div>
            
            <Link 
              to="/subscription" 
              className="btn mt-3 md:mt-0 bg-yellow-600 hover:bg-yellow-700 text-white flex items-center justify-center"
            >
              <FaCrown className="mr-1" />
              <span>Upgrade to Premium</span>
            </Link>
          </div>
        </div>
      )}
      
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