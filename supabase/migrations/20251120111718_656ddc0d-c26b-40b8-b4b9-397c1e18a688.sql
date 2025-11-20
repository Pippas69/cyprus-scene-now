-- Add feed_view_mode column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN feed_view_mode text DEFAULT 'card' CHECK (feed_view_mode IN ('card', 'compact'));