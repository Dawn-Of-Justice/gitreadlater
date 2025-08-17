import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaStar, FaSearch, FaTags, FaExternalLinkAlt, FaCircle, FaArrowRight, FaBookmark, FaTrash, FaPlus } from 'react-icons/fa';
import { getSavedRepositories, getUserTags, checkRepositoriesTableExists, deleteRepository } from '../services/repositoryService';
import { useTheme } from '../context/ThemeContext';
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
  const location = useLocation();
  const { darkMode, themeClasses } = useTheme();
  
  // State
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repositoriesLoaded, setRepositoriesLoaded] = useState(false); // Track if we've loaded repos
  const [animateRepositories, setAnimateRepositories] = useState(false); // Track animation state
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [tableExists, setTableExists] = useState(null); // null means we haven't checked yet
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const searchInputRef = useRef(null); // Add this ref for the search input
  
  // Refs for tracking fetch status
  const fetchAttemptedRef = useRef(false);
  const userCheckedRef = useRef(false);

  // Cache
  const { 
    repositories: cachedRepositories, 
    setRepositories: setCachedRepositories,
    tags: cachedTags,
    setTags: setCachedTags,
    invalidateRepositories
  } = useCache();

  // Clear search when navigating to dashboard
  useEffect(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedTag('');
    
    // Also clear the input field directly
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  }, [location.pathname]); // Reset when route changes to dashboard

  // Main effect for initial loading - runs once on component mount
  useEffect(() => {
    if (fetchAttemptedRef.current && !location.state?.forceRefresh) return;
    
    const checkUserAndFetch = async () => {
      console.log('Dashboard: Starting optimized fetch process', { 
        forceRefresh: location.state?.forceRefresh,
        refreshFlag,
        fetchAttempted: fetchAttemptedRef.current
      });
      
      try {
        setLoading(true);
        
        // Reset force refresh flag if it was set
        if (location.state?.forceRefresh) {
          const newState = { ...location.state };
          delete newState.forceRefresh;
          navigate(location.pathname, { state: newState, replace: true });
        }
        
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          setLoading(false);
          navigate('/login');
          return;
        }
        
        // Check if we have cached data and it's recent (less than 5 minutes old)
        const cacheTimestamp = localStorage.getItem('dashboard_cache_timestamp');
        const isCacheValid = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 5 * 60 * 1000;
        
        if (isCacheValid && cachedRepositories && cachedRepositories.length > 0 && !location.state?.forceRefresh) {
          console.log('Dashboard: Using cached data for faster loading');
          setRepositories(cachedRepositories);
          setTags(cachedTags || []);
          setIsFirstTimeUser(cachedRepositories.length === 0);
          setRepositoriesLoaded(true);
          setTableExists(true);
          
          // Trigger animation immediately for cached data
          setTimeout(() => {
            setAnimateRepositories(true);
          }, 50);
          
          return; // Skip API calls if cache is valid
        }
        
        // OPTIMIZATION: Parallel execution to reduce 5-second loading delay
        // Execute all database queries in parallel instead of sequentially
        const [repositoriesResult, tagsResult, tableExistsResult] = await Promise.allSettled([
          // Fetch repositories (try saved_repositories table directly)
          supabase
            .from('saved_repositories')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
          
          // Fetch user tags in parallel
          getUserTags(),
          
          // Check table existence in parallel
          checkRepositoriesTableExists()
        ]);
        
        // Handle table existence
        const tableExists = tableExistsResult.status === 'fulfilled' ? tableExistsResult.value : true;
        setTableExists(tableExists);
        
        // Handle repositories with fallback
        if (repositoriesResult.status === 'fulfilled' && !repositoriesResult.value.error) {
          const allRepos = repositoriesResult.value.data || [];
          setRepositories(allRepos);
          setCachedRepositories(allRepos); // Cache the data
          setIsFirstTimeUser(allRepos.length === 0);
          setRepositoriesLoaded(true);
          
          // Update cache timestamp
          localStorage.setItem('dashboard_cache_timestamp', Date.now().toString());
          
          // Immediate animation trigger for better UX
          setTimeout(() => {
            setAnimateRepositories(true);
          }, 50);
          
        } else {
          // Fallback to repositories table if saved_repositories fails
          console.log('Trying fallback repositories table');
          try {
            const { data: fallbackRepos, error: fallbackError } = await supabase
              .from('repositories')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            
            if (!fallbackError) {
              setRepositories(fallbackRepos || []);
              setCachedRepositories(fallbackRepos || []); // Cache fallback data
              setIsFirstTimeUser((fallbackRepos || []).length === 0);
              localStorage.setItem('dashboard_cache_timestamp', Date.now().toString());
            } else {
              console.error('Fallback repositories query failed:', fallbackError);
              setRepositories([]);
              setIsFirstTimeUser(true);
            }
          } catch (fallbackErr) {
            console.error('Fallback repositories error:', fallbackErr);
            setRepositories([]);
            setIsFirstTimeUser(true);
          }
          setRepositoriesLoaded(true);
        }
        
        // Handle tags
        if (tagsResult.status === 'fulfilled') {
          setTags(tagsResult.value || []);
          setCachedTags(tagsResult.value || []); // Cache tags
        } else {
          console.error('Error fetching tags:', tagsResult.reason);
          setTags([]);
        }
        
      } catch (err) {
        console.error('Error in optimized fetch:', err);
        setError('Failed to load your saved repositories. Please try refreshing the page.');
        setRepositories([]);
        setTags([]);
        setIsFirstTimeUser(true);
        setRepositoriesLoaded(true);
      } finally {
        fetchAttemptedRef.current = true;
        setLoading(false);
      }
    };

    checkUserAndFetch();
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

// Modify your existing search effect to use debouncedSearchQuery instead
useEffect(() => {
  // Skip if we haven't done the initial load yet or user has no repositories
  if (!fetchAttemptedRef.current || isFirstTimeUser) return;
  
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
        console.log('Search: No results in main table, checking saved_repositories');
        
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
      
      console.log(`Search results: Found ${data?.length || 0} repositories`);
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

// Trigger animation when repositories change (search/filter results)
useEffect(() => {
  if (repositories.length > 0 && repositoriesLoaded) {
    setAnimateRepositories(false);
    // Small delay to reset animation, then trigger it
    const timer = setTimeout(() => {
      setAnimateRepositories(true);
    }, 50);
    return () => clearTimeout(timer);
  }
}, [debouncedSearchQuery, selectedTag, repositories.length, repositoriesLoaded]);

useEffect(() => {
  const fetchRepositories = async () => {
    try {
      setLoading(true);
      // Your existing repository fetching code...
    } catch (error) {
      console.error('Error fetching repositories:', error);
      setRepositories([]);
      setIsFirstTimeUser(true);
      setError('Failed to load repositories. Please try again.');
    } finally {
      // This ensures loading is always set to false, even in Firefox
      setLoading(false);
    }
  };

  fetchRepositories();
}, [navigate, location.state?.forceRefresh, refreshFlag]);

useEffect(() => {
  // Add a safety timeout to reset loading state after 10 seconds
  const safetyTimer = setTimeout(() => {
    setLoading(false);
  }, 8000);
  
  return () => clearTimeout(safetyTimer);
}, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // The state update triggers the filter useEffect
  };
  
  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };
  
  const cardHoverEffect = "transition-transform duration-200 transform hover:-translate-y-1 hover:shadow-lg";
  
  // Add a manual refresh function
  const refreshRepositories = () => {
    fetchAttemptedRef.current = false;
    setRefreshFlag(prev => prev + 1);
  };
  
  // Initial loading state with skeleton cards for better UX
  if (loading) {
    return (
      <div className={`min-h-screen ${themeClasses.body} !transition-colors !duration-300`} style={{backgroundColor: 'var(--bg-color, inherit)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Loading your repositories...</h1>
            <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${themeClasses.spinnerBorder}`}></div>
          </div>
          
          {/* Skeleton loading cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${themeClasses.card} shadow rounded-lg p-6 animate-pulse`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                </div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
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
  
  // First time user or user with no repositories (but only if we've actually loaded repositories)
  if (repositoriesLoaded && (isFirstTimeUser || repositories.length === 0)) {
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
            className={`${themeClasses.button} px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-300`}
          >
            <span>Save New Repository</span>
          </Link>
        </div>
        
        {/* Add the Private Repository Toggle */}
        <div className="mb-6">
          <PrivateRepoToggle />
        </div>
        
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
        <div className="repo-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo, index) => (
            <div 
              key={repo.id} 
              className={`repo-card ${themeClasses.card} rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-700 ease-out ${
                animateRepositories 
                  ? 'translate-y-0 opacity-100 scale-100 repo-card-enter' 
                  : 'translate-y-12 opacity-0 scale-95'
              }`}
              style={{
                animationDelay: animateRepositories ? `${index * 150}ms` : '0ms',
                animationFillMode: 'both',
                willChange: 'transform, opacity'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-12px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.zIndex = '10';
                e.currentTarget.style.border = '2px solid rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px) scale(1)';
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.zIndex = '';
                e.currentTarget.style.border = '';
              }}
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
          <div 
            onClick={() => navigate('/save')}
            className={`repo-card ${themeClasses.card} rounded-lg shadow-md overflow-hidden transition-colors duration-300 cursor-pointer border-2 border-dashed ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex flex-col items-center justify-center p-10 hover:border-blue-500`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-12px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.12)';
              e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px) scale(1)';
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.zIndex = '';
            }}
          >
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-4 mb-4`}>
                <FaPlus className={`text-3xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
              <h3 className={`text-lg font-medium ${themeClasses.text}`}>Add Repository</h3>
              <p className={`text-sm ${themeClasses.textSecondary} text-center mt-2`}>
                Save a new GitHub repository to your collection
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;