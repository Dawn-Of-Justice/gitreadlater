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
    console.log('Dashboard mounted, clearing search state');
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
      console.log('Dashboard: Starting fetch process', { 
        forceRefresh: location.state?.forceRefresh,
        refreshFlag,
        fetchAttempted: fetchAttemptedRef.current
      });
      
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
        
        // Mark that we've checked the user status
        userCheckedRef.current = true;
        
        // Check if repositories table exists - this determines if we're a new installation
        const exists = await checkRepositoriesTableExists();
        setTableExists(exists);
        
        console.log('Dashboard: User session', { 
          userId: session.user.id,
          tableExists
        });
        
        if (!exists) {
          console.log('Repositories table does not exist - new installation');
          setIsFirstTimeUser(true);
          setRepositoriesLoaded(true); // No repositories to load if table doesn't exist
          setLoading(false);
          return;
        }
        
        // Check for user's repositories - this determines if it's a first-time user
        try {
          let data, count;
          try {
            // Try main repositories table first
            const response = await supabase
              .from('repositories')
              .select('*', { count: 'exact', head: false })
              .eq('user_id', session.user.id)
              .limit(1);
              
            data = response.data;
            count = response.count;
            
            // If no results, try saved_repositories table
            if (!data || data.length === 0) {
              //console.log('No repos in main table, checking saved_repositories');
              const savedResponse = await supabase
                .from('saved_repositories')
                .select('*', { count: 'exact', head: false })
                .eq('user_id', session.user.id)
                .limit(1);
                
              data = savedResponse.data;
              count = savedResponse.count;
            }
          } catch (error) {
            console.error('Error checking repositories:', error);
            throw error;
          }
          
          console.log('Dashboard: Repository check', {
            repositoriesFound: data && data.length > 0,
            count,
            isFirstTimeUser
          });
          
          // If no repos, this is a first-time user or someone who deleted all repos
          if (!data || data.length === 0) {
            console.log('User has no repositories');
            setRepositories([]);
            setIsFirstTimeUser(true);
            setRepositoriesLoaded(true); // Mark that we've completed the repository check
            setLoading(false);
            return;
          }
          
          // If we get here, user has repositories, so fetch them all
          let allRepos;
          try {
            // Try main repositories table first
            const { data: mainRepos, error: mainError } = await supabase
              .from('repositories')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
              
            if (mainError) throw mainError;
            
            // If no results or very few, also check saved_repositories table
            if (!mainRepos || mainRepos.length === 0) {
              //console.log('Checking saved_repositories table');
              const { data: savedRepos, error: savedError } = await supabase
                .from('saved_repositories')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
                
              if (savedError) throw savedError;
              allRepos = savedRepos || [];
            } else {
              allRepos = mainRepos;
            }
            
            setRepositories(allRepos || []);
            
            // Fetch tags if we have repositories
            const userTags = await getUserTags();
            setTags(userTags);
            
            setIsFirstTimeUser(false);
            setRepositoriesLoaded(true); // Mark that we've successfully loaded repositories
            
            // Trigger staggered animation after a brief delay
            setTimeout(() => {
              setAnimateRepositories(true);
            }, 100);
          } catch (repoError) {
            console.error('Error fetching user repositories:', repoError);
            // Rest of your error handling...
          }
        } catch (repoError) {
          console.error('Error fetching user repositories:', repoError);
          // If the error is about missing table, treat as first time user
          if (repoError.code === '42P01') {
            setIsFirstTimeUser(true);
            setRepositoriesLoaded(true); // We've determined there are no repositories
          } else {
            setError('Error loading your repositories. Please refresh the page.');
            setRepositoriesLoaded(true); // We've attempted to load, even if failed
          }
        }
      } catch (err) {
        console.error('Error in initial user check:', err);
        setError('Failed to load your saved repositories. Please try refreshing the page.');
        setRepositoriesLoaded(true); // We've attempted to load, even if failed
      } finally {
        fetchAttemptedRef.current = true;
        setLoading(false);
        
        console.log('Dashboard: Fetch complete', {
          repositories: repositories.length,
          tags: tags.length
        });
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
  
  // Initial loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${themeClasses.body} !transition-colors !duration-300 flex justify-center items-center`} style={{backgroundColor: 'var(--bg-color, inherit)'}}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${themeClasses.spinnerBorder}`}></div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;