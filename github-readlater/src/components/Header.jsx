import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGithub, FaBookmark, FaPlus, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { signOut } from '../lib/supabaseClient';

const Header = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <header className="bg-github-dark text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-2">
            <FaBookmark className="text-2xl" />
            <span className="text-xl font-bold">GitHub ReadLater</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className="flex items-center space-x-1 hover:text-gray-300 transition-colors"
                >
                  <span>My Repositories</span>
                </Link>
                
                <Link 
                  to="/save" 
                  className="flex items-center space-x-1 bg-github-blue px-3 py-1 rounded-md hover:bg-opacity-90 transition-colors"
                >
                  <FaPlus />
                  <span>Save Repository</span>
                </Link>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FaUser />
                    <span>{user.user_metadata?.preferred_username || user.email}</span>
                  </div>
                  
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
                  >
                    <FaSignOutAlt />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <Link 
                to="/login" 
                className="flex items-center space-x-2 bg-github-blue px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
              >
                <FaGithub className="text-lg" />
                <span>Sign in with GitHub</span>
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            {user ? (
              <div className="flex flex-col space-y-4">
                <Link 
                  to="/" 
                  className="flex items-center space-x-2 hover:text-gray-300 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>My Repositories</span>
                </Link>
                
                <Link 
                  to="/save" 
                  className="flex items-center space-x-2 hover:text-gray-300 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaPlus />
                  <span>Save Repository</span>
                </Link>
                
                <div className="flex items-center space-x-2">
                  <FaUser />
                  <span>{user.user_metadata?.preferred_username || user.email}</span>
                </div>
                
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <FaSignOutAlt />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="flex items-center space-x-2 hover:text-gray-300 transition-colors"
                onClick={() => setIsMenuOpen(false)}
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