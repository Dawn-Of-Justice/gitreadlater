import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaStar, FaSearch, FaTags, FaExternalLinkAlt, FaCircle, FaCrown, FaArrowRight, FaBookmark, FaTrash, FaPlus } from 'react-icons/fa';
import { getSavedRepositories, getUserTags, checkRepositoriesTableExists, deleteRepository } from '../services/repositoryService';
import { getUserTier, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext'; 
import { supabase } from '../lib/supabaseClient';
import PrivateRepoToggle from '../components/PrivateRepoToggle';

const getTagColor = (tag) => {
  // Generate a simple hash from the tag name
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { darkMode, themeClasses } = useTheme();
  const { userSubscription, repoCount, loading: subscriptionLoading, setLoading: setSubscriptionLoading } = useSubscription();
  
  // State - MOVE loadingTimeoutExceeded here to fix Firefox reference error
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loadingTimeoutExceeded, setLoadingTimeoutExceeded] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [tableExists, setTableExists] = useState(null); // null means we haven't checked yet
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const searchInputRef = useRef(null); // Add this ref for the search input
  
  // Refs for tracking fetch status
  const fetchAttemptedRef = useRef(false);
  const userCheckedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  // Cache
  const { 
    repositories: cachedRepositories, 
    setRepositories: setCachedRepositories,
    tags: cachedTags,
    setTags: setCachedTags,
    invalidateRepositories
  } = useCache();

  // Set up user tier from subscription
  const userTier = userSubscription?.tier || TIERS.FREE;

  // Main effect for initial loading - runs once on component mount
  useEffect(() => {
    // Skip if we've already fetched and no force refresh is requested
    if (fetchAttemptedRef.current && !location.state?.forceRefresh && !refreshFlag) return;
    
    const checkUserAndFetch = async () => {
      try {
        // Reset force refresh flag if it was set
        if (location.state?.forceRefresh) {
          const newState = { ...location.state };
          delete newState.forceRefresh;
          navigate(location.pathname, { state: newState, replace: true });
        }
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          setLoading(false);
          navigate('/login');
          return;
        }
        
        // Replace the cache check section with this improved version
        // Check cache first - if we have cached repositories, use them initially
        if (cachedRepositories && cachedRepositories.length > 0 && !refreshFlag && !location.state?.forceRefresh) {
          console.log("Using cached repositories:", cachedRepositories.length);
          setRepositories(cachedRepositories);
          
          if (cachedTags && cachedTags.length > 0) {
            setTags(cachedTags);
          }
          
          // Set loading states to false immediately when using cache
          setLoading(false);
          if (setSubscriptionLoading) setSubscriptionLoading(false);
          
          // Use the component level ref instead of creating a new one
          if (!isRefreshingRef.current) {
            isRefreshingRef.current = true;
            
            // Add a longer delay to prevent rapid refreshes
            setTimeout(() => {
              fetchLatestRepositories(session.user.id, true); // Pass true for background refresh
              isRefreshingRef.current = false;
            }, 2000);
          }
          
          return; // IMPORTANT: Return early to skip the main fetch
        }
        
        // If we get here, we need to fetch from database
        await fetchLatestRepositories(session.user.id);
      } catch (err) {
        console.error("Error in checkUserAndFetch:", err);
        setError('Failed to load repositories. Please try again.');
      } finally {
        fetchAttemptedRef.current = true;
        setLoading(false);
      }
    };
    
    // Helper function to fetch latest repositories and update cache
    const fetchLatestRepositories = async (userId, isBackgroundRefresh = false) => {
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      
      try {
        // Use either Firefox or standard fetch path
        if (isFirefox) {
          // Firefox-specific fetch implementation
          const mainResponse = await supabase
            .from('repositories')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          let allRepos = mainResponse.data || [];
          
          if (!allRepos || allRepos.length === 0) {
            const savedResponse = await supabase
              .from('saved_repositories')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            
            allRepos = savedResponse.data || [];
          }
          
          if (Array.isArray(allRepos)) {
            // When updating state, don't update if this is a background refresh and data is the same
            if (isBackgroundRefresh) {
              // Compare with existing data before updating
              const currentRepos = repositories.length;
              const newRepos = allRepos?.length || 0;
              
              if (currentRepos === newRepos) {
                console.log("Background refresh: No changes detected");
                return; // Skip state updates if data is the same
              }
              
              console.log("Background refresh: Updating with new data");
            }
            
            // Update repositories and cache
            setRepositories(allRepos || []);
            setCachedRepositories(allRepos || []);
            
            if (allRepos.length > 0) {
              const userTags = await getUserTags();
              setTags(userTags);
              setCachedTags(userTags); // Update tags cache
            }
            
            setIsFirstTimeUser(allRepos.length === 0);
          }
        } else {
          // Standard fetch path - properly initialize allRepos
          const mainResponse = await supabase
            .from('repositories')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          let allRepos = mainResponse.data || [];
          
          // Check if we need to fetch from saved_repositories
          if (!allRepos || allRepos.length === 0) {
            const savedResponse = await supabase
              .from('saved_repositories')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            
            allRepos = savedResponse.data || [];
          }
          
          // Now use allRepos which is properly defined
          setRepositories(allRepos || []);
          setCachedRepositories(allRepos || []); // Update cache
          
          if (allRepos.length > 0) {
            const userTags = await getUserTags();
            setTags(userTags);
            setCachedTags(userTags); // Update tags cache
          }
          
          setIsFirstTimeUser(allRepos.length === 0);
        }
        
        setLoading(false);
        if (setSubscriptionLoading) setSubscriptionLoading(false);
      } catch (err) {
        console.error(`Repository fetch error:`, err);
        if (!isBackgroundRefresh) {
          // Only show error for foreground fetches
          setError('Failed to load repositories. Please try again.');
        }
        
        // Always reset loading states
        setLoading(false);
        if (setSubscriptionLoading) setSubscriptionLoading(false);
      }
    };

    checkUserAndFetch();
// Remove cachedRepositories and cachedTags from dependency array
}, [navigate, location.state?.forceRefresh, refreshFlag]);

// Add debounce effect for search
useEffect(() => {
  // Clear any existing timeout
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }
  
  // Set a new timeout to update debounced value after 300ms
  searchTimeoutRef.current = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  
  // Cleanup timeout on unmount or when searchQuery changes again
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, [searchQuery]);

// Add this focus management function
const maintainFocus = useCallback(() => {
  if (searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, []);

// Add this after the initial fetch effect to prevent search effect from overriding Firefox data

useEffect(() => {
  // Add protection for Firefox repositories
  if (repositories.length > 0) {
    //console.log('Protection: Repositories already loaded, protecting state', repositories.length);
    
    // Store a flag in session storage to prevent overrides
    sessionStorage.setItem('firefox_repos_loaded', 'true');
    
    // Add debug output for UI rendering phase
    setTimeout(() => {
      //console.log('Protection: Verifying repositories still available during render', repositories.length);
    }, 100);
  }
}, [repositories.length]);

// Modify your existing search effect to use debouncedSearchQuery instead
useEffect(() => {
  // Skip if we haven't done the initial load yet or user has no repositories
  if (!fetchAttemptedRef.current || isFirstTimeUser) return;
  
  // Add Firefox protection check
  const firefoxReposLoaded = sessionStorage.getItem('firefox_repos_loaded') === 'true';
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  
  if (isFirefox && firefoxReposLoaded && !debouncedSearchQuery && !selectedTag) {
    //console.log('Protection: Skipping search effect to preserve Firefox repositories');
    return;
  }
  
  const fetchFilteredRepositories = async () => {
    try {
      // Don't set loading to true - this will trigger fewer re-renders
      // and help maintain focus
      const hadFocus = document.activeElement === searchInputRef.current;
      
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      // First try repositories table
      let query = supabase
        .from('repositories')
        .select('*')
        .eq('user_id', session.user.id) // Add user_id filter
        .order('created_at', { ascending: false });
        
      // Use debouncedSearchQuery instead of searchQuery
      if (debouncedSearchQuery) {
        query = query.or([
          `repo_name.ilike.%${debouncedSearchQuery}%`,
          `description.ilike.%${debouncedSearchQuery}%`,
          `notes.ilike.%${debouncedSearchQuery}%`
        ]);
      }
      
      // Add tag filter if needed
      if (selectedTag) {
        query = query.contains('tags', [selectedTag]);
      }
      
      const { data: mainData, error: mainError } = await query;
      
      // If no results or error, try saved_repositories table
      let data = mainData;
      if (!mainData || mainData.length === 0 || mainError) {
        //console.log('Search: No results in main table, checking saved_repositories');
        
        // Query the saved_repositories table
        let savedQuery = supabase
          .from('saved_repositories')
          .select('*')
          .eq('user_id', session.user.id) // Add user_id filter
          .order('created_at', { ascending: false });
          
        // Add search filter if needed - FIXED SYNTAX
        if (debouncedSearchQuery) {
          savedQuery = savedQuery.or([
            `repo_name.ilike.%${debouncedSearchQuery}%`,
            `description.ilike.%${debouncedSearchQuery}%`,
            `notes.ilike.%${debouncedSearchQuery}%`
          ]);
        }
        
        // Add tag filter if needed
        if (selectedTag) {
          savedQuery = savedQuery.contains('tags', [selectedTag]);
        }
        
        const { data: savedData, error: savedError } = await savedQuery;
        
        if (savedError) throw savedError;
        data = savedData;
      }
      
      //console.log(`Search results: Found ${data?.length || 0} repositories`);
      setRepositories(data || []);
      
      // More aggressive focus restoration
      if (hadFocus) {
        // Use multiple setTimeout with increasing delays to ensure focus is maintained
        setTimeout(() => maintainFocus(), 0);
        setTimeout(() => maintainFocus(), 50);
        setTimeout(() => maintainFocus(), 100);
      }
      
      // Also restore focus in finally block
    } catch (err) {
      console.error('Error filtering repositories:', err);
      setError('Failed to search GitHub repositories. Please try again.');
    } finally {
      setLoading(false);
      
      // Restore focus after state updates
      setTimeout(() => maintainFocus(), 0);
      setTimeout(() => maintainFocus(), 50);
    }
  };
  
  fetchFilteredRepositories();
}, [debouncedSearchQuery, selectedTag, isFirstTimeUser, maintainFocus]);

// ADD this single, comprehensive safety net with a ref to prevent loops
const safetyTimeoutsSetRef = useRef(false);

// Place this effect right after your state declarations
useEffect(() => {
  // Prevent multiple instances of safety timeouts
  if (safetyTimeoutsSetRef.current) return;
  
  // Only run this once per component mount
  safetyTimeoutsSetRef.current = true;
  
  console.log("Setting up loading safety timeouts");
  
  const timeouts = [];
  
  // Safety timeout 1
  timeouts.push(setTimeout(() => {
    if (loading || subscriptionLoading) {
      console.log("Safety timeout 1 (3s): Resetting loading states");
      setLoading(false);
      if (setSubscriptionLoading) setSubscriptionLoading(false);
    }
  }, 3000));
  
  // Safety timeout 2: Force-render timeout after 5s
  timeouts.push(setTimeout(() => {
    if (loading || subscriptionLoading) {
      console.log("Safety timeout 2 (5s): Force exceeding loading timeout");
      setLoadingTimeoutExceeded(true);
      setLoading(false);
      if (setSubscriptionLoading) setSubscriptionLoading(false);
    }
  }, 5000));
  
  // Safety timeout 3: Last resort refresh after 10s only if no data
  timeouts.push(setTimeout(() => {
    if ((loading || subscriptionLoading) && repositories.length === 0) {
      console.log("Safety timeout 3 (10s): Force page refresh - no data loaded");
      // Only refresh if we haven't already tried
      if (!window.location.href.includes('force_refresh')) {
        window.location.href = window.location.href + 
          (window.location.href.includes('?') ? '&' : '?') + 'force_refresh=true';
      }
    }
  }, 10000));
  
  return () => {
    // Clear ALL timeouts on cleanup
    timeouts.forEach(timeout => clearTimeout(timeout));
    safetyTimeoutsSetRef.current = false; // Reset for component remount
  };
}, []); // Empty dependency array - only run once

// Then modify your loading check
if ((loading || subscriptionLoading) && !loadingTimeoutExceeded) {
  // Failsafe for spinner styling to handle undefined
  const spinnerBorderClass = themeClasses?.spinnerBorder || 'border-blue-500 dark:border-blue-400';
  
  return (
    <div className="min-h-screen flex justify-center items-center" style={{backgroundColor: 'var(--bg-color, inherit)'}}>
      <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${spinnerBorderClass}`}></div>
    </div>
  );
}
  
  const handleSearch = (e) => {
    e.preventDefault();
    // The state update triggers the filter useEffect
  };
  
  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };
  
  // Calculate repository limit details
  const repoLimit = REPOSITORY_LIMITS[userTier];
  const isNearLimit = userTier === TIERS.FREE && repoCount >= repoLimit * 0.8;
  const isAtLimit = userTier === TIERS.FREE && repoCount >= repoLimit;
  const cardHoverEffect = "transition-transform duration-200 transform hover:-translate-y-1 hover:shadow-lg";
  
  // Update the manual refresh function
  const refreshRepositories = () => {
    // Invalidate cache
    invalidateRepositories();
    
    // Reset fetch flag and trigger refresh
    fetchAttemptedRef.current = false;
    setRefreshFlag(prev => prev + 1);
  };
  
  // Error state
  if (error) {
    return (
      <div className={`min-h-screen ${themeClasses.body} !transition-colors !duration-300`} style={{backgroundColor: 'var(--bg-color, inherit)'}}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
          <div className={`${themeClasses.dangerBanner} p-6 rounded-lg`}>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className={`${themeClasses.dangerButton} mt-4 px-4 py-2 rounded`}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // First time user or user with no repositories
  if (isFirstTimeUser || repositories.length === 0) {
    return (
      // Add the same theme class and style as your main dashboard
      <div className={`min-h-screen ${themeClasses.body} !transition-colors !duration-300`} style={{backgroundColor: 'var(--bg-color, inherit)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`text-center ${themeClasses.card} shadow rounded-lg p-8`}>
            <h1 className="text-2xl font-bold mb-4">Welcome to ReadLater!</h1>
            <p className="mb-6">You haven't saved any GitHub repositories yet.</p>
            <Link
              to="/save"
              className={`${themeClasses.button} px-6 py-3 rounded-md inline-flex items-center space-x-2`}
            >
              <FaBookmark className="mr-2" />
              <span>Save Your First Repository</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Main dashboard with repositories
  return (
    <div className={`min-h-screen ${themeClasses.body} !transition-colors !duration-300`} style={{backgroundColor: 'var(--bg-color, inherit)'}}>
      <div className="container mx-auto px-6 py-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">My Saved Repositories</h1>
          
          <Link 
            to="/save"
            className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-300 ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => isAtLimit && e.preventDefault()}
          >
            <span>Save New Repository</span>
          </Link>
        </div>
        
        {/* Add the Private Repository Toggle */}
        <div className="mb-6">
          <PrivateRepoToggle />
        </div>
        
        {/* Subscription warnings */}
        {isNearLimit && (
          <div className={`mb-6 p-4 rounded-md ${isAtLimit ? themeClasses.dangerBanner : themeClasses.warningBanner} transition-colors duration-300`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">
                  {isAtLimit 
                    ? `You've reached the limit of ${repoLimit} repositories on your free plan.` 
                    : `You've saved ${repoCount} of ${repoLimit} repositories (${Math.round((repoCount/repoLimit)*100)}%).`
                  }
                </p>
                <p className="mt-1">
                  {isAtLimit 
                    ? 'Upgrade to Premium to save unlimited repositories.' 
                    : 'You\'re approaching your free plan limit. Consider upgrading soon.'}
                </p>
              </div>
              
              <Link 
                to="/subscription" 
                className={`btn mt-3 md:mt-0 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors duration-300 ${isAtLimit ? themeClasses.dangerButton : themeClasses.warningButton}`}
              >
                <FaCrown className="mr-1" />
                <span>Upgrade to Premium</span>
                <FaArrowRight className="ml-1" />
              </Link>
            </div>
          </div>
        )}
        
        {/* Premium banner */}
        {userTier === TIERS.PREMIUM && (
          <div className={`mb-6 p-4 rounded-md ${themeClasses.infoBanner} transition-colors duration-300`}>
            <div className="flex items-center">
              <FaCrown className={`${darkMode ? 'text-yellow-400' : 'text-yellow-500'} mr-2`} />
              <p>
                <span className="font-medium">Premium Plan Active: </span>
                You have unlimited repository storage and access to all premium features.
              </p>
            </div>
          </div>
        )}
        
        {/* Search and filter section */}
        <div className={`${themeClasses.card} rounded-lg shadow-md p-4 mb-8 transition-colors duration-300`}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-grow">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none ${themeClasses.focusRing} ${themeClasses.input} transition-colors duration-300`}
                />
                <FaSearch className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </form>
            </div>
            
            {/* Tags filter */}
            {tags.length > 0 && (
              <div className="min-w-[200px]">
                <div className="relative">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none ${themeClasses.focusRing} appearance-none ${themeClasses.input} transition-colors duration-300`}
                  >
                    <option value="">All Tags</option>
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <FaTags className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Repository cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <div 
              key={repo.id} 
              className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden ${cardHoverEffect} transition-colors duration-300 cursor-pointer`}
              onClick={() => navigate(`/repository/${repo.id}`)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold">
                    <span className={`hover:${themeClasses.linkHover} transition-colors duration-300`}>
                      {repo.repo_name || repo.name}
                    </span>
                  </h2>
                  
                  <div className="flex items-center space-x-1 text-sm">
                    <FaStar className="text-yellow-500" />
                    <span>{repo.stars || 0}</span>
                  </div>
                </div>
                
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-3 transition-colors duration-300`}>
                  {repo.repo_owner || repo.owner}/{repo.repo_name || repo.name}
                </p>
                
                {repo.description && (
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4 line-clamp-2 transition-colors duration-300`}>
                    {repo.description}
                  </p>
                )}
                
                {repo.language && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                    <FaCircle className={themeClasses.languageIndicator} style={{ fontSize: '10px' }} />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {repo.language}
                    </span>
                  </div>
                )}
                
                {repo.tags && repo.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {repo.tags.map((tag) => (
                      <span 
                        key={tag} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(tag);
                        }}
                        className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-colors duration-300 ${
                          selectedTag === tag 
                            ? `${getTagColor(tag)} ring-2 ring-blue-400 dark:ring-blue-500`
                            : getTagColor(tag)
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {repo.notes && (
                  <div className="mb-4">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} italic line-clamp-2 transition-colors duration-300`}>
                      {repo.notes}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4">                  
                  <a 
                    href={repo.repo_url || repo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`text-sm flex items-center space-x-1 ${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'} transition-colors duration-300`}
                    onClick={(e) => e.stopPropagation()} // Prevent the card click event from triggering
                  >
                    <span>GitHub</span>
                    <FaExternalLinkAlt className="text-xs ml-1" />
                  </a>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Repository Tile */}
          {!isAtLimit && (
            <div 
              onClick={() => navigate('/save')}
              className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden ${cardHoverEffect} transition-colors duration-300 cursor-pointer border-2 border-dashed ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex flex-col items-center justify-center p-10 hover:border-blue-500`}
            >
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-4 mb-4`}>
                <FaPlus className={`text-3xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
              <h3 className={`text-lg font-medium ${themeClasses.text}`}>Add Repository</h3>
              <p className={`text-sm ${themeClasses.textSecondary} text-center mt-2`}>
                Save a new GitHub repository to your collection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;