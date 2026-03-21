
-- Function to auto-merge ghost CRM profiles when a user signs up
-- Matches by normalized name (first_name + last_name) and optionally phone
CREATE OR REPLACE FUNCTION public.merge_ghost_crm_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_full_name text;
  v_phone text;
BEGIN
  -- Build the full name from the new profile
  v_full_name := LOWER(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  v_phone := NEW.phone;
  
  -- Skip if no meaningful name
  IF v_full_name = '' OR v_full_name = ' ' THEN
    RETURN NEW;
  END IF;

  -- Update ghost CRM guests: link user_id and change profile_type
  -- Match by normalized name (case-insensitive)
  -- If the ghost also has a phone, it must match too
  UPDATE public.crm_guests
  SET 
    user_id = NEW.id,
    profile_type = 'linked',
    email = COALESCE(crm_guests.email, NEW.email),
    updated_at = now()
  WHERE 
    profile_type = 'ghost'
    AND user_id IS NULL
    AND LOWER(TRIM(guest_name)) = v_full_name
    AND (
      -- If ghost has no phone, match by name only
      phone IS NULL 
      OR phone = '' 
      -- If ghost has phone and new user has phone, they must match
      OR (v_phone IS NOT NULL AND v_phone != '' AND 
          REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = 
          REPLACE(REPLACE(REPLACE(REPLACE(v_phone, ' ', ''), '-', ''), '(', ''), ')', ''))
    );

  RETURN NEW;
END;
$$;

-- Trigger: run after a profile is created (which happens on signup)
DROP TRIGGER IF EXISTS on_profile_created_merge_ghosts ON public.profiles;
CREATE TRIGGER on_profile_created_merge_ghosts
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.merge_ghost_crm_profiles();
