import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaBookmark, FaTag, FaPlayCircle, FaStar, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { signInWithGitHub, supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [showCards, setShowCards] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();
  const { darkMode, themeClasses } = useTheme();
  
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    
    checkAuth();
    
    // Add animation with slight delay
    const timer = setTimeout(() => {
      setShowCards(true);
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);
  
  const handleLogin = async () => {
    try {
      await signInWithGitHub();
      // The redirect will happen automatically via auth callback
    } catch (error) {
      console.error('Login error:', error);
      alert('Error logging in with GitHub');
    }
  };
  
  const handleWatchDemo = () => {
    setShowDemo(true);
  };
  
  // Example repository data
  const repositories = [
    {
      name: "facebook/react",
      description: "A JavaScript library for building user interfaces",
      stars: "198k",
      tags: ["frontend", "javascript"],
      note: "Great for UI components"
    },
    {
      name: "tensorflow/tensorflow",
      description: "Machine learning framework",
      stars: "171k",
      tags: ["ml", "python"],
      note: "Check tutorials for NLP"
    },
    {
      name: "tailwindlabs/tailwindcss",
      description: "A utility-first CSS framework",
      stars: "66k",
      tags: ["css", "design"],
      note: "Use for next project"
    }
  ];
  
  // Get tag color class
  const getTagColorClass = (tag) => {
    const colorMap = {
      frontend: "bg-green-600",
      javascript: "bg-blue-500",
      ml: "bg-red-600",
      python: "bg-blue-700",
      css: "bg-green-600",
      design: "bg-orange-600"
    };
    
    return colorMap[tag] || "bg-gray-800";
  };
  
  // Demo modal component
  const DemoModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-[#21262d]' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-3xl w-full`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${themeClasses.text}`}>GitHub ReadLater Demo</h3>
          <button 
            onClick={() => setShowDemo(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 mb-4`}>
          <div className="aspect-w-16 aspect-h-9">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaPlayCircle className="text-blue-500 text-5xl mx-auto mb-4" />
                <p className={themeClasses.textSecondary}>
                  Demo video would play here in a real implementation
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={() => setShowDemo(false)}
            className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md mr-2`}
          >
            Close
          </button>
          <button 
            onClick={handleLogin}
            className={`${themeClasses.button} px-4 py-2 rounded-md`}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={themeClasses.body}>
      {showDemo && <DemoModal />}
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Left Side - Text Content */}
            <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
              <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${themeClasses.text}`}>
                Never Lose Track of Useful GitHub Repositories Again
              </h1>
              <p className={`text-xl ${themeClasses.textSecondary} mb-8`}>
                GitHub ReadLater helps you save, organize, and rediscover repositories with custom tags and notes - your personal GitHub bookmarking system.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleLogin}
                  className={`${themeClasses.button} px-6 py-3 rounded-md font-medium flex items-center`}
                >
                  <FaGithub className="mr-2" />
                  <span>Get Started - It's Free</span>
                </button>
                <button 
                  onClick={handleWatchDemo}
                  className={`${themeClasses.secondaryButton} px-6 py-3 rounded-md font-medium flex items-center`}
                >
                  <FaPlayCircle className="mr-2" />
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>
            
            {/* Right Side - Repository Card Animation */}
            <div className="lg:w-1/2 relative">
              <div className="space-y-4 max-w-md mx-auto lg:mx-0">
                {repositories.map((repo, index) => (
                  <div 
                    key={index}
                    className={`${themeClasses.card} rounded-lg p-4 transform transition-all duration-500 ${
                      showCards 
                        ? 'translate-y-0 opacity-100' 
                        : 'translate-y-8 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className={`font-bold ${themeClasses.text}`}>{repo.name}</h3>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          {repo.description}
                        </p>
                      </div>
                      <div className="text-yellow-500 flex items-center">
                        <FaStar className="mr-1" />
                        <span>{repo.stars}</span>
                      </div>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {repo.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className={`${getTagColorClass(tag)} text-white text-xs px-2 py-1 rounded-full`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className={`text-xs ${themeClasses.textSecondary} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-2 mt-2`}>
                      My note: {repo.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`${themeClasses.sectionDark} py-16`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl font-bold text-center mb-12 ${themeClasses.text}`}>
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`${themeClasses.card} rounded-lg p-6 transition-transform duration-300 transform hover:-translate-y-2`}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mb-4`}>
                <FaBookmark className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>1. Save Repositories</h3>
              <p className={themeClasses.textSecondary}>
                Save repositories directly from GitHub or import your starred repos. Add notes to remember why you saved them.
              </p>
            </div>
            
            <div className={`${themeClasses.card} rounded-lg p-6 transition-transform duration-300 transform hover:-translate-y-2`}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mb-4`}>
                <FaTag className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>2. Organize with Tags</h3>
              <p className={themeClasses.textSecondary}>
                Create custom tags to categorize repositories by technology, purpose, or project. Filter your collection easily.
              </p>
            </div>
            
            <div className={`${themeClasses.card} rounded-lg p-6 transition-transform duration-300 transform hover:-translate-y-2`}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mb-4`}>
                <FaSearch className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${themeClasses.text}`}>3. Find & Rediscover</h3>
              <p className={themeClasses.textSecondary}>
                Quickly search and filter your saved repositories when you need them. No more digging through stars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="lg:w-1/2">
              <h2 className={`text-3xl font-bold mb-6 ${themeClasses.text}`}>
                Your GitHub Repositories, Organized
              </h2>
              <p className={`${themeClasses.textSecondary} mb-4`}>
                Starring repositories isn't enough. With GitHub ReadLater you can:
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                  <span className={themeClasses.textSecondary}>
                    Add detailed notes on why a repository is useful
                  </span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                  <span className={themeClasses.textSecondary}>
                    Create and manage custom tags for categorization
                  </span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                  <span className={themeClasses.textSecondary}>
                    Filter repositories by language, tags, or notes
                  </span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                  <span className={themeClasses.textSecondary}>
                    Import starred repositories with one click
                  </span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                  <span className={themeClasses.textSecondary}>
                    Search across your entire collection
                  </span>
                </li>
              </ul>
              <button
                onClick={handleLogin} 
                className={`${themeClasses.button} px-6 py-3 rounded-md font-medium`}
              >
                Try It Free
              </button>
            </div>
            <div className="lg:w-1/2">
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} rounded-lg border overflow-hidden`}>
                <img src="/api/placeholder/600/400" alt="GitHub ReadLater App Interface" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;