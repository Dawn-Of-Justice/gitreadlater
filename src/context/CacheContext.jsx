import { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create context
const CacheContext = createContext();

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export function CacheProvider({ children }) {
  // Initialize state with cached values
  const [repositories, setRepositoriesState] = useState(() => {
    const cached = localStorage.getItem('cache_repositories');
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (err) {
        console.error('Error parsing cached repositories', err);
      }
    }
    return [];
  });
  
  const [tags, setTagsState] = useState(() => {
    const cached = localStorage.getItem('cache_tags');
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (err) {
        console.error('Error parsing cached tags', err);
      }
    }
    return [];
  });
  
  const [userSubscription, setUserSubscriptionState] = useState(() => {
    const cached = localStorage.getItem('cache_subscription');
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (err) {
        console.error('Error parsing cached subscription', err);
      }
    }
    return null;
  });
  
  // Use useCallback to stabilize function references
  const setRepositories = useCallback((data) => {
    setRepositoriesState(data);
    localStorage.setItem('cache_repositories', JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }, []);
  
  const setTags = useCallback((data) => {
    setTagsState(data);
    localStorage.setItem('cache_tags', JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }, []);
  
  const setUserSubscription = useCallback((data) => {
    setUserSubscriptionState(data);
    if (data) {
      localStorage.setItem('cache_subscription', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }
  }, []);

  // Clear cache on logout or when needed
  const clearCache = useCallback(() => {
    setRepositoriesState([]);
    setTagsState([]);
    setUserSubscriptionState(null);
    localStorage.removeItem('cache_repositories');
    localStorage.removeItem('cache_tags');
    localStorage.removeItem('cache_subscription');
    console.log('Cache cleared');
  }, []);
  
  // Cache invalidation functions
  const invalidateRepositories = useCallback(() => {
    setRepositoriesState([]);
    localStorage.removeItem('cache_repositories');
    console.log('Repository cache invalidated');
  }, []);
  
  const invalidateTags = useCallback(() => {
    setTagsState([]);
    localStorage.removeItem('cache_tags');
    console.log('Tags cache invalidated');
  }, []);
  
  const invalidateSubscription = useCallback(() => {
    setUserSubscriptionState(null);
    localStorage.removeItem('cache_subscription');
    console.log('Subscription cache invalidated');
  }, []);

  // Memoize the value object to prevent unnecessary re-renders
  const value = {
    repositories,
    setRepositories,
    tags,
    setTags,
    userSubscription,
    setUserSubscription,
    clearCache,
    invalidateRepositories,
    invalidateTags,
    invalidateSubscription
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

// Custom hook for using the cache context
export const useCache = () => useContext(CacheContext);