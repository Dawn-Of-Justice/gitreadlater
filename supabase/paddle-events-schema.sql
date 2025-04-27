-- Create paddle_events table to track webhook events
CREATE TABLE paddle_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  paddle_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX paddle_events_paddle_event_id_idx ON paddle_events(paddle_event_id);