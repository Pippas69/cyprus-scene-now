-- Add public RSVP viewing policy for attendee lists
-- This allows anyone to see RSVPs, but only for users with public profiles

CREATE POLICY "Public can view event RSVPs for public profiles"
ON public.rsvps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_preferences up
    WHERE up.user_id = rsvps.user_id
    AND up.profile_visibility = 'public'
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Public can view event RSVPs for public profiles" ON public.rsvps IS 
'Allows anyone to view RSVPs for event attendee lists, but only for users who have set their profile to public. Respects user privacy preferences.';