-- Add indexes for better query performance on events and businesses
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_end_at ON events(end_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON events USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_businesses_geo ON businesses USING GIST(geo);