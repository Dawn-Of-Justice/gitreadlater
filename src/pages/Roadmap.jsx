import React from 'react';
import { Link } from 'react-router-dom';
import { FaRocket, FaCheck, FaTools, FaLightbulb, FaStar, FaComments } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Roadmap = () => {
  const { themeClasses, darkMode } = useTheme();
  
  // Define roadmap items by category
  const roadmapItems = {
    current: [
      {
        title: 'Enhanced Tag Management',
        description: 'Improved tag organization with nested tags and tag colors',
        eta: 'Q2 2025',
        status: '80% Complete'
      },
      {
        title: 'Better Search Functionality',
        description: 'Advanced search filters and full-text search across notes',
        eta: 'Q3 2025',
        status: '40% Complete'
      }
    ],
    upcoming: [
      {
        title: 'Browser Extension',
        description: 'Save repositories from any GitHub page with one click',
        eta: 'Q3 2025'
      },
      {
        title: 'Workspace Sharing',
        description: 'Share collections of repositories with team members',
        eta: 'Q4 2025'
      }
    ],
    considering: [
      {
        title: 'Code Snippets',
        description: 'Save and organize useful code snippets from repositories'
      },
      {
        title: 'Learning Paths',
        description: 'Create and follow repository learning paths organized by topic'
      },
      {
        title: 'Repository Analytics',
        description: 'Track changes and statistics for repositories you follow'
      }
    ]
  };
  
  // Function to render a roadmap item with improved spacing
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
      <div className={`${themeClasses.card} rounded-lg p-6 transition-transform duration-300 transform hover:-translate-y-1 h-full flex flex-col`}>
        <div>
          {/* Icon and badge row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-shrink-0">
              {icon}
            </div>
            
            {item.status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusBadgeColor} whitespace-nowrap`}>
                {item.status}
              </span>
            )}
          </div>
          
          {/* Title */}
          <h3 className={`font-bold text-lg ${themeClasses.text} mb-2`}>{item.title}</h3>
          
          {/* Description */}
          <p className={`${themeClasses.textSecondary} mb-8`}>
            {item.description}
          </p>
        </div>
        
        {/* ETA - fixed at bottom */}
        {item.eta && (
          <div className="mt-auto">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-[#21262d] text-[#8b949e]' : 'bg-[#f6f8fa] text-[#57606a]'}`}>
              ETA: {item.eta}
            </span>
          </div>
        )}
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
    <div className={`${themeClasses.body} min-h-screen py-8 sm:py-12`}>
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
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
            <a 
              href="https://github.com/gitreadlater/roadmap" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`${themeClasses.button} flex items-center space-x-2 px-4 py-2 rounded-md text-sm sm:text-base`}
            >
              <FaStar className="mr-2" />
              <span>Vote on Features</span>
            </a>
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