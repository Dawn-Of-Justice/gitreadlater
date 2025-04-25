import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
      <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Please try signing in again or contact support if the problem persists.</p>
          <button
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;