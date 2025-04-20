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

// Get README content
export const getReadmeContent = async (owner, repo) => {
  try {
    const octokit = await createOctokit();
    
    const { data } = await octokit.repos.getReadme({
      owner,
      repo,
    });
    
    // Decode content from base64
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    
    return {
      content,
      url: data.html_url,
    };
  } catch (error) {
    console.error('Error fetching README:', error);
    return null; // README might not exist
  }
};
