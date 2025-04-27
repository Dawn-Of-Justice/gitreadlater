import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  if (!session) {
    return null;
  }
  
  return session.user;
};

// Update your GitHub sign-in function with better error handling
export const signInWithGitHub = async () => {
  try {
    // Clear any existing session first to avoid conflicts
    await supabase.auth.signOut();
    
    const redirectUrl = import.meta.env.VITE_REDIRECT_URL || `${window.location.origin}/auth/callback`;
    
    // Log the redirect URL to make sure it's correct
    console.log('Redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        scopes: 'read:user user:email public_repo',
      }
    });

    if (error) {
      console.error('OAuth error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error signing in with GitHub:', error);
    alert('Failed to sign in with GitHub. Please try again later.');
    throw error;
  }
};

// Sign out helper
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};
