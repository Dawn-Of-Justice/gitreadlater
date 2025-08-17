const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

// Middleware with security enhancements
app.use(cors({
  origin: ['https://gitreadlater.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Basic rate limiting
const rateLimit = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimit[ip]) {
    rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
  } else if (now > rateLimit[ip].resetTime) {
    rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
  } else {
    rateLimit[ip].count++;
  }
  
  if (rateLimit[ip].count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  next();
};

app.use(rateLimitMiddleware);

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Add user and user-context client to request object
    req.user = user;
    req.userSupabase = createUserClient(token);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional authentication middleware (allows both authenticated and anonymous access)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.userSupabase = createUserClient(token);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

// Supabase client (using environment variables)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Add service role key

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create base client with anon key for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create service role client for admin operations (bypasses RLS)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Helper function to create user-context client
const createUserClient = (accessToken) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ReadLater Backend API - Open Source Version',
    version: '1.0.0'
  });
});

// Health check for monitoring
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Repository endpoints (basic CRUD operations)
app.get('/api/repositories', optionalAuth, async (req, res) => {
  try {
    // If user is authenticated, use user-context client and show only their repos
    if (req.user && req.userSupabase) {
      const { data, error } = await req.userSupabase
        .from('saved_repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching repositories:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ data });
    } else {
      // Return empty array for unauthenticated users
      res.json({ data: [] });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository by ID
app.get('/api/repositories/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only see their own repositories
    if (!req.user || !req.userSupabase) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { data, error } = await req.userSupabase
      .from('saved_repositories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Repository not found or access denied' });
      }
      console.error('Error fetching repository:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save repository
app.post('/api/repositories', authenticateUser, async (req, res) => {
  try {
    const { repo_url, repo_owner, repo_name, description, tags, stars, language, notes } = req.body;
    const user_id = req.user.id; // Get user ID from authenticated user

    if (!repo_url) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Validate URL format
    try {
      new URL(repo_url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const { data, error } = await req.userSupabase
      .from('saved_repositories')
      .insert([{
        repo_url: repo_url.trim(),
        repo_owner: repo_owner || '',
        repo_name: repo_name || '',
        description: description?.trim() || null,
        stars: stars || 0,
        language: language || null,
        notes: notes?.trim() || '',
        tags: Array.isArray(tags) ? tags : [],
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving repository:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update repository
app.put('/api/repositories/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, notes, tags } = req.body;
    const user_id = req.user.id;

    // With user-context client, we can directly update - RLS will ensure user owns the repo
    const { data, error } = await req.userSupabase
      .from('saved_repositories')
      .update({
        description: description?.trim() || null,
        notes: notes?.trim() || '',
        tags: Array.isArray(tags) ? tags : [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Repository not found or access denied' });
      }
      console.error('Error updating repository:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete repository
app.delete('/api/repositories/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // With user-context client, we can directly delete - RLS will ensure user owns the repo
    const { error } = await req.userSupabase
      .from('saved_repositories')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Repository not found or access denied' });
      }
      console.error('Error deleting repository:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Repository deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search repositories
app.get('/api/repositories/search/:query', optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    if (!req.user || !req.userSupabase) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const searchTerm = query.trim();
    const { data, error } = await req.userSupabase
      .from('saved_repositories')
      .select('*')
      .or(`repo_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching repositories:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own repositories
app.get('/api/user/repositories', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user repositories:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    
    // Get repository count for the user
    const { count, error } = await supabase
      .from('repositories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching repository count:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
        repository_count: count
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 ReadLater Backend running on port ${port}`);
  console.log(`📚 Open Source Repository Manager`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
});

module.exports = app;
