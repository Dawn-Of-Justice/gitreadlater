import { FaGithub, FaHeart, FaBookmark, FaTwitter, FaEnvelope } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  
  return (
    <footer className={`${themeClasses.footer} py-8 transition-colors duration-300`}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <FaBookmark className="text-xl text-blue-500" />
            <span className="text-lg font-bold">GitHub ReadLater</span>
          </div>
          
          <div className="flex space-x-4">
            <a 
              href="#" 
              className={`${themeClasses.link} transition-colors duration-300`}
              aria-label="Twitter"
            >
              <FaTwitter />
            </a>
            <a 
              href="#" 
              className={`${themeClasses.link} transition-colors duration-300`}
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
            <a 
              href="#" 
              className={`${themeClasses.link} transition-colors duration-300`}
              aria-label="Contact us by email"
            >
              <FaEnvelope />
            </a>
          </div>
        </div>
        
        <div className={`mt-4 pt-4 border-t ${themeClasses.divider} text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'} transition-colors duration-300`}>
          <p>© 2025 GitHub ReadLater. Not affiliated with GitHub.</p>
          <div className="mt-2">
            <a href="#" className={`${themeClasses.link} mx-2 transition-colors duration-300`}>Terms</a>
            <a href="#" className={`${themeClasses.link} mx-2 transition-colors duration-300`}>Privacy</a>
            <a href="#" className={`${themeClasses.link} mx-2 transition-colors duration-300`}>Contact</a>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <p className="flex items-center justify-center text-sm">
            <span className={themeClasses.textSecondary}>Made with</span>
            <FaHeart className="text-red-500 mx-1" />
            <span className={themeClasses.textSecondary}>for developers</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;