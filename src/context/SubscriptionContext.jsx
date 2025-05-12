import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getUserTier, getUserRepositoryCount, clearSubscriptionCache, REPOSITORY_LIMITS, TIERS } from '../services/subscriptionService';
import { supabase } from '../lib/supabaseClient';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [userSubscription, setUserSubscription] = useState(null);
  const [repoCount, setRepoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Refs for tracking state
  const fetchingRef = useRef(false);

  // Effect to fetch subscription data on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchSubscriptionData = async () => {
      // Prevent concurrent fetches
      if (fetchingRef.current) {
        return;
      }
      
      // Skip if already initialized
      if (initialized) {
        return;
      }
      
      try {
        fetchingRef.current = true;
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }
        
        // Fetch subscription tier
        const tier = await getUserTier(userSubscription, setUserSubscription);
        
        // Get repository count
        try {
          const count = await getUserRepositoryCount();
          if (isMounted) {
            setRepoCount(count);
          }
        } catch (repoError) {
          console.error('Error fetching repository count:', repoError);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
          fetchingRef.current = false;
        }
      }
    };

    fetchSubscriptionData();
    
    return () => {
      isMounted = false;
    };
  }, [userSubscription, initialized]);

  // Provide method to manually refetch data
  const refetchData = async () => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      
      // Clear cache first
      clearSubscriptionCache();
      
      // Re-fetch data
      const tier = await getUserTier(null, setUserSubscription);
      const count = await getUserRepositoryCount();
      setRepoCount(count);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  return (
    <SubscriptionContext.Provider value={{ 
      userSubscription, 
      repoCount, 
      loading, 
      setLoading,
      refetchData
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);