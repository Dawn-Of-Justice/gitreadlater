import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaSearch, FaTags, FaExternalLinkAlt, FaCircle, FaCrown, FaArrowRight, FaBookmark } from 'react-icons/fa';
import { getSavedRepositories, getUserTags } from '../services/repositoryService';
import { getUserTier, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import { useCache } from '../context/CacheContext'; 
import { supabase } from '../lib/supabaseClient';
import { initializeUserSubscription } from '../services/subscriptionService';



const Dashboard = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  // Get theme from context instead of managing locally
  const { darkMode, themeClasses } = useTheme();
  
  // Get cache from context
  const { 
    repositories: cachedRepositories, 
    setRepositories: setCachedRepositories,
    tags: cachedTags,
    setTags: setCachedTags,
    userSubscription: cachedSubscription,
    setUserSubscription: setCachedSubscription,
    invalidateRepositories 
  } = useCache();
  
  const initUserSubscription = async (userId) => {
    try {
      // Import the function from your service
      await initializeUserSubscription(userId);
    } catch (error) {
      console.error('Error initializing subscription:', error);
      // Continue anyway
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check if user subscription exists, if not initialize it
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            await initUserSubscription(session.user.id);
          }
        } catch (subError) {
          console.error('Subscription initialization error:', subError);
          // Continue anyway - don't block the rest of the loading
        }
        
        // Rest of your loading code
        const tier = await getUserTier();
        setUserTier(tier);
        
        const repoData = await getSavedRepositories(
          { tag: selectedTag, search: searchQuery },
          cachedRepositories,
          setCachedRepositories
        );
        setRepositories(repoData);
        setRepoCount(repoData.length);
        
        // Continue with rest of your function...
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load your saved repositories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // Only re-run when these values actually change, not when cached objects reference changes
  }, [searchQuery, selectedTag]);

  // Add a check to prevent repeated calls

  // In your useEffect or data fetching logic
  useEffect(() => {
    let isMounted = true;
    let pollingTimeout = null;
    
    const fetchRepositories = async () => {
      try {
        const { data: repos, error } = await supabase
          .from('repositories')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (isMounted) {
          setRepositories(repos || []);
          // Only poll if there are no repositories and we haven't reached the polling limit
          if ((repos?.length === 0) && pollCount < MAX_POLLS) {
            setPollCount(prev => prev + 1);
            pollingTimeout = setTimeout(fetchRepositories, 10000); // Poll every 10 seconds
          } else {
            // Stop polling once we have repos or reached limit
            clearTimeout(pollingTimeout);
          }
        }
      } catch (error) {
        console.error('Error fetching repositories:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchRepositories();
    
    return () => {
      isMounted = false;
      clearTimeout(pollingTimeout);
    };
  }, []);

  // Rest of the component remains the same, but uses themeClasses from context
  const handleSearch = (e) => {
    e.preventDefault();
    // The actual search is handled by the useEffect
  };
  
  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };
  
  // Calculate repository limit
  const repoLimit = REPOSITORY_LIMITS[userTier];
  const isNearLimit = userTier === TIERS.FREE && repoCount >= repoLimit * 0.8;
  const isAtLimit = userTier === TIERS.FREE && repoCount >= repoLimit;
  
  const cardHoverEffect = "transition-transform duration-200 transform hover:-translate-y-1 hover:shadow-lg";
  
  return (
    <div className={`min-h-screen ${themeClasses.body} transition-colors duration-300`}>
      <div className="container mx-auto px-6 py-8">
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
        
        {/* Subscription status banner */}
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
                className={`btn mt-3 md:mt-0 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors duration-300 ${isAtLimit ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
              >
                <FaCrown className="mr-1" />
                <span>Upgrade to Premium</span>
                <FaArrowRight className="ml-1" />
              </Link>
            </div>
          </div>
        )}
        
        {userTier === TIERS.PREMIUM && (
          <div className={`mb-6 p-4 rounded-md ${themeClasses.infoBanner} transition-colors duration-300`}>
            <div className="flex items-center">
              <FaCrown className="text-yellow-500 mr-2" />
              <p>
                <span className="font-medium">Premium Plan Active: </span>
                You have unlimited repository storage and access to all premium features.
              </p>
            </div>
          </div>
        )}
        
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input} transition-colors duration-300`}
                />
                <FaSearch className={`absolute left-3 top-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </form>
            </div>
            
            {/* Tags filter */}
            <div className="min-w-[200px]">
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${themeClasses.input} transition-colors duration-300`}
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
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className={`${themeClasses.dangerBanner} p-4 rounded-md transition-colors duration-300`}>
            <p>{error}</p>
          </div>
        ) : repositories.length === 0 ? (
          <div className={`${themeClasses.emptyState} p-8 rounded-lg text-center transition-colors duration-300`}>
            <h2 className="text-xl font-semibold mb-2">No Repositories Found</h2>
            {searchQuery || selectedTag ? (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No repositories match your current filters. Try adjusting your search or tags.</p>
            ) : (
              <div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>You haven't saved any repositories yet.</p>
                <Link to="/save" className={`${themeClasses.button} px-4 py-2 rounded-md transition-colors duration-300 ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={(e) => isAtLimit && e.preventDefault()}>
                  Save Your First Repository
                </Link>
              </div>
            )}
          </div>
        ) : (
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
                      <span className={`hover:text-blue-500 transition-colors duration-300`}>
                        {repo.repo_name}
                      </span>
                    </h2>
                    
                    <div className="flex items-center space-x-1 text-sm">
                      <FaStar className="text-yellow-500" />
                      <span>{repo.stars || 0}</span>
                    </div>
                  </div>
                  
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-3 transition-colors duration-300`}>
                    {repo.repo_owner}/{repo.repo_name}
                  </p>
                  
                  {repo.description && (
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4 line-clamp-2 transition-colors duration-300`}>
                      {repo.description}
                    </p>
                  )}
                  
                  {repo.language && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                      <FaCircle className="text-blue-500" style={{ fontSize: '10px' }} />
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
                          onClick={() => handleTagClick(tag)}
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
                      href={repo.repo_url} 
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
        )}
      </div>
    </div>
  );
};

export default Dashboard;