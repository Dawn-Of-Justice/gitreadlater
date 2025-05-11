import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await checkAdminStatus(session.user);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkAdminStatus = async (user) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check admin_users table first
        const { data } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setIsAdmin(true);
          return;
        }
        
        // Fallback to UID check
        const adminUIDs = ["6b3aaad3-bda8-4030-89c4-f4ed89478644"];
        setIsAdmin(adminUIDs.includes(user.id));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await checkAdminStatus(session.user);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isAdmin,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}