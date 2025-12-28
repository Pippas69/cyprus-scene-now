-- Add public SELECT policy for verified businesses
-- This allows anyone to view business profiles for verified businesses
-- which is needed for events, reservations, and public business pages to work
CREATE POLICY "Anyone can view verified businesses" ON businesses
FOR SELECT USING (verified = true);