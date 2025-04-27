import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme(); // Get theme state

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true);
        
        // Parse URL for errors
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash || location.search);
        
        if (params.get('error')) {
          const errorMessage = params.get('error_description') || 'Unknown error';
          setError(decodeURIComponent(errorMessage));
          setLoading(false);
          return;
        }

        // Get session from URL if available
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to establish session. Please try again.');
          setLoading(false);
          return;
        }
        
        if (!data.session) {
          // Try to exchange the code for a session
          console.log('No session found, attempting to exchange code');
          // This happens automatically with the Supabase client, just wait a moment
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (!retryData.session) {
              setError('Failed to authenticate. Please try again.');
              setLoading(false);
              return;
            }
            
            // Success! Redirect to the home page
            navigate('/');
          }, 2000);
          return;
        }
        
        // We have a session, redirect to home
        navigate('/');
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, location]);

  if (error) {
    return (
      <div className={`flex justify-center items-center min-h-screen p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`max-w-md w-full shadow-md rounded-lg p-6 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Authentication Error</h2>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{error}</p>
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Please try signing in again or contact support if the problem persists.
          </p>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;