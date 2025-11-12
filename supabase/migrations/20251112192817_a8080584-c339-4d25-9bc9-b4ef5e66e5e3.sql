-- Create index for faster count queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status ON rsvps(event_id, status);