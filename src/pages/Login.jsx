import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaBookmark, FaTag, FaPlayCircle, FaStar, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { signInWithGitHub, supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import previewImage from '../assets/preview.png';

const Login = () => {
  const [showCards, setShowCards] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();
  const { darkMode, themeClasses } = useTheme();
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Add animation with slight delay
    const timer = setTimeout(() => {
      setShowCards(true);
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await signInWithGitHub();
      
      if (!result.success) {
        setError('Login failed. Please try again.');
      }
      // The redirect will happen automatically via auth callback
    } catch (err) {
      console.error('Login error:', err);
      setError('Error logging in with GitHub. Please try again.');
    } finally {
      setIsLoading(false);
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
      frontend: "bg-green-700",
      javascript: "bg-blue-700",
      ml: "bg-red-700",
      python: "bg-blue-700",
      css: "bg-green-700",
      design: "bg-orange-700"
    };
    
    return colorMap[tag] || "bg-gray-800";
  };
  
  // Demo modal component
  const DemoModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-[#21262d]' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-4xl w-full`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${themeClasses.text}`}>Git ReadLater Demo</h3>
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
          <div className="aspect-w-16 aspect-h-9" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <a
              href="https://youtu.be/_6nZszL1P0w"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center group cursor-pointer"
              style={{
                background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(https://img.youtube.com/vi/_6nZszL1P0w/maxresdefault.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px'
              }}
            >
              {/* Play button overlay */}
              <div className="bg-red-600 rounded-full p-4 group-hover:bg-red-700 transition-colors duration-200 shadow-lg">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              
              {/* YouTube logo in corner */}
              <div className="absolute bottom-4 right-4 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                YouTube
              </div>
            </a>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className={`${themeClasses.textSecondary} text-sm`}>
            Watch how GitReadLater helps you organize GitHub repositories efficiently
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDemo(false)}
              className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md`}
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
    </div>
  );

  return (
    <div className={themeClasses.body}>
      {showDemo && <DemoModal />}
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Left Side - Text Content - Keep your original layout */}
            <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
              <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${themeClasses.text}`}>
                Never Lose Track of Useful GitHub Repositories Again
              </h1>
              <p className={`text-xl ${themeClasses.textSecondary} mb-8`}>
                Git ReadLater helps you save, organize, and rediscover repositories with custom tags and notes - your personal GitHub bookmarking system.
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
            
            {/* Right Side - Repository Card Animation - Fix centering */}
            <div className="lg:w-1/2 flex justify-center w-full">
              <div className="w-full max-w-lg">
                <div className="space-y-4">
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
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section className={`py-16 border-t border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl font-bold text-center mb-6 ${themeClasses.text}`}>
            How Git ReadLater Works
          </h2>
          <p className={`text-center max-w-2xl mx-auto mb-12 ${themeClasses.textSecondary}`}>
            Your simple 3-step process to never lose track of useful GitHub repositories again
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`${themeClasses.card} rounded-lg p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'hover:shadow-blue-600/50' : 'hover:shadow-blue-500/40'}`}>
              <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mr-4`}>
                  <FaBookmark className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'} text-xl`} />
                </div>
                <span className={`${themeClasses.text} text-xl font-bold`}>Step 1: Save Repositories</span>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-3 mb-4`}>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Example:</span>
                  <span className={`${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Found a useful React component library</span>
                </div>
              </div>
              
              <ul className={`mb-4 space-y-2 ${themeClasses.textSecondary}`}>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Enter a GitHub repository URL or import from your starred repositories</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Add personal notes explaining why it's useful to you</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Repository details are automatically imported</span>
                </li>
              </ul>
            </div>
            
            <div className={`${themeClasses.card} rounded-lg p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'hover:shadow-blue-600/50' : 'hover:shadow-blue-500/40'}`}>
              <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mr-4`}>
                  <FaTag className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'} text-xl`} />
                </div>
                <span className={`${themeClasses.text} text-xl font-bold`}>Step 2: Organize with Tags</span>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-3 mb-4`}>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-medium mr-1">Example tags:</span>
                  <span className="bg-blue-700 text-white px-2 py-1 rounded-full text-xs">react</span>
                  <span className="bg-green-700 text-white px-2 py-1 rounded-full text-xs">ui-library</span>
                  <span className="bg-purple-700 text-white px-2 py-1 rounded-full text-xs">frontend</span>
                </div>
              </div>
              
              <ul className={`mb-4 space-y-2 ${themeClasses.textSecondary}`}>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Create custom tags that are meaningful to you</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Group repositories by technology, purpose, or project</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Reuse tags across repositories for consistency</span>
                </li>
              </ul>
            </div>
            
            <div className={`${themeClasses.card} rounded-lg p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'hover:shadow-blue-600/50' : 'hover:shadow-blue-500/40'}`}>
              <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${darkMode ? 'bg-[#0d419d]' : 'bg-[#ddf4ff]'} mr-4`}>
                  <FaSearch className={`${darkMode ? 'text-[#58a6ff]' : 'text-[#0969da]'} text-xl`} />
                </div>
                <span className={`${themeClasses.text} text-xl font-bold`}>Step 3: Find & Rediscover</span>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-3 mb-4`}>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Example:</span>
                  <span className={`${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Filter by "react" + "ui-library" tags</span>
                </div>
              </div>
              
              <ul className={`mb-4 space-y-2 ${themeClasses.textSecondary}`}>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Filter repositories by tags, languages, or keywords</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Search across descriptions and your personal notes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Quickly find exactly what you need when you need it</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <button
              onClick={handleLogin} 
              className={`${themeClasses.button} px-6 py-3 rounded-md font-medium`}
            >
              Get Started in 30 Seconds
            </button>
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
                Starring repositories isn't enough. With Git ReadLater you can:
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
              <div 
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} rounded-lg border overflow-hidden cursor-pointer h-full flex items-center justify-center relative group`}
                onClick={() => setShowImagePopup(true)}
              >
                <img 
                  src={previewImage} 
                  alt="Git ReadLater App Interface" 
                  className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                  loading="lazy"
                  width="800"
                  height="450"
                />
                
                {/* Maximize icon overlay - positioned in top right */}
                <div className="absolute inset-0 flex items-start justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} bg-opacity-70 p-2 rounded-lg m-3 shadow-lg`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Popup Modal - Larger Size */}
            {showImagePopup && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-3"
                onClick={() => setShowImagePopup(false)}
              >
                <div 
                  className="relative w-full max-w-[85vw] max-h-[85vh]" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    className="absolute -top-12 right-0 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    onClick={() => setShowImagePopup(false)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="bg-black bg-opacity-20 p-3 rounded-lg">
                    <img 
                      src={previewImage} 
                      alt="Git ReadLater App Interface" 
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl mx-auto" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;