import { supabase } from '../lib/supabaseClient';
import { getRepositoryDetails, parseGitHubUrl } from './githubService';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let loggedRepoCache = false;
let loggedRepoFetch = false;
let loggedTagCache = false;
let loggedTagFetch = false;

// Add a cache for the repositories table existence check
let repositoriesTableExists = null; // null = unknown, true/false = checked

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return headers;
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint, options = {}) => {
  const headers = await getAuthHeaders();
  
  // Ensure clean URL construction without double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanAPIURL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const fullURL = `${cleanAPIURL}${cleanEndpoint}`;
  
  const response = await fetch(fullURL, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

export const checkRepositoriesTableExists = async () => {
  // Return cached result if available
  if (repositoriesTableExists !== null) {
    return repositoriesTableExists;
  }
  
  try {
    // Try the API health check instead
    await fetch(`${API_URL}/health`);
    repositoriesTableExists = true;
    return true;
  } catch (error) {
    console.error('Error checking API availability:', error);
    // Fallback to direct Supabase check for saved_repositories table
    try {
      const { count, error } = await supabase
        .from('saved_repositories')
        .select('*', { count: 'exact', head: true })
        .limit(1);
        
      if (error && error.code === '42P01') {
        console.log('Saved repositories table does not exist');
        repositoriesTableExists = false;
        return false;
      }
      
      repositoriesTableExists = true;
      return true;
    } catch (fallbackError) {
      console.error('Error checking saved repositories table:', fallbackError);
      repositoriesTableExists = true;
      return true;
    }
  }
};

// Get current user
const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session.user;
};

// Save repository to user's collection
export const saveRepository = async (url, notes = '', tags = [], invalidateCache) => {
  try {
    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(url);
    
    // Get repository details from GitHub API
    const repoDetails = await getRepositoryDetails(owner, repo);
    
    // Prepare repository data to match saved_repositories schema
    const repositoryData = {
      repo_url: repoDetails.html_url,
      repo_owner: repoDetails.owner.login,
      repo_name: repoDetails.name,
      description: repoDetails.description || '',
      stars: repoDetails.stargazers_count || 0,
      language: repoDetails.language || null,
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : [],
    };

    // Save via API
    const result = await apiCall('/api/repositories', {
      method: 'POST',
      body: JSON.stringify(repositoryData),
    });
    
    if (invalidateCache) {
      invalidateCache();
    }
    
    return result.data;
  } catch (error) {
    console.error('Error saving repository:', error);
    throw error;
  }
};

// Get user's saved repositories
export const getSavedRepositories = async (filters = {}) => {
  try {
    let endpoint = '/api/repositories';
    
    if (filters.search) {
      endpoint = `/api/repositories/search/${encodeURIComponent(filters.search)}`;
    }
    
    const result = await apiCall(endpoint);
    let repositories = result.data;
    
    if (filters.tag) {
      repositories = repositories.filter(repo => 
        repo.tags && repo.tags.includes(filters.tag)
      );
    }
    
    return repositories;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

// Update repository
export const updateRepository = async (id, updates = {}, invalidateCache = null) => {
  try {
    const result = await apiCall(`/api/repositories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (invalidateCache) {
      invalidateCache();
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating repository:', error);
    throw error;
  }
};

// Delete repository
export const deleteRepository = async (id, invalidateCache = null) => {
  try {
    await apiCall(`/api/repositories/${id}`, {
      method: 'DELETE',
    });
    
    if (invalidateCache) {
      invalidateCache();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting repository:', error);
    throw error;
  }
};

// Get all unique tags
export const getAllTags = async () => {
  try {
    const repositories = await getSavedRepositories();
    const allTags = repositories.reduce((tags, repo) => {
      if (repo.tags && Array.isArray(repo.tags)) {
        repo.tags.forEach(tag => {
          if (tag && !tags.includes(tag)) {
            tags.push(tag);
          }
        });
      }
      return tags;
    }, []);
    
    return allTags.sort();
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
};

// Get repository by ID
export const getRepository = async (id) => {
  try {
    const result = await apiCall(`/api/repositories/${id}`);
    return result.data;
  } catch (error) {
    console.error('Error fetching repository:', error);
    throw error;
  }
};

// Legacy functions for backward compatibility
export const checkUserLimit = async () => {
  return { canAddMore: true, used: 0, limit: null };
};

export const updateUserLimit = async (increment = 1) => {
  return { canAddMore: true, used: 0, limit: null };
};

// Legacy function aliases
export const getUserTags = getAllTags;
export const getRepositoryById = getRepository;
export const refreshRepositoryData = getSavedRepositories;