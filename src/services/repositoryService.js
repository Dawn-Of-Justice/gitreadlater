import { supabase } from '../lib/supabaseClient';
import { getRepositoryDetails, parseGitHubUrl } from './githubService';
import { canSaveRepository } from './subscriptionService';

// Add similar flags at the top of the file
let loggedRepoCache = false;
let loggedRepoFetch = false;
let loggedTagCache = false;
let loggedTagFetch = false;

// In your repositoryService.js
// Add a cache for the repositories table existence check
let repositoriesTableExists = null; // null = unknown, true/false = checked

export const checkRepositoriesTableExists = async () => {
  // Return cached result if available
  if (repositoriesTableExists !== null) {
    return repositoriesTableExists;
  }
  
  try {
    // Try a count query which will fail if table doesn't exist
    const { count, error } = await supabase
      .from('repositories')
      .select('*', { count: 'exact', head: true })
      .limit(1);
      
    if (error && error.code === '42P01') {
      console.log('Repositories table does not exist');
      repositoriesTableExists = false;
      return false;
    }
    
    repositoriesTableExists = true;
    return true;
  } catch (error) {
    console.error('Error checking repositories table:', error);
    // Assume table exists on error to avoid blocking UI
    repositoriesTableExists = true;
    return true;
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
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Check if user can save more repositories based on their subscription
    const canSave = await canSaveRepository();
    
    if (!canSave) {
      throw new Error('Repository limit reached for your plan. Please upgrade to save more repositories.');
    }
    
    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(url);
    
    // Get repository details from GitHub API
    const repoDetails = await getRepositoryDetails(owner, repo);
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('saved_repositories')
      .insert([
        {
          user_id: user.id,
          repo_owner: owner,
          repo_name: repo,
          repo_url: repoDetails.html_url,
          description: repoDetails.description,
          stars: repoDetails.stargazers_count,
          language: repoDetails.language,
          notes,
          tags,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ])
      .select();
    
    if (error) throw error;
    
    // Invalidate repositories cache after saving a new one
    if (invalidateCache) {
      invalidateCache();
    }
    
    const savedRepo = data[0];
    
    // Return the data and a success flag
    return { data: savedRepo, success: true };
  } catch (error) {
    console.error('Error saving repository:', error);
    return { error: error.message, success: false };
  }
};

// Get user's saved repositories
export const getSavedRepositories = async (filters = {}, cachedRepos = [], setCachedRepos = null) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // If we have filters, we need to get fresh data from the database
    // If we have cached repositories and no filters, return the cached data
    if (cachedRepos.length > 0 && !filters.tag && !filters.search) {
      if (!loggedRepoCache) {
        console.log('Using cached repositories');
        loggedRepoCache = true;
        setTimeout(() => { loggedRepoCache = false; }, 1000);
      }
      return cachedRepos;
    }
    
    if (!loggedRepoFetch) {
      console.log('Fetching repositories from database');
      loggedRepoFetch = true;
      setTimeout(() => { loggedRepoFetch = false; }, 1000);
    }
    
    let query = supabase
      .from('saved_repositories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }
    
    if (filters.search) {
      query = query.or(`repo_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Update cache if we're getting all repositories
    if (!filters.tag && !filters.search && setCachedRepos) {
      setCachedRepos(data);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting saved repositories:', error);
    throw error;
  }
};

// Update repository notes and tags
export const updateRepository = async (id, updates = {}, invalidateCache = null) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Prepare update object
    const updateData = {
      updated_at: new Date(),
    };
    
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }
    
    if (updates.tags !== undefined) {
      updateData.tags = updates.tags;
    }
    
    // Update in Supabase
    const { data, error } = await supabase
      .from('saved_repositories')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this record
      .select();
    
    if (error) throw error;
    
    // Invalidate cache since we updated a repository
    if (invalidateCache) {
      invalidateCache();
    }
    
    return data[0];
  } catch (error) {
    console.error('Error updating repository:', error);
    throw error;
  }
};

// Delete repository
export const deleteRepository = async (id, invalidateCache = null) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('saved_repositories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns this record
    
    if (error) throw error;
    
    // Invalidate cache after deletion
    if (invalidateCache) {
      invalidateCache();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting repository:', error);
    throw error;
  }
};

// Get unique tags used by the user
export const getUserTags = async (cachedTags = [], setCachedTags = null) => {
  try {
    // If we have cached tags, return them
    if (cachedTags.length > 0) {
      if (!loggedTagCache) {
        console.log('Using cached tags');
        loggedTagCache = true;
        setTimeout(() => { loggedTagCache = false; }, 1000);
      }
      return cachedTags;
    }
    
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (!loggedTagFetch) {
      console.log('Fetching tags from database');
      loggedTagFetch = true;
      setTimeout(() => { loggedTagFetch = false; }, 1000);
    }
    
    const { data, error } = await supabase
      .from('saved_repositories')
      .select('tags')
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    // Extract unique tags
    const allTags = data.flatMap(repo => repo.tags || []);
    const uniqueTags = [...new Set(allTags)];
    
    // Update cache
    if (setCachedTags) {
      setCachedTags(uniqueTags);
    }
    
    return uniqueTags;
  } catch (error) {
    console.error('Error getting user tags:', error);
    throw error;
  }
};