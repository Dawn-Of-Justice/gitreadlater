import { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create context
const CacheContext = createContext();

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const CacheProvider = ({ children }) => {
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Add a function to invalidate repositories cache
  const invalidateRepositoriesCache = useCallback(() => {
    setRepositories([]);
  }, []);
  
  const contextValue = {
    repositories,
    setRepositories,
    tags,
    setTags,
    invalidateRepositoriesCache
  };
  
  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};

// Custom hook for using the cache context
export const useCache = () => useContext(CacheContext);