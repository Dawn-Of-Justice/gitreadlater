import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub, FaSearch, FaStar, FaTimes, FaSpinner, FaCheck, FaCircle, FaCrown, FaArrowRight, FaLock } from 'react-icons/fa';
import { searchRepositories, getUserStarredRepos, parseGitHubUrl, getRepositoryDetails, getUserRepositories } from '../services/githubService';
import { saveRepository, getUserTags } from '../services/repositoryService';
import { getUserRepositoryCount, getUserTier, initializeUserSubscription, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext';
import { supabase } from '../lib/supabaseClient'; 

const SaveRepository = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  // Form states
  const [url, setUrl] = useState(() => {
    return localStorage.getItem('saved_repo_url') || '';
  });
  const [repoPreview, setRepoPreview] = useState(() => {
    try {
      const savedPreview = localStorage.getItem('saved_repo_preview');
      return savedPreview ? JSON.parse(savedPreview) : null;
    } catch (err) {
      console.error('Error parsing saved repository preview', err);
      return null;
    }
  });
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStarredRepos, setShowStarredRepos] = useState(false);
  const [starredRepos, setStarredRepos] = useState([]);
  const [filteredStarredRepos, setFilteredStarredRepos] = useState([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  
  // Subscription states
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  const [canSave, setCanSave] = useState(true);
  
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  
  // Get cache from context
  const { invalidateRepositories } = useCache();
  
  // State for previously used tags
  const [previousTags, setPreviousTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  // New states for user repositories
  const [userRepositories, setUserRepositories] = useState([]);
  const [showUserRepos, setShowUserRepos] = useState(false);
  const [loadingUserRepos, setLoadingUserRepos] = useState(false);
  
  // Check subscription status on load
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // First check/initialize user subscription
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          try {
            await initializeUserSubscription(session.user.id);
          } catch (error) {
            console.error('Failed to initialize subscription:', error);
            // Continue anyway
          }
        }
        
        // Continue with tier and count check
        const tier = await getUserTier();
        const count = await getUserRepositoryCount();
        
        setUserTier(tier);
        setRepoCount(count);
        
        // Check if user has reached the limit
        if (tier === TIERS.FREE && count >= REPOSITORY_LIMITS[TIERS.FREE]) {
          setCanSave(false);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        // Set defaults to prevent blocking UI
        setUserTier(TIERS.FREE);
        setRepoCount(0);
        setCanSave(true);
      }
    };
    
    checkSubscription();
  }, []);

  // Load starred repositories on component mount
  useEffect(() => {
    loadStarredRepos();
  }, []);
  
  // Save URL to localStorage whenever it changes
  useEffect(() => {
    if (url) {
      localStorage.setItem('saved_repo_url', url);
    }
  }, [url]);

  // Save repository preview to localStorage if it exists
  useEffect(() => {
    if (repoPreview) {
      localStorage.setItem('saved_repo_preview', JSON.stringify(repoPreview));
    }
  }, [repoPreview]);

  // Load user's previously used tags on component mount
  useEffect(() => {
    fetchUserTags();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
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
      
      // Save repository and invalidate cache
      await saveRepository(url, notes, tags, invalidateRepositories);
      
      // Clear stored URL and preview after successful save
      localStorage.removeItem('saved_repo_url');
      localStorage.removeItem('saved_repo_preview');
      
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
      if (!url.trim()) {
        setRepoPreview(null);
        return;
      }
      
      try {
        // Parse GitHub URL
        const { owner, repo } = parseGitHubUrl(url);
        
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
  }, [url]);

  // Filter starred repos when user types
  useEffect(() => {
    if (!starredRepos.length) return;
    
    const query = url.toLowerCase();
    if (!query) {
      // Show all starred repos when input is empty
      setFilteredStarredRepos(starredRepos);
      if (document.activeElement === inputRef.current) {
        setShowStarredRepos(true);
      }
      return;
    }

    const filtered = starredRepos.filter(repo => 
      repo.name.toLowerCase().includes(query) || 
      repo.full_name.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );

    setFilteredStarredRepos(filtered);
    if (filtered.length > 0) {
      setShowStarredRepos(true);
    }
  }, [url, starredRepos]);
  
  // Load starred repositories
  const loadStarredRepos = async () => {
    try {
      setLoadingStarred(true);
      const starred = await getUserStarredRepos();
      setStarredRepos(starred);
      setFilteredStarredRepos(starred);
    } catch (err) {
      console.error('Error loading starred repositories:', err);
      setError('Failed to load starred repositories. Please try again.');
    } finally {
      setLoadingStarred(false);
    }
  };
  
  // Handle selecting a starred repository
  const selectStarredRepo = (repo) => {
    const repoUrl = repo.html_url;
    setUrl(repoUrl);
    localStorage.setItem('saved_repo_url', repoUrl);
    setShowStarredRepos(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (starredRepos.length > 0) {
      setFilteredStarredRepos(starredRepos);
      setShowStarredRepos(true);
    } else {
      // If starred repos aren't loaded yet, load them
      loadStarredRepos();
      setShowStarredRepos(true);
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
  
  // Fetch user's previous tags
  const fetchUserTags = async () => {
    try {
      const userTags = await getUserTags();
      setPreviousTags(userTags);
    } catch (err) {
      console.error('Error fetching user tags:', err);
    }
  };

  // Handle input focus for tag input field
  const handleTagInputFocus = () => {
    setShowTagSuggestions(true);
  };

  // Handle tag suggestion selection
  const selectTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Filter tag suggestions based on input
  const filteredTagSuggestions = tagInput.trim() 
    ? previousTags.filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag))
    : previousTags.filter(tag => !tags.includes(tag));

  const repoLimit = REPOSITORY_LIMITS[userTier];
  const isAtLimit = !canSave;
  
  // Load user repositories
  const loadUserRepositories = async () => {
    try {
      setLoadingUserRepos(true);
      const repos = await getUserRepositories();
      setUserRepositories(repos);
    } catch (error) {
      console.error('Error loading user repositories:', error);
      setError('Failed to load your repositories. Please try again.');
    } finally {
      setLoadingUserRepos(false);
    }
  };

  // Handle selecting a user repository
  const selectUserRepo = (repo) => {
    setUrl(repo.html_url);
    setRepoPreview({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count
    });
    setShowUserRepos(false);
  };

  const handleSaveRepository = async () => {
    setIsSaving(true);
    
    try {
      const result = await saveRepository(url, notes, selectedTags);
      
      if (result.success) {
        // Show success message
        toast.success('Repository saved successfully!');
        
        // Navigate back to dashboard with refresh flag
        navigate('/', { state: { forceRefresh: true } });
      } else {
        setError(result.error || 'Failed to save repository');
      }
    } catch (error) {
      console.error('Error saving repository:', error);
      setError(error.message || 'An error occurred while saving the repository');
    } finally {
      setIsSaving(false);
    }
  };

  // If user is at limit, show upgrade notice
  if (isAtLimit) {
    return (
      <div className={`${themeClasses.body} min-h-screen transition-colors duration-300`}>
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-8">Save Repository</h1>
          
          <div className={`${themeClasses.dangerBanner} border rounded-lg p-6 mb-8 transition-colors duration-300`}>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-red-200' : 'text-red-700'} mb-3`}>Repository Limit Reached</h2>
            
            <p className="mb-4">
              You've saved {repoCount} repositories, which is the maximum allowed on the free plan.
              To save more repositories, you'll need to upgrade to our Premium plan.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/subscription" 
                className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-300`}
              >
                <FaCrown className="mr-2" />
                <span>Upgrade to Premium</span>
                <FaArrowRight className="ml-2" />
              </Link>
              
              <Link 
                to="/" 
                className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md transition-colors duration-300`}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
          
          <div className={`${themeClasses.card} rounded-lg shadow-md p-6 transition-colors duration-300`}>
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
      </div>
    );
  }
  
  return (
    <div className={`${themeClasses.body} min-h-screen transition-colors duration-300`}>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Save Repository</h1>
        
        {/* Subscription status */}
        {userTier === TIERS.FREE && repoCount >= repoLimit * 0.8 && (
          <div className={`mb-6 p-4 rounded-md ${themeClasses.warningBanner} transition-colors duration-300`}>
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
                className="btn mt-3 md:mt-0 bg-yellow-600 hover:bg-yellow-700 text-white flex items-center justify-center px-4 py-2 rounded-md transition-colors duration-300"
              >
                <FaCrown className="mr-1" />
                <span>Upgrade to Premium</span>
              </Link>
            </div>
          </div>
        )}
        
        <div className={`${themeClasses.card} rounded-lg shadow-md p-6 transition-colors duration-300`}>
          <form onSubmit={handleSubmit}>
            {/* Repository URL */}
            <div className="mb-6">
              <label htmlFor="repoUrl" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2 transition-colors duration-300`}>
                GitHub Repository URL
              </label>
              
              <div className="flex items-center space-x-2">
                <div className="flex-grow relative">
                  <FaGithub className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    id="repoUrl"
                    ref={inputRef}
                    placeholder="https://github.com/owner/repo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={handleInputFocus}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('');
                        localStorage.removeItem('saved_repo_url');
                      }}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    loadStarredRepos();
                    setShowStarredRepos(!showStarredRepos);
                  }}
                  disabled={loadingStarred}
                  className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md flex items-center space-x-1 transition-colors duration-300`}
                >
                  {loadingStarred ? (
                    <FaSpinner className="animate-spin mr-1" />
                  ) : (
                    <FaStar className="text-yellow-500 mr-1" />
                  )}
                  <span>Starred</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loadUserRepositories();
                    setShowUserRepos(!showUserRepos);
                  }}
                  disabled={loadingUserRepos}
                  className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md flex items-center space-x-1 transition-colors duration-300`}
                >
                  {loadingUserRepos ? (
                    <FaSpinner className="animate-spin mr-1" />
                  ) : (
                    <FaGithub className="mr-1" />
                  )}
                  <span>My Repositories</span>
                </button>
              </div>
            </div>
            
            {/* Repository Preview */}
            {repoPreview && (
              <div className={`mb-6 p-4 border rounded-md ${themeClasses.previewCard} transition-colors duration-300`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{repoPreview.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>{repoPreview.full_name}</p>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-sm">
                    <FaStar className="text-yellow-500" />
                    <span>{repoPreview.stargazers_count}</span>
                  </div>
                </div>
                
                {repoPreview.description && (
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mt-2 transition-colors duration-300`}>{repoPreview.description}</p>
                )}
                
                {repoPreview.language && (
                  <div className="mt-2 flex items-center space-x-1 text-sm">
                    <FaCircle className="text-blue-500" style={{ fontSize: '10px' }} />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{repoPreview.language}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Starred Repositories List */}
            {showStarredRepos && (
              <div className={`mb-6 max-h-64 overflow-y-auto border rounded-md ${themeClasses.starredList} transition-colors duration-300`}>
                <div className={`p-3 ${themeClasses.starredHeader} flex justify-between items-center transition-colors duration-300`}>
                  <h3 className="font-medium">
                    {loadingStarred ? "Loading starred repositories..." : 
                     (url ? `Repositories matching "${url}"` : "Your Starred Repositories")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowStarredRepos(false)}
                    className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-300`}
                  >
                    <FaTimes />
                  </button>
                </div>
                
                {loadingStarred ? (
                  <div className="flex justify-center items-center p-4">
                    <FaSpinner className="animate-spin text-blue-500 mr-2" />
                    <span>Loading...</span>
                  </div>
                ) : filteredStarredRepos.length === 0 ? (
                  <p className={`p-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                    {url ? "No matching repositories found." : "No starred repositories found."}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filteredStarredRepos.map((repo) => (
                      <li 
                        key={repo.id} 
                        className={`p-3 ${themeClasses.starredItem} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300`} 
                        onClick={() => selectStarredRepo(repo)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{repo.name}</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>{repo.full_name}</p>
                            {repo.description && (
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 line-clamp-1 transition-colors duration-300`}>{repo.description}</p>
                            )}
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

            {/* User Repositories List */}
            {showUserRepos && (
              <div className={`mt-4 p-4 rounded-md border ${themeClasses.card}`}>
                <h3 className="font-medium mb-2">Your Repositories</h3>
                {userRepositories.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    {userRepositories.map(repo => (
                      <div 
                        key={repo.id} 
                        onClick={() => selectUserRepo(repo)}
                        className={`flex items-center p-2 cursor-pointer rounded-md ${themeClasses.starredItem}`}
                      >
                        <div className="flex-grow">
                          <p className="font-medium">{repo.full_name}</p>
                          <p className="text-sm text-gray-500 truncate">{repo.description || 'No description'}</p>
                          <div className="flex items-center mt-1 space-x-3 text-xs">
                            {repo.private && (
                              <span className="flex items-center">
                                <FaLock className="mr-1" />
                                Private
                              </span>
                            )}
                            {repo.language && (
                              <span className="flex items-center">
                                <FaCircle className="mr-1" style={{ color: 'blue', fontSize: '8px' }} />
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center">
                              <FaStar className="mr-1 text-yellow-500" />
                              {repo.stargazers_count}
                            </span>
                          </div>
                        </div>
                        <FaArrowRight className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No repositories found.</p>
                )}
              </div>
            )}
            
            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2 transition-colors duration-300`}>
                Tags
              </label>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    id="tags"
                    placeholder="Add tags..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onFocus={handleTagInputFocus}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                  />
                  
                  {/* Tag Suggestions Dropdown */}
                  {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                    <div className={`absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border rounded-md shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-300`}>
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
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`${themeClasses.tag} px-3 py-1 rounded-full flex items-center space-x-1 transition-colors duration-300`}
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} ml-1 transition-colors duration-300`}
                      >
                        <FaTimes size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Quick-select Popular Tags */}
              {previousTags.length > 0 && !showTagSuggestions && (
                <div className="mt-3">
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                    Quick-select from your tags:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {previousTags.slice(0, 8).map((tag) => (
                      !tags.includes(tag) && (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => selectTag(tag)}
                          className={`${themeClasses.tagSuggestion} px-2 py-1 text-sm rounded-md transition-colors duration-300`}
                        >
                          {tag}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="notes" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2 transition-colors duration-300`}>
                Notes (Optional)
              </label>
              
              <textarea
                id="notes"
                placeholder="Add your notes about this repository..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
              />
            </div>
            
            {/* Error message */}
            {error && (
              <div className={`mb-6 p-3 ${themeClasses.dangerBanner} border rounded-md transition-colors duration-300`}>
                {error}
              </div>
            )}
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-300 ${(!url.trim() && !loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading && <FaSpinner className="animate-spin mr-2" />}
                <span>Save Repository</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SaveRepository;