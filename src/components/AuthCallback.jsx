import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          // Redirect to dashboard on successful login
          navigate('/', { replace: true });
        } else {
          setError('Failed to establish a session. Please try logging in again.');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication error. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-64">
      {error ? (
        <div className="text-red-600">
          <p className="font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-github-blue text-white rounded-md"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4">Finishing authentication...</p>
          <div className="w-10 h-10 border-4 border-github-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;