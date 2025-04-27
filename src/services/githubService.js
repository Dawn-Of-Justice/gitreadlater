import { Octokit } from '@octokit/rest';
import { supabase } from '../lib/supabaseClient';

// Create Octokit instance with user's access token
const createOctokit = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No authenticated session found');
  }
  
  const token = session.provider_token;
  
  if (!token) {
    throw new Error('No GitHub token found');
  }
  
  return new Octokit({ auth: token });
};

// Get a repository's details
export const getRepositoryDetails = async (owner, repo) => {
  try {
    // Get GitHub token from Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    const githubToken = session?.provider_token;
    
    // Set up headers with authorization if token exists
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch repository details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching repository details:', error);
    throw error;
  }
};

// Get user's starred repositories
export const getStarredRepositories = async (page = 1, perPage = 30) => {
  try {
    const octokit = await createOctokit();
    
    const { data } = await octokit.activity.listReposStarredByAuthenticatedUser({
      per_page: perPage,
      page,
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching starred repositories:', error);
    throw error;
  }
};

export const getUserStarredRepos = async (page = 1, perPage = 30) => {
  try {
    // First check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      console.warn('No GitHub token found, using unauthenticated request');
      // You could return an empty array or try an unauthenticated request
      return [];
    }

    // Get the authenticatd user's username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      console.error('GitHub API error:', await userResponse.text());
      return [];
    }
    
    const userData = await userResponse.json();
    
    // Now get the starred repos with the token
    const reposResponse = await fetch(
      `https://api.github.com/users/${userData.login}/starred?page=${page}&per_page=${perPage}`, 
      {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!reposResponse.ok) {
      console.error('GitHub API error:', await reposResponse.text());
      return [];
    }

    return await reposResponse.json();
  } catch (error) {
    console.error('Error in getUserStarredRepos:', error);
    return [];
  }
};

// Parse GitHub URL to extract owner and repo
export const parseGitHubUrl = (url) => {
  try {
    const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(githubRegex);
    
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    return {
      owner: match[1],
      repo: match[2].split('#')[0].split('?')[0], // Remove any hash or query params
    };
  } catch (error) {
    console.error('Error parsing GitHub URL:', error);
    throw error;
  }
};

// Search repositories (needed for SaveRepository.jsx)
export const searchRepositories = async (query) => {
  try {
    // Get GitHub token
    const { data: { session } } = await supabase.auth.getSession();
    const githubToken = session?.provider_token;
    
    // Set up headers with authorization
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const response = await fetch(`https://api.github.com/search/repositories?q=${query}`, {
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to search repositories');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error searching repositories:', error);
    throw error;
  }
};

// Helper function for Base64 decoding in browser
const decodeBase64 = (str) => {
  // Clean the string (remove newlines that might be present in GitHub responses)
  const cleanedStr = str.replace(/\n/g, '');
  
  // First, get binary data from base64
  const binaryStr = atob(cleanedStr);
  
  // Then convert to UTF-8
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  
  // Use TextDecoder to properly handle UTF-8
  return new TextDecoder().decode(bytes);
};

export const getReadmeContent = async (owner, repo) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
    
    if (!response.ok) {
      throw new Error('README not found');
    }
    
    const data = await response.json();
    
    // Use the helper function for Base64 decoding
    let content;
    if (data.encoding === 'base64') {
      content = decodeBase64(data.content);
    } else {
      content = data.content;
    }
    
    return {
      content,
      path: data.path
    };
  } catch (error) {
    console.error('Error fetching README:', error);
    throw error;
  }
};

// Add this function to your repository service
export const checkRepositoriesTableExists = async () => {
  try {
    // Try a count query which will fail if table doesn't exist
    const { count, error } = await supabase
      .from('repositories')
      .select('*', { count: 'exact', head: true })
      .limit(1);
      
    if (error && error.code === '42P01') {
      console.log('Repositories table does not exist');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking repositories table:', error);
    return false;
  }
};

// Update your repository fetching function
export const getUserRepositories = async (options = {}) => {
  const { page = 1, limit = 10, orderBy = 'created_at', ascending = false } = options;
  const startIndex = (page - 1) * limit;
  
  try {
    // First check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      console.warn('No GitHub token found, using unauthenticated request');
      return [];
    }

    // Get user's repositories from GitHub API directly
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.error('GitHub API error:', await response.text());
      return [];
    }
    
    const repos = await response.json();
    return repos; // Return the array directly
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return []; // Return empty array on error, not an object
  }
};
