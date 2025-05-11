import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { search } = useLocation();
  const { darkMode, themeClasses } = useTheme();
  const isRefresh = new URLSearchParams(search).get('refresh') === 'true';
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is a token refresh (for private repo access)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setError(error.message);
          return;
        }
        
        if (!data?.session) {
          setError('Authentication failed - no session found');
          return;
        }
        
        // If this was just a refresh for permissions, go back to dashboard
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('Authentication process failed');
      }
    };
    
    handleCallback();
  }, [navigate, isRefresh]);
  
  return (
    <div className={`${themeClasses.body} min-h-screen flex items-center justify-center transition-colors duration-300`}>
      <div className={`${themeClasses.card} rounded-lg shadow-lg max-w-md w-full p-8 transition-colors duration-300`}>
        {error ? (
          <div>
            <h2 className={`text-xl font-bold text-red-600 mb-4`}>Authentication Error</h2>
            <p className={themeClasses.text}>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className={`${themeClasses.button} mt-6 px-4 py-2 rounded-md`}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${themeClasses.spinnerBorder || 'border-blue-500'} mb-4`}></div>
            <h2 className={`text-xl font-bold ${themeClasses.text} mb-2 transition-colors duration-300`}>
              {isRefresh ? 'Updating permissions...' : 'Completing authentication...'}
            </h2>
            <p className={`${themeClasses.textSecondary} text-center transition-colors duration-300`}>
              Please wait while we set up your account
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;