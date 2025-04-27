-- Create health_check table
CREATE TABLE public.health_check (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version TEXT,
    notes TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;

-- Allow service role to access the table (for health checks)
CREATE POLICY "Service role can access health check" 
    ON public.health_check
    FOR ALL
    TO service_role
    USING (true);

-- Insert initial record for health checks to query
INSERT INTO public.health_check (status, version, notes)
VALUES ('ok', '1.0', 'Initial health check record');

-- Grant permissions
GRANT SELECT ON public.health_check TO service_role;
GRANT SELECT ON public.health_check TO anon;