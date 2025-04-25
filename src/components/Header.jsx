import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub, FaBookmark, FaPlus, FaSignOutAlt, FaUser, FaCrown, FaMoon, FaSun } from 'react-icons/fa';
import { signOut, signInWithGitHub } from '../lib/supabaseClient';
import { getUserTier, TIERS } from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';

const Header = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const navigate = useNavigate();
  
  // Get theme from context - this gives us darkMode, toggleTheme, and themeClasses
  const { darkMode, toggleTheme, themeClasses } = useTheme();
  
  useEffect(() => {
    const fetchUserTier = async () => {
      if (user) {
        const tier = await getUserTier();
        setUserTier(tier);
      }
    };
    
    fetchUserTier();
  }, [user]);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <header className={`${themeClasses.header} shadow-md transition-colors duration-300`}>
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-2">
            <FaBookmark className="text-2xl text-blue-500" />
            <span className="text-xl font-bold">Git ReadLater</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className={`flex items-center space-x-1 ${themeClasses.navLink} transition-colors duration-300`}
                >
                  <span>My Repositories</span>
                </Link>
                
                <Link 
                  to="/save" 
                  className={`flex items-center space-x-1 ${themeClasses.button} px-3 py-1 rounded-md transition-colors duration-300`}
                >
                  <FaPlus className="mr-1" />
                  <span>Save Repository</span>
                </Link>
                
                <Link 
                  to="/subscription" 
                  className={`flex items-center space-x-1 ${themeClasses.navLink} transition-colors duration-300`}
                >
                  {userTier === TIERS.PREMIUM ? (
                    <>
                      <FaCrown className="text-yellow-400 mr-1" />
                      <span>Premium</span>
                    </>
                  ) : (
                    <span>Upgrade</span>
                  )}
                </Link>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FaUser className="text-gray-400" />
                    <span>{user.user_metadata?.preferred_username || user.email}</span>
                  </div>
                  
                  <button 
                    onClick={handleSignOut}
                    className={`flex items-center space-x-1 ${themeClasses.navLink} transition-colors duration-300`}
                  >
                    <FaSignOutAlt className="mr-1" />
                    <span>Sign Out</span>
                  </button>
                  
                  <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-gray-700 focus:outline-none transition-colors duration-300"
                  >
                    {darkMode ? (
                      <FaSun className="text-yellow-300" />
                    ) : (
                      <FaMoon className="text-gray-700" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-700 focus:outline-none transition-colors duration-300"
                >
                  {darkMode ? (
                    <FaSun className="text-yellow-300" />
                  ) : (
                    <FaMoon className="text-gray-700" />
                  )}
                </button>
                
                <Link 
                  to="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className={`flex items-center space-x-2 ${themeClasses.button} px-4 py-2 rounded-md transition-colors duration-300`}
                >
                  <FaGithub className="text-lg" />
                  <span>Sign in with GitHub</span>
                </Link>
              </>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-700 focus:outline-none transition-colors duration-300 mr-2"
            >
              {darkMode ? (
                <FaSun className="text-yellow-300" />
              ) : (
                <FaMoon className="text-gray-700" />
              )}
            </button>
            
            <button 
              className="text-current"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={`md:hidden mt-4 pb-4 ${themeClasses.mobileMenu} rounded-md p-4 transition-colors duration-300`}>
            {user ? (
              <div className="flex flex-col space-y-4">
                <Link 
                  to="/" 
                  className={`flex items-center space-x-2 ${themeClasses.navLink} transition-colors duration-300`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>My Repositories</span>
                </Link>
                
                <Link 
                  to="/save" 
                  className={`flex items-center space-x-2 ${themeClasses.navLink} transition-colors duration-300`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaPlus className="mr-1" />
                  <span>Save Repository</span>
                </Link>
                
                <Link 
                  to="/subscription" 
                  className={`flex items-center space-x-2 ${themeClasses.navLink} transition-colors duration-300`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {userTier === TIERS.PREMIUM ? (
                    <>
                      <FaCrown className="text-yellow-400 mr-1" />
                      <span>Premium</span>
                    </>
                  ) : (
                    <span>Upgrade</span>
                  )}
                </Link>
                
                <div className="flex items-center space-x-2 text-gray-400">
                  <FaUser />
                  <span>{user.user_metadata?.preferred_username || user.email}</span>
                </div>
                
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 ${themeClasses.navLink} transition-colors duration-300`}
                >
                  <FaSignOutAlt className="mr-1" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link 
                to="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handleLogin();
                  setIsMenuOpen(false);
                }}
                className={`flex items-center space-x-2 ${themeClasses.button} px-4 py-2 rounded-md transition-colors duration-300`}
              >
                <FaGithub className="text-lg" />
                <span>Sign in with GitHub</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;