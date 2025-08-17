const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client (using environment variables)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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
app.get('/api/repositories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repositories:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository by ID
app.get('/api/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching repository:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save repository
app.post('/api/repositories', async (req, res) => {
  try {
    const { url, title, description, tags, user_id, is_private } = req.body;

    if (!url || !user_id) {
      return res.status(400).json({ error: 'URL and user_id are required' });
    }

    const { data, error } = await supabase
      .from('repositories')
      .insert([{
        url,
        title,
        description,
        tags: tags || [],
        user_id,
        is_private: is_private || false,
        created_at: new Date().toISOString()
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
app.put('/api/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, is_private } = req.body;

    const { data, error } = await supabase
      .from('repositories')
      .update({
        title,
        description,
        tags,
        is_private,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
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
app.delete('/api/repositories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);

    if (error) {
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
app.get('/api/repositories/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { user_id } = req.query;

    let supabaseQuery = supabase
      .from('repositories')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,url.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (user_id) {
      supabaseQuery = supabaseQuery.eq('user_id', user_id);
    }

    const { data, error } = await supabaseQuery;

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
