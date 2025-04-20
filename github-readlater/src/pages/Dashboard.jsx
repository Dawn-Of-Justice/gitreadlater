import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaSearch, FaTags, FaExternalLinkAlt, FaCircle, FaCrown, FaArrowRight } from 'react-icons/fa';
import { getSavedRepositories, getUserTags } from '../services/repositoryService';
import { getUserTier, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';

const Dashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get user's subscription tier
        const tier = await getUserTier();
        setUserTier(tier);
        
        // Build filters
        const filters = {};
        if (searchQuery) filters.search = searchQuery;
        if (selectedTag) filters.tag = selectedTag;
        
        // Fetch repositories
        const repoData = await getSavedRepositories(filters);
        setRepositories(repoData);
        setRepoCount(repoData.length);
        
        // Fetch tags if not already loaded
        if (tags.length === 0) {
          const tagsData = await getUserTags();
          setTags(tagsData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load your saved repositories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [searchQuery, selectedTag]);
  
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
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">My Saved Repositories</h1>
        
        <Link 
          to="/save"
          className={`btn btn-primary flex items-center space-x-2 ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => isAtLimit && e.preventDefault()}
        >
          <span>Save New Repository</span>
        </Link>
      </div>
      
      {/* Subscription status banner */}
      {isNearLimit && (
        <div className={`mb-6 p-4 rounded-md ${isAtLimit ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
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
              className={`btn mt-3 md:mt-0 flex items-center justify-center space-x-2 ${isAtLimit ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
            >
              <FaCrown className="mr-1" />
              <span>Upgrade to Premium</span>
              <FaArrowRight className="ml-1" />
            </Link>
          </div>
        </div>
      )}
      
      {userTier === TIERS.PREMIUM && (
        <div className="mb-6 p-4 rounded-md bg-blue-50 text-blue-700">
          <div className="flex items-center">
            <FaCrown className="text-yellow-500 mr-2" />
            <p>
              <span className="font-medium">Premium Plan Active: </span>
              You have unlimited repository storage and access to all premium features.
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-grow">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </form>
          </div>
          
          {/* Tags filter */}
          <div className="min-w-[200px]">
            <div className="relative">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-github-blue focus:border-transparent appearance-none"
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <FaTags className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-github-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p>{error}</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">No Repositories Found</h2>
          {searchQuery || selectedTag ? (
            <p className="text-gray-600">No repositories match your current filters. Try adjusting your search or tags.</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">You haven't saved any repositories yet.</p>
              <Link to="/save" className={`btn btn-primary ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={(e) => isAtLimit && e.preventDefault()}>
                Save Your First Repository
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <div key={repo.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold">
                    <Link to={`/repository/${repo.id}`} className="hover:text-github-blue">
                      {repo.repo_name}
                    </Link>
                  </h2>
                  
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <FaStar className="text-yellow-500" />
                    <span>{repo.stars || 0}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">
                  {repo.repo_owner}/{repo.repo_name}
                </p>
                
                {repo.description && (
                  <p className="text-gray-700 mb-4 line-clamp-2">
                    {repo.description}
                  </p>
                )}
                
                {repo.language && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                    <FaCircle className="text-github-blue" style={{ fontSize: '10px' }} />
                    <span>{repo.language}</span>
                  </div>
                )}
                
                {repo.tags && repo.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {repo.tags.map((tag) => (
                      <span 
                        key={tag} 
                        onClick={() => handleTagClick(tag)}
                        className={`px-2 py-1 text-xs rounded-full cursor-pointer ${
                          selectedTag === tag 
                            ? 'bg-github-blue text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {repo.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 italic line-clamp-2">
                      {repo.notes}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <Link 
                    to={`/repository/${repo.id}`}
                    className="text-github-blue hover:underline text-sm"
                  >
                    View Details
                  </Link>
                  
                  <a 
                    href={repo.repo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                  >
                    <span>GitHub</span>
                    <FaExternalLinkAlt className="text-xs" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;