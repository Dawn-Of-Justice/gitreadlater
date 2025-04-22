import { supabase } from '../lib/supabaseClient';
import { getRepositoryDetails, parseGitHubUrl } from './githubService';
import { canSaveRepository } from './subscriptionService';

// Get current user
const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session.user;
};

// Save repository to user's collection
export const saveRepository = async (url, notes = '', tags = []) => {
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
    
    return data[0];
  } catch (error) {
    console.error('Error saving repository:', error);
    throw error;
  }
};

// Get user's saved repositories
export const getSavedRepositories = async (filters = {}) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
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
    
    return data;
  } catch (error) {
    console.error('Error getting saved repositories:', error);
    throw error;
  }
};

// Update repository notes and tags
export const updateRepository = async (id, updates = {}) => {
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
    
    return data[0];
  } catch (error) {
    console.error('Error updating repository:', error);
    throw error;
  }
};

// Delete repository
export const deleteRepository = async (id) => {
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
    
    return true;
  } catch (error) {
    console.error('Error deleting repository:', error);
    throw error;
  }
};

// Get unique tags used by the user
export const getUserTags = async () => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('saved_repositories')
      .select('tags')
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    // Extract unique tags
    const allTags = data.flatMap(repo => repo.tags || []);
    const uniqueTags = [...new Set(allTags)];
    
    return uniqueTags;
  } catch (error) {
    console.error('Error getting user tags:', error);
    throw error;
  }
};