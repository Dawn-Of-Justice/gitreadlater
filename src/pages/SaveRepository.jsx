import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub, FaSearch, FaStar, FaTimes, FaSpinner, FaCheck, FaCircle, FaCrown, FaArrowRight, FaLock } from 'react-icons/fa';
import { searchRepositories, getUserStarredRepos, parseGitHubUrl, getRepositoryDetails, getUserRepositories } from '../services/githubService';
import { saveRepository, getUserTags } from '../services/repositoryService';
import { getUserRepositoryCount, getUserTier, initializeUserSubscription, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext';
import { supabase } from '../lib/supabaseClient';

const getTagColor = (tag) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Define a set of visually distinct, accessible colors
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

const SaveRepository = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
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
  
  // Combined repository states
  const [repositories, setRepositories] = useState([]);
  const [filteredRepositories, setFilteredRepositories] = useState([]);
  const [showRepositories, setShowRepositories] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  
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
  
  // Add these states for filtering repositories
  const [showOwnedRepos, setShowOwnedRepos] = useState(true);
  const [showStarredRepos, setShowStarredRepos] = useState(true);
  
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

  // Load user's repositories and starred repos on component mount
  useEffect(() => {
    loadAllRepositories();
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

  // Update the filtering effect with better debugging
  useEffect(() => {
    // Skip if there are no repositories to filter
    if (!repositories || repositories.length === 0) {
      console.log('No repositories to filter');
      return;
    }
    
    const filterRepositories = () => {
      const query = url.toLowerCase().trim();
      console.log(`Filtering ${repositories.length} repositories with query: "${query}"`);
      console.log(`Filter settings: showOwned=${showOwnedRepos}, showStarred=${showStarredRepos}`);
      
      // Apply repo type filters first (owned/starred)
      let filtered = repositories.filter(repo => {
        if (showOwnedRepos && showStarredRepos) return true;
        if (showOwnedRepos && repo.isOwned) return true;
        if (showStarredRepos && repo.isStarred) return true;
        return false;
      });
      
      // Then apply search query if present
      if (query) {
        filtered = filtered.filter(repo => 
          (repo.name && repo.name.toLowerCase().includes(query)) || 
          (repo.full_name && repo.full_name.toLowerCase().includes(query)) ||
          (repo.description && repo.description.toLowerCase().includes(query))
        );
        console.log(`Found ${filtered.length} repositories matching "${query}"`);
      } else {
        console.log(`Showing ${filtered.length} repositories based on filters`);
      }

      setFilteredRepositories(filtered);
    };
    
    // Use setTimeout to ensure DOM is ready in Firefox
    setTimeout(filterRepositories, 0);
    
  }, [url, repositories, showOwnedRepos, showStarredRepos]);

  // Add click outside handler using useRef and useEffect
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowRepositories(false);
      }
    }

    // Add event listener when dropdown is shown
    if (showRepositories) {
      // Use capture phase for Firefox compatibility
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [showRepositories]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    
    // Add URL format validation
    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubUrlPattern.test(url.trim())) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }
    
    // Notes validation
    if (notes && notes.length > 1000) {
      setError('Notes must be less than 1000 characters');
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

  // Load all repositories (both starred and user's own)
  const loadAllRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      // First, check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No authenticated user found');
        throw new Error('User not authenticated');
      }

      // Load starred repositories first
      let starredRepos = [];
      try {
        starredRepos = await getUserStarredRepos();
        console.log('Starred repos loaded:', starredRepos?.length || 0);
      } catch (starredError) {
        console.error('Error loading starred repos:', starredError.message);
      }
      
      // Mark these as starred
      const markedStarred = starredRepos?.map(repo => ({
        ...repo,
        isStarred: true
      })) || [];
      
      // Load user repositories
      let userRepos = [];
      try {
        userRepos = await getUserRepositories();
        console.log('User repos loaded:', userRepos?.length || 0);
      } catch (userReposError) {
        console.error('Error loading user repos:', userReposError.message);
      }
      
      // Mark these as user's own
      const markedUserRepos = userRepos?.map(repo => ({
        ...repo,
        isOwned: true
      })) || [];
      
      // Combine both types, removing duplicates by ID
      const allRepos = [...markedStarred];
      
      // Add user repos that aren't already in the list
      markedUserRepos.forEach(userRepo => {
        if (!allRepos.find(repo => repo.id === userRepo.id)) {
          allRepos.push(userRepo);
        }
      });
      
      console.log('Total combined repos:', allRepos.length);
      
      setRepositories(allRepos);
      setFilteredRepositories(allRepos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setRepositories([]);
      setFilteredRepositories([]);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Fix loadUserRepositories function
  const loadUserRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const repos = await getUserRepositories();
      console.log('User repos loaded:', repos?.length || 0);
      
      // Mark these as user's own
      const markedUserRepos = repos?.map(repo => ({
        ...repo,
        isOwned: true
      })) || [];
      
      setRepositories(prevRepos => {
        // Combine with existing repos, avoiding duplicates
        const existingIds = prevRepos.map(r => r.id);
        const newRepos = markedUserRepos.filter(r => !existingIds.includes(r.id));
        return [...prevRepos, ...newRepos];
      });
    } catch (error) {
      console.error('Error loading user repositories:', error);
      setError('Failed to load your repositories. Please try again.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Fix loadStarredRepos function
  const loadStarredRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const starred = await getUserStarredRepos();
      console.log('Starred repos loaded:', starred?.length || 0);
      
      // Mark these as starred
      const markedStarred = starred?.map(repo => ({
        ...repo,
        isStarred: true
      })) || [];
      
      setRepositories(prevRepos => {
        // Combine with existing repos, avoiding duplicates
        const existingIds = prevRepos.map(r => r.id);
        const newRepos = markedStarred.filter(r => !existingIds.includes(r.id));
        return [...prevRepos, ...newRepos];
      });
    } catch (err) {
      console.error('Error loading starred repositories:', err);
      setError('Failed to load starred repositories. Please try again.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Enhance handleInputFocus to ensure repositories are visible
  const handleInputFocus = () => {
    // Always show repositories when focusing the input
    setShowRepositories(true);
    
    // Try to load repositories if we don't have them yet
    if (repositories.length === 0 && !isLoadingRepos) {
      console.log('No repositories loaded, loading now...');
      loadAllRepositories();
    } else {
      console.log('Repositories already loaded:', repositories.length);
    }
  };
  
  // Handle repository selection
  const selectRepository = (repo) => {
    setUrl(repo.html_url);
    setRepoPreview({
      name: repo.name,
      owner: repo.owner.login,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count
    });
    setShowRepositories(false);
  };
  
  // Add a tag
  const addTag = () => {
    const trimmedTag = tagInput.trim();
    
    if (!trimmedTag) return;
    
    // Limit to maximum 5 tags
    if (tags.length >= 5) {
      setError('Maximum 5 tags allowed per repository');
      return;
    }
    
    // Limit tag length to 30 characters
    const limitedTag = trimmedTag.substring(0, 30);
    
    // Prevent duplicates
    if (tags.includes(limitedTag)) {
      setTagInput('');
      return;
    }
    
    setTags([...tags, limitedTag]);
    setTagInput('');
    setError(null); // Clear any previous error about tags limit
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

  const handleKeyDown = (e) => {
    if (!showRepositories) return;
    
    if (e.key === 'Escape') {
      setShowRepositories(false);
    } else if (e.key === 'ArrowDown') {
      // Implement arrow down navigation if needed
      e.preventDefault();
      // Future enhancement: select first repo in list
    }
  };

  const handleInputChange = (e) => {
    const searchValue = e.target.value;
    setUrl(searchValue);
    
    // Show repositories dropdown when typing
    if (!showRepositories) {
      setShowRepositories(true);
    }
    
    // Ensure repositories are loaded - use setTimeout to avoid Firefox timing issues
    if (repositories.length === 0 && !isLoadingRepos) {
      setTimeout(() => {
        loadAllRepositories();
      }, 0);
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
              
              <div className="relative">
                <FaGithub className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  id="repoUrl"
                  ref={inputRef}
                  placeholder="https://github.com/owner/repo"
                  value={url}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onKeyDown={handleKeyDown}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
                
                {showRepositories && (
                  <div ref={dropdownRef} className={`absolute z-10 mt-1 w-full max-h-80 overflow-y-auto border rounded-md shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-300`}>
                    <div className={`p-3 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} flex justify-between items-center transition-colors duration-300`}>
                      <h3 className="font-medium">
                        {isLoadingRepos ? "Loading repositories..." : 
                         (url && filteredRepositories.length > 0 && filteredRepositories[0].searchResult ? 
                          `Search results for "${url}"` : 
                          "Your Repositories")}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowRepositories(false)}
                        className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-300`}
                      >
                        <FaTimes />
                      </button>
                    </div>
                    
                    {/* Add repository filters */}
                    <div className={`flex px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex space-x-2 text-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowOwnedRepos(!showOwnedRepos);
                          }}
                          className={`px-2 py-1 rounded ${showOwnedRepos 
                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') 
                            : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                          } flex items-center`}
                        >
                          <FaGithub className={`mr-1 ${showOwnedRepos ? '' : 'opacity-50'}`} />
                          My Repos
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowStarredRepos(!showStarredRepos);
                          }}
                          className={`px-2 py-1 rounded ${showStarredRepos 
                            ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') 
                            : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                          } flex items-center`}
                        >
                          <FaStar className={`mr-1 text-yellow-500 ${showStarredRepos ? '' : 'opacity-50'}`} />
                          Starred
                        </button>
                      </div>
                    </div>
                    
                    {isLoadingRepos ? (
                      <div className="flex justify-center items-center p-4">
                        <FaSpinner className="animate-spin text-blue-500 mr-2" />
                        <span>Loading...</span>
                      </div>
                    ) : filteredRepositories.length === 0 ? (
                      <div className="p-4">
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-300 mb-2`}>
                          {url ? "No matching repositories found." : "No repositories found."}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-3`}>
                          {url ? 
                            "Try a different search term or enter a GitHub URL directly." : 
                            "We couldn't find any of your GitHub repositories."}
                        </p>
                        
                        {url && (
                          <button
                            onClick={async () => {
                              setIsLoadingRepos(true);
                              setError(null);
                              try {
                                console.log('Searching GitHub for:', url);
                                const searchResults = await searchRepositories(url);
                                console.log('Search returned:', searchResults?.length || 0, 'results');
                                
                                if (!searchResults || searchResults.length === 0) {
                                  setError('No repositories found matching your search.');
                                  return;
                                }
                                
                                const markedResults = searchResults.map(repo => ({
                                  ...repo,
                                  searchResult: true
                                }));
                                
                                // Set both repositories and filtered repositories
                                setRepositories(markedResults);
                                setFilteredRepositories(markedResults);
                                
                              } catch (error) {
                                console.error('Search failed:', error);
                                setError('Failed to search GitHub repositories. Please try again.');
                              } finally {
                                setIsLoadingRepos(false);
                              }
                            }}
                            className={`${themeClasses.secondaryButton} w-full py-2 px-4 flex items-center justify-center`}
                          >
                            <FaSearch className="mr-2" />
                            <span>Search GitHub for "{url}"</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRepositories.map((repo) => (
                          <div 
                            key={repo.id} 
                            className={`p-3 cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-300`} 
                            onClick={() => selectRepository(repo)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{repo.name}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>{repo.full_name}</p>
                                {repo.description && (
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 line-clamp-1 transition-colors duration-300`}>{repo.description}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-3 text-sm">
                                {repo.searchResult && (
                                  <span className="flex items-center">
                                    <FaSearch className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mr-1`} />
                                  </span>
                                )}
                                {repo.isStarred && (
                                  <span className="flex items-center">
                                    <FaStar className="text-yellow-500 mr-1" />
                                  </span>
                                )}
                                {repo.isOwned && !repo.isStarred && (
                                  <span className="flex items-center">
                                    <FaGithub className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mr-1`} />
                                  </span>
                                )}
                                {repo.private && (
                                  <span className="flex items-center ml-2">
                                    <FaLock className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mr-1`} title="Private repository" />
                                    <span className="text-xs">Private</span>
                                  </span>
                                )}
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{repo.stargazers_count || 0}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
            
            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2 transition-colors duration-300`}>
                Tags <span className={`text-sm ${tags.length >= 5 ? 'text-red-500' : 'text-gray-500'}`}>({tags.length}/5)</span>
              </label>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    id="tags"
                    placeholder="Add tags... (max 30 characters)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onFocus={handleTagInputFocus}
                    maxLength={30}
                    disabled={tags.length >= 5}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300 ${tagInput.length >= 30 ? 'border-yellow-500' : ''} ${tags.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  
                  {tagInput.length > 0 && (
                    <div className={`absolute right-3 top-3 text-xs ${tagInput.length >= 30 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {tagInput.length}/30
                    </div>
                  )}
                  
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
                  disabled={tags.length >= 5}
                  className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md transition-colors duration-300 ${tags.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          className={`px-2 py-1 text-sm rounded-md transition-colors duration-300 ${getTagColor(tag)}`}
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
                Notes (Optional) <span className={`text-sm text-gray-500`}>({notes.length}/1000)</span>
              </label>
              
              <div className="relative">
                <textarea
                  id="notes"
                  placeholder="Add your notes about this repository..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.substring(0, 1000))}
                  rows={4}
                  maxLength={1000}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300 ${notes.length >= 1000 ? 'border-yellow-500' : ''}`}
                />
                
                {notes.length > 0 && (
                  <div className={`absolute right-3 bottom-3 text-xs ${notes.length >= 1000 ? 'text-yellow-500' : 'text-gray-400'}`}>
                    {notes.length}/1000
                  </div>
                )}
              </div>
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