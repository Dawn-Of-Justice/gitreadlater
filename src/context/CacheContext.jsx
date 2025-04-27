import { createContext, useState, useContext, useEffect, useCallback } from 'react';

const CacheContext = createContext();
const CACHE_DURATION = 5 * 60 * 1000;

export const CacheProvider = ({ children }) => {
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  
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