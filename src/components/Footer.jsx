import { Link } from 'react-router-dom';
import { FaGithub, FaHeart, FaBookmark, FaTwitter, FaEnvelope } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  
  return (
    <footer className={`${themeClasses.footer} py-8 transition-colors duration-300`}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <FaBookmark className="text-xl text-blue-500" />
            <span className="text-lg font-bold">GitHub ReadLater</span>
          </div>
          
          <div className="flex space-x-4">
            <a 
              href="https://x.com/SaloSojaEdwin" 
              className={`${themeClasses.link} transition-colors duration-300`}
              aria-label="Twitter"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter />
            </a>
            <a 
              href="https://github.com/Dawn-Of-Justice" 
              className={`${themeClasses.link} transition-colors duration-300`}
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
            </a>
          </div>
        </div>
        
        <div className={`pt-4 border-t ${themeClasses.divider} text-center ${themeClasses.textSecondary} transition-colors duration-300`}>
          <p>© {new Date().getFullYear()} GitHub ReadLater. Not affiliated with GitHub.</p>
          <div className="flex justify-center space-x-6 mt-4">
            <Link to="/roadmap" className={`${themeClasses.link} transition-colors duration-300`}>Roadmap</Link>
            <Link to="/contact" className={`${themeClasses.link} transition-colors duration-300`}>Contact</Link>
            <Link to="/terms" className={`${themeClasses.link} transition-colors duration-300`}>Terms</Link>
            <Link to="/privacy" className={`${themeClasses.link} transition-colors duration-300`}>Privacy</Link>
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