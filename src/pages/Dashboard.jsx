import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaStar, FaSearch, FaTags, FaExternalLinkAlt, FaCircle, FaCrown, FaArrowRight, FaBookmark } from 'react-icons/fa';
import { getSavedRepositories, getUserTags, checkRepositoriesTableExists } from '../services/repositoryService';
import { getUserTier, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/ThemeContext'; // Make sure this import is added
import { useCache } from '../context/CacheContext'; 
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, themeClasses } = useTheme();
  const { userSubscription, repoCount, loading: subscriptionLoading } = useSubscription();
  
  // State
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tableExists, setTableExists] = useState(null); // null = unknown, true/false after check
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  
  // Refs for tracking fetch status
  const fetchAttemptedRef = useRef(false);
  const userCheckedRef = useRef(false);

  // Cache
  const { 
    repositories: cachedRepositories, 
    setRepositories: setCachedRepositories,
    tags: cachedTags,
    setTags: setCachedTags
  } = useCache();

  // Set up user tier from subscription
  const userTier = userSubscription?.tier || TIERS.FREE;

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
              console.log('No repos in main table, checking saved_repositories');
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
              console.log('Checking saved_repositories table');
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
          } catch (repoError) {
            console.error('Error fetching user repositories:', repoError);
            // Rest of your error handling...
          }
        } catch (repoError) {
          console.error('Error fetching user repositories:', repoError);
          // If the error is about missing table, treat as first time user
          if (repoError.code === '42P01') {
            setIsFirstTimeUser(true);
          } else {
            setError('Error loading your repositories. Please refresh the page.');
          }
        }
      } catch (err) {
        console.error('Error in initial user check:', err);
        setError('Failed to load your saved repositories. Please try refreshing the page.');
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

  // Effect for handling search and tag filters - only runs when filters change
  useEffect(() => {
    // Skip if we haven't done the initial load yet or user has no repositories
    if (!fetchAttemptedRef.current || isFirstTimeUser) return;
    
    const fetchFilteredRepositories = async () => {
      try {
        setLoading(true);
        
        // Apply filters
        let query = supabase
          .from('repositories')
          .select('*')
          .order('created_at', { ascending: false });
          
        // Add search filter if needed
        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }
        
        // Add tag filter if needed
        if (selectedTag) {
          query = query.contains('tags', [selectedTag]);
        }
        
        const { data, error: filterError } = await query;
        
        if (filterError) throw filterError;
        
        setRepositories(data || []);
      } catch (err) {
        console.error('Error filtering repositories:', err);
        setError('Error applying filters. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFilteredRepositories();
  }, [searchQuery, selectedTag, isFirstTimeUser]);

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
  
  // Add a manual refresh function
  const refreshRepositories = () => {
    fetchAttemptedRef.current = false;
    setRefreshFlag(prev => prev + 1);
  };

  // =======================================================================
  // RENDERING LOGIC
  // =======================================================================
  
  // Initial loading state
  if (loading || subscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${themeClasses.spinnerBorder}`}></div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        <div className={`${themeClasses.dangerBanner} p-6 rounded-lg`}>
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
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
                            ? themeClasses.tagSelected
                            : themeClasses.tag
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
                  <div className="invisible">
                    {/* Placeholder for flex layout balance */}
                  </div>
                  
                  <a 
                    href={repo.repo_url || repo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`text-sm flex items-center space-x-1 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-300`}
                    onClick={(e) => e.stopPropagation()} // Prevent the card click event from triggering
                  >
                    <span>GitHub</span>
                    <FaExternalLinkAlt className="text-xs ml-1" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;