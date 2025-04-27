-- Create premium_notifications table
CREATE TABLE premium_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  
  -- Add constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster lookups on email
CREATE INDEX premium_notifications_email_idx ON premium_notifications(email);

-- Create index for user lookup
CREATE INDEX premium_notifications_user_id_idx ON premium_notifications(user_id);

-- Add row-level security policies
ALTER TABLE premium_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own notification requests
CREATE POLICY "Users can add their email" 
ON premium_notifications FOR INSERT 
TO authenticated 
WITH CHECK (
  email = auth.jwt() ->> 'email' OR 
  user_id = auth.uid()
);

-- Policy: Only allow users to see their own notifications
CREATE POLICY "Users can view their own notifications" 
ON premium_notifications FOR SELECT 
TO authenticated 
USING (
  email = auth.jwt() ->> 'email' OR 
  user_id = auth.uid()
);

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access" 
ON premium_notifications 
TO service_role 
USING (true);

-- Create unique constraint to prevent duplicate emails
ALTER TABLE premium_notifications 
ADD CONSTRAINT unique_email_constraint UNIQUE (email);

-- Comment on table
COMMENT ON TABLE premium_notifications IS 'Stores email addresses of users who want to be notified when the premium plan is available';