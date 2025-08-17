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
  // Initialize with cached data if available
  const getInitialAuthState = () => {
    try {
      const cachedUser = localStorage.getItem('readlater_user');
      const cachedExpiry = localStorage.getItem('readlater_user_expiry');
      
      if (cachedUser && cachedExpiry) {
        const expiryTime = parseInt(cachedExpiry);
        const currentTime = Date.now();
        
        if (currentTime < expiryTime) {
          return JSON.parse(cachedUser);
        }
      }
    } catch (error) {
      console.error('Error reading initial auth state:', error);
    }
    return null;
  };

  const initialUser = getInitialAuthState();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser); // If we have cached user, don't show loading
  const [isAdmin, setIsAdmin] = useState(initialUser?.id === ADMIN_USER_ID);

  useEffect(() => {
    let isMounted = true;
    
    // Check for cached auth state first
    const getCachedAuthState = () => {
      try {
        const cachedUser = localStorage.getItem('readlater_user');
        const cachedExpiry = localStorage.getItem('readlater_user_expiry');
        
        if (cachedUser && cachedExpiry) {
          const expiryTime = parseInt(cachedExpiry);
          const currentTime = Date.now();
          
          // If cache is still valid (less than 5 minutes old)
          if (currentTime < expiryTime) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setIsAdmin(userData.id === ADMIN_USER_ID);
            return true; // Cache hit
          } else {
            // Cache expired, clear it
            localStorage.removeItem('readlater_user');
            localStorage.removeItem('readlater_user_expiry');
          }
        }
      } catch (error) {
        console.error('Error reading cached auth state:', error);
        localStorage.removeItem('readlater_user');
        localStorage.removeItem('readlater_user_expiry');
      }
      return false; // Cache miss
    };
    
    // Check for existing session
    const checkSession = async () => {
      try {
        // First check cache - if valid, use it and set loading to false immediately
        const hasCachedAuth = getCachedAuthState();
        if (hasCachedAuth && isMounted) {
          setLoading(false);
          // Still verify with Supabase in background, but don't show loading
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Session check error:', error);
        }
        
        if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
          
          // Cache the user data for 5 minutes
          try {
            localStorage.setItem('readlater_user', JSON.stringify(session.user));
            localStorage.setItem('readlater_user_expiry', (Date.now() + 5 * 60 * 1000).toString());
          } catch (error) {
            console.error('Error caching auth state:', error);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          
          // Clear cache if no session
          localStorage.removeItem('readlater_user');
          localStorage.removeItem('readlater_user_expiry');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          
          // Clear cache on error
          localStorage.removeItem('readlater_user');
          localStorage.removeItem('readlater_user_expiry');
        }
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem('readlater_user');
          localStorage.removeItem('readlater_user_expiry');
        } else if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
          
          // Update cache
          try {
            localStorage.setItem('readlater_user', JSON.stringify(session.user));
            localStorage.setItem('readlater_user_expiry', (Date.now() + 5 * 60 * 1000).toString());
          } catch (error) {
            console.error('Error caching auth state:', error);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem('readlater_user');
          localStorage.removeItem('readlater_user_expiry');
        }
      }
    );
    
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
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