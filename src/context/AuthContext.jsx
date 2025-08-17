import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define admin user ID
const ADMIN_USER_ID = "6b3aaad3-bda8-4030-89c4-f4ed89478644";

// Create a context
const AuthContext = createContext(null);

// Export the useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Check for existing session with retry logic
    const checkSession = async () => {
      try {
        // Ensure Supabase is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Session check error:', error);
        }
        
        if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setHasCheckedSession(true);
          setLoading(false);
        }
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        
        // Always ensure loading is false after any auth state change
        setLoading(false);
        setHasCheckedSession(true);
      }
    );
    
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading: loading || !hasCheckedSession,
    isAdmin,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;