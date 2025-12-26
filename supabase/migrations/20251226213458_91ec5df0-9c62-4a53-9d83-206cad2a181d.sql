-- Add new columns to events table for enhanced event creation
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS performers TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS parking_info TEXT,
ADD COLUMN IF NOT EXISTS accessibility_info TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS external_ticket_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS venue_name TEXT,
ADD COLUMN IF NOT EXISTS is_indoor BOOLEAN DEFAULT TRUE;