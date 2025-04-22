-- Create saved_repositories table
CREATE TABLE saved_repositories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  description TEXT,
  stars INTEGER,
  language TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX saved_repositories_user_id_idx ON saved_repositories(user_id);

-- Enable Row Level Security
ALTER TABLE saved_repositories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only allow users to select their own repositories
CREATE POLICY "Users can view their own repositories" 
  ON saved_repositories 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only allow users to insert their own repositories
CREATE POLICY "Users can insert their own repositories" 
  ON saved_repositories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Only allow users to update their own repositories
CREATE POLICY "Users can update their own repositories" 
  ON saved_repositories 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Only allow users to delete their own repositories
CREATE POLICY "Users can delete their own repositories" 
  ON saved_repositories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to get total count of repositories per user
CREATE OR REPLACE FUNCTION get_user_repository_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM saved_repositories WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_repositories_updated_at
BEFORE UPDATE ON saved_repositories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();