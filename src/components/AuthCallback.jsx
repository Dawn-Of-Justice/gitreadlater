import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check URL for error parameters
        const url = new URL(window.location.href);
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        if (errorParam) {
          console.error('Auth error:', errorParam, errorDescription);
          setError(`Authentication error: ${errorDescription || 'Unknown error'}`);
          return;
        }
        
        // Get session and verify
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to establish a session. Please try logging in again.');
          return;
        }
        
        if (!session) {
          console.log('No session found, redirecting to login');
          navigate('/login');
          return;
        }
        
        // Get or create user subscription as needed
        try {
          const { data: existingUser } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (!existingUser) {
            console.log('Creating new user subscription');
            await supabase.from('user_subscriptions').insert({
              user_id: session.user.id,
              tier: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } catch (subError) {
          console.error('Error checking/creating subscription:', subError);
          // Continue anyway - we'll try again later
        }
        
        // Redirect to dashboard
        navigate('/');
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An unexpected error occurred. Please try logging in again.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <h2 className="font-bold mb-2">Authentication Error</h2>
          <p>{error}</p>
          <button 
            className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate('/login')}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-xl mb-4">Completing your sign-in...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;