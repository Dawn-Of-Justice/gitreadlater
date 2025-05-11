import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { search } = useLocation();
  const { themeClasses } = useTheme();
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
        // Otherwise go to dashboard as a new login
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
    <div className="flex items-center justify-center min-h-screen">
      <div className={`${themeClasses?.card || 'bg-white dark:bg-gray-800'} p-8 rounded-lg shadow-lg max-w-md w-full`}>
        {error ? (
          <div>
            <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h2 className="text-xl font-bold mb-2">
              {isRefresh ? 'Updating permissions...' : 'Completing authentication...'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we set up your account
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;