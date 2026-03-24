CREATE OR REPLACE FUNCTION merge_ghost_crm_profiles()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Build the full name from the new profile
  v_full_name := LOWER(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  
  -- Skip if no meaningful name
  IF v_full_name = '' OR v_full_name = ' ' THEN
    RETURN NEW;
  END IF;

  -- Update ghost CRM guests: link user_id and change profile_type
  -- Match by normalized name (case-insensitive)
  UPDATE public.crm_guests
  SET 
    user_id = NEW.id,
    profile_type = 'linked',
    email = COALESCE(crm_guests.email, NEW.email),
    updated_at = now()
  WHERE 
    profile_type = 'ghost'
    AND user_id IS NULL
    AND LOWER(TRIM(guest_name)) = v_full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;