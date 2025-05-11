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

// Fixed GitHub sign-in function without React state dependencies
export const signInWithGitHub = async () => {
  try {
    // Default to public repos only (read:user, public_repo)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing in with GitHub:', error);
    return { success: false, error };
  }
};

// Sign out helper
export const signOut = async () => {
  try {
    // Try to get the session first to check if it exists
    const { data: { session } } = await supabase.auth.getSession();
    
    // If session exists, sign out normally
    if (session) {
      await supabase.auth.signOut();
    } else {
      console.log('No active session found, cleaning up local storage only');
    }
    
    // Always clean up local storage regardless of session state
    localStorage.removeItem('supabase.auth.token');
    
    // Clear all Supabase-related items from localStorage for Firefox compatibility
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error during sign out process:', error);
    
    // Even if official sign out fails, try to clear local storage
    try {
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    } catch (localStorageError) {
      console.error('Error clearing local storage:', localStorageError);
    }
    
    // Consider this a success even if the official sign out failed
    // This gives users a way to escape a broken auth state
    return { success: true };
  }
};
