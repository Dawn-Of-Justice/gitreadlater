import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const NotFound = () => {
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  
  return (
    <div className={`${themeClasses.body} min-h-screen flex flex-col items-center justify-center py-16 px-4 text-center transition-colors duration-300`}>
      <FaExclamationTriangle className={`text-6xl ${darkMode ? 'text-yellow-400' : 'text-yellow-500'} mb-6 transition-colors duration-300`} />
      
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      
      <p className={`text-xl ${themeClasses.textSecondary} mb-8 max-w-md transition-colors duration-300`}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <Link 
        to="/"
        className={`${themeClasses.button} flex items-center space-x-2 px-6 py-3 rounded-md transition-colors duration-300`}
      >
        <FaArrowLeft className="mr-2" />
        <span>Go Back Home</span>
      </Link>
    </div>
  );
};

export default NotFound;