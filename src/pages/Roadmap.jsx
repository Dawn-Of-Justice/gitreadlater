import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaRocket, FaCheck, FaTools, FaLightbulb, FaStar, FaComments, FaThumbsUp } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; // Make sure to install this package

const Roadmap = () => {
  const { themeClasses, darkMode } = useTheme();
  const [voteCounts, setVoteCounts] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Define roadmap items by category with unique IDs
  const roadmapItems = {
    current: [
      {
        id: 'enhanced-tags',
        title: 'Enhanced Tag Management',
        description: 'Improved tag organization with nested tags and tag colors',
        eta: 'Q2 2025',
        status: '80% Complete'
      },
      {
        id: 'better-search',
        title: 'Better Search Functionality',
        description: 'Advanced search filters and full-text search across notes',
        eta: 'Q3 2025',
        status: '40% Complete'
      }
    ],
    upcoming: [
      {
        id: 'browser-extension',
        title: 'Browser Extension',
        description: 'Save repositories from any GitHub page with one click',
        eta: 'Q3 2025'
      },
      {
        id: 'workspace-sharing',
        title: 'Workspace Sharing',
        description: 'Share collections of repositories with team members',
        eta: 'Q4 2025'
      }
    ],
    considering: [
      {
        id: 'code-snippets',
        title: 'Code Snippets',
        description: 'Save and organize useful code snippets from repositories'
      },
      {
        id: 'learning-paths',
        title: 'Learning Paths',
        description: 'Create and follow repository learning paths organized by topic'
      },
      {
        id: 'repository-analytics',
        title: 'Repository Analytics',
        description: 'Track changes and statistics for repositories you follow'
      }
    ]
  };

  // Fetch vote counts and user votes on component mount
  useEffect(() => {
    fetchVoteCounts();
    fetchUserVotes();
  }, []);
  
  // Fetch total votes per feature
  const fetchVoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_votes')
        .select('feature_id, count')
        .select('feature_id')
        .select('count(*)', { count: 'exact' })
        .group('feature_id');
      
      if (error) throw error;
      
      // Transform into an object for easy lookup
      const counts = {};
      data?.forEach(item => {
        counts[item.feature_id] = item.count;
      });
      
      setVoteCounts(counts);
    } catch (error) {
      console.error('Error fetching vote counts:', error);
    }
  };
  
  // Fetch which features the current user has voted for
  const fetchUserVotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      const { data, error } = await supabase
        .from('feature_votes')
        .select('feature_id')
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      // Transform into an object for easy lookup
      const votes = {};
      data?.forEach(item => {
        votes[item.feature_id] = true;
      });
      
      setUserVotes(votes);
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };
  
  // Handle voting for a feature
  const handleVote = async (featureId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to vote for features');
      return;
    }
    
    setLoading(true);
    
    try {
      // If user already voted, remove the vote (toggle)
      if (userVotes[featureId]) {
        await supabase
          .from('feature_votes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('feature_id', featureId);
          
        // Update state
        setUserVotes(prev => ({...prev, [featureId]: false}));
        setVoteCounts(prev => ({...prev, [featureId]: (prev[featureId] || 1) - 1}));
        
        toast.success('Vote removed');
      } else {
        // Otherwise add a vote
        await supabase
          .from('feature_votes')
          .insert({
            user_id: session.user.id,
            feature_id: featureId
          });
          
        // Update state
        setUserVotes(prev => ({...prev, [featureId]: true}));
        setVoteCounts(prev => ({...prev, [featureId]: (prev[featureId] || 0) + 1}));
        
        toast.success('Vote counted! Thanks for your feedback');
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Unable to save your vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Modify the RoadmapItem component to include voting
  const RoadmapItem = ({ item, type }) => {
    let icon;
    let statusBadgeColor;
    
    if (type === 'current') {
      icon = <FaTools className={`text-lg ${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'}`} />;
      
      // Set status badge color based on completion percentage
      const completion = parseInt(item.status);
      if (completion >= 75) {
        statusBadgeColor = 'bg-green-500';
      } else if (completion >= 50) {
        statusBadgeColor = 'bg-blue-500';
      } else if (completion >= 25) {
        statusBadgeColor = 'bg-yellow-500';
      } else {
        statusBadgeColor = 'bg-gray-500';
      }
    } else if (type === 'upcoming') {
      icon = <FaRocket className={`text-lg ${darkMode ? 'text-[#d2a8ff]' : 'text-[#8250df]'}`} />;
    } else {
      icon = <FaLightbulb className={`text-lg ${darkMode ? 'text-[#f0883e]' : 'text-[#bf8700]'}`} />;
    }
    
    return (
      <div className={`${themeClasses.card} rounded-lg overflow-hidden transition-all duration-300 h-full flex flex-col`}>
        <div className="p-5 flex-grow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              {icon}
              <h3 className={`font-semibold ml-2 ${themeClasses.text}`}>{item.title}</h3>
            </div>
            
            {/* Status badge for current items */}
            {type === 'current' && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeColor}`}>
                {item.status}
              </span>
            )}
          </div>
          
          <p className={`${themeClasses.textSecondary} mb-4 text-sm`}>{item.description}</p>
          
          {/* Show ETA for current and upcoming items */}
          {(type === 'current' || type === 'upcoming') && (
            <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Expected: {item.eta}
            </p>
          )}
        </div>
        
        {/* Voting button section */}
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-3 mt-auto`}>
          <button
            onClick={() => handleVote(item.id)}
            disabled={loading}
            className={`w-full flex items-center justify-center py-1.5 rounded-md transition-colors ${
              userVotes[item.id] 
              ? `${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`
              : `${themeClasses.secondaryButton}`
            }`}
          >
            <FaThumbsUp className={`${userVotes[item.id] ? 'text-blue-400' : ''} mr-2`} />
            <span>{userVotes[item.id] ? 'Voted' : 'Vote'}</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-opacity-20 bg-blue-500">
              {voteCounts[item.id] || 0}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const GridContainer = ({ children, count }) => {
    // Determine grid class based on item count
    const getGridClass = () => {
      if (count === 1) {
        return "grid grid-cols-1 gap-4 sm:gap-6 max-w-md mx-auto";
      }
      else if (count === 2) {
        return "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto";
      }
      else {
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";
      }
    };
    
    return (
      <div className={getGridClass()}>
        {children}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 pt-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12">
          <div className="mb-6 md:mb-0">
            <h1 className={`text-2xl sm:text-3xl font-bold ${themeClasses.text}`}>Product Roadmap</h1>
            <p className={`mt-2 ${themeClasses.textSecondary}`}>Our plans for the future of Git ReadLater</p>
          </div>
          
          <div className="flex flex-wrap gap-3 sm:space-x-4">
            <Link 
              to="/contact" 
              className={`${themeClasses.secondaryButton} flex items-center space-x-2 px-4 py-2 rounded-md text-sm sm:text-base`}
            >
              <FaComments className="mr-2" />
              <span>Give Feedback</span>
            </Link>
          </div>
        </div>
        
        {/* In Progress Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center ${themeClasses.text}`}>
            <FaTools className="mr-2" /> 
            In Progress
          </h2>
          <GridContainer count={roadmapItems.current.length}>
            {roadmapItems.current.map((item, index) => (
              <RoadmapItem key={index} item={item} type="current" />
            ))}
          </GridContainer>
        </section>

        {/* Visual separator */}
        <div className={`w-16 h-1 mx-auto rounded mb-12 sm:mb-16 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>

        {/* Upcoming Section */}
        <section className="mb-12 sm:mb-16">
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center ${themeClasses.text}`}>
            <FaRocket className="mr-2" /> 
            Coming Soon
          </h2>
          <GridContainer count={roadmapItems.upcoming.length}>
            {roadmapItems.upcoming.map((item, index) => (
              <RoadmapItem key={index} item={item} type="upcoming" />
            ))}
          </GridContainer>
        </section>

        {/* Visual separator */}
        <div className={`w-16 h-1 mx-auto rounded mb-12 sm:mb-16 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>

        {/* Future Ideas Section */}
        <section>
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center ${themeClasses.text}`}>
            <FaLightbulb className="mr-2" /> 
            Later Down the Road
          </h2>
          <GridContainer count={roadmapItems.considering.length}>
            {roadmapItems.considering.map((item, index) => (
              <RoadmapItem key={index} item={item} type="considering" />
            ))}
          </GridContainer>
        </section>
        
        {/* Call to Action */}
        <div className={`${themeClasses.sectionDark} mt-12 sm:mt-16 p-6 sm:p-8 rounded-lg text-center`}>
          <h2 className={`text-xl sm:text-2xl font-bold mb-3 sm:mb-4 ${themeClasses.text}`}>Have an idea for a feature?</h2>
          <p className={`${themeClasses.textSecondary} mb-6 max-w-2xl mx-auto`}>
            We're constantly working to improve Git ReadLater. If you have suggestions or feature requests, we'd love to hear them!
          </p>
          <Link 
            to="/contact"
            className={`${themeClasses.button} px-5 py-2 sm:px-6 sm:py-3 rounded-md inline-block text-sm sm:text-base`}
          >
            Submit Your Idea
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;