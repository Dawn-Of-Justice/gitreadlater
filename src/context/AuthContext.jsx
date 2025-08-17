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
  // Secure cache implementation - only store minimal, non-sensitive data
  const getInitialAuthState = () => {
    try {
      const cachedAuthFlag = localStorage.getItem('readlater_auth_state');
      const cachedExpiry = localStorage.getItem('readlater_auth_expiry');
      
      if (cachedAuthFlag && cachedExpiry) {
        const expiryTime = parseInt(cachedExpiry);
        const currentTime = Date.now();
        
        // Only cache for 2 minutes for security
        if (currentTime < expiryTime) {
          return cachedAuthFlag === 'authenticated';
        } else {
          // Cache expired, clear it
          localStorage.removeItem('readlater_auth_state');
          localStorage.removeItem('readlater_auth_expiry');
        }
      }
    } catch (error) {
      console.error('Error reading initial auth state:', error);
      localStorage.removeItem('readlater_auth_state');
      localStorage.removeItem('readlater_auth_expiry');
    }
    return false;
  };

  const hasAuthCache = getInitialAuthState();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!hasAuthCache); // Reduce loading if we know user was recently authenticated
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Check for cached auth state first (security-focused)
    const getCachedAuthState = () => {
      try {
        const cachedAuthFlag = localStorage.getItem('readlater_auth_state');
        const cachedExpiry = localStorage.getItem('readlater_auth_expiry');
        
        if (cachedAuthFlag && cachedExpiry) {
          const expiryTime = parseInt(cachedExpiry);
          const currentTime = Date.now();
          
          // Shorter cache time for security (2 minutes)
          if (currentTime < expiryTime) {
            return cachedAuthFlag === 'authenticated';
          } else {
            // Cache expired, clear it
            localStorage.removeItem('readlater_auth_state');
            localStorage.removeItem('readlater_auth_expiry');
          }
        }
      } catch (error) {
        console.error('Error reading cached auth state:', error);
        localStorage.removeItem('readlater_auth_state');
        localStorage.removeItem('readlater_auth_expiry');
      }
      return false;
    };
    
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check cache first - but don't set user data from cache for security
        const hadAuthCache = getCachedAuthState();
        if (hadAuthCache && isMounted) {
          // Reduce loading time but still verify with Supabase
          setLoading(false);
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Session check error:', error);
        }
        
        if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
          
          // Cache only authentication status, not sensitive user data
          try {
            localStorage.setItem('readlater_auth_state', 'authenticated');
            localStorage.setItem('readlater_auth_expiry', (Date.now() + 2 * 60 * 1000).toString()); // 2 minutes
          } catch (error) {
            console.error('Error caching auth state:', error);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          
          // Clear cache if no session
          localStorage.removeItem('readlater_auth_state');
          localStorage.removeItem('readlater_auth_expiry');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          
          // Clear cache on error
          localStorage.removeItem('readlater_auth_state');
          localStorage.removeItem('readlater_auth_expiry');
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
          localStorage.removeItem('readlater_auth_state');
          localStorage.removeItem('readlater_auth_expiry');
        } else if (session?.user) {
          setUser(session.user);
          setIsAdmin(session.user.id === ADMIN_USER_ID);
          
          // Update cache with just auth status
          try {
            localStorage.setItem('readlater_auth_state', 'authenticated');
            localStorage.setItem('readlater_auth_expiry', (Date.now() + 2 * 60 * 1000).toString());
          } catch (error) {
            console.error('Error caching auth state:', error);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem('readlater_auth_state');
          localStorage.removeItem('readlater_auth_expiry');
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