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
    const octokit = await createOctokit();
    
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });
    
    return data;
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
  return getStarredRepositories(page, perPage);
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
    const octokit = await createOctokit();
    
    const { data } = await octokit.search.repos({
      q: query,
      per_page: 10,
    });
    
    return data.items;
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
