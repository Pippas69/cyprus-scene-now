-- Fix: Update update_realtime_stats function to handle cascade deletes gracefully
CREATE OR REPLACE FUNCTION public.update_realtime_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_age INTEGER;
  user_birth_year INTEGER;
  user_birth_month INTEGER;
  target_event_id UUID;
  event_exists BOOLEAN;
BEGIN
  -- Determine which event_id to use
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  
  -- Check if event still exists (handles cascade deletes)
  SELECT EXISTS(SELECT 1 FROM public.events WHERE id = target_event_id)
  INTO event_exists;
  
  -- If event doesn't exist (being deleted), skip stats update
  IF NOT event_exists THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Upsert the realtime_stats row
  INSERT INTO public.realtime_stats (event_id)
  VALUES (target_event_id)
  ON CONFLICT (event_id) DO NOTHING;

  -- Update interested and going counts
  UPDATE public.realtime_stats
  SET
    interested_count = (SELECT COUNT(*) FROM public.rsvps WHERE event_id = target_event_id AND status = 'interested'),
    going_count = (SELECT COUNT(*) FROM public.rsvps WHERE event_id = target_event_id AND status = 'going'),
    updated_at = now()
  WHERE event_id = target_event_id;

  -- Get user age info for bucket update
  IF TG_OP = 'DELETE' THEN
    SELECT dob_year, dob_month INTO user_birth_year, user_birth_month
    FROM public.profiles WHERE id = OLD.user_id;
  ELSE
    SELECT dob_year, dob_month INTO user_birth_year, user_birth_month
    FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  -- Calculate approximate age if birth year exists
  IF user_birth_year IS NOT NULL THEN
    user_age := EXTRACT(YEAR FROM CURRENT_DATE) - user_birth_year;
    IF user_birth_month IS NOT NULL AND user_birth_month > EXTRACT(MONTH FROM CURRENT_DATE) THEN
      user_age := user_age - 1;
    END IF;

    -- Recalculate age buckets for this event
    UPDATE public.realtime_stats
    SET
      age_bucket_15_17 = (
        SELECT COUNT(*) FROM public.rsvps r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.event_id = target_event_id
        AND p.dob_year IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - p.dob_year) BETWEEN 15 AND 17
      ),
      age_bucket_18_24 = (
        SELECT COUNT(*) FROM public.rsvps r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.event_id = target_event_id
        AND p.dob_year IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - p.dob_year) BETWEEN 18 AND 24
      ),
      age_bucket_25_34 = (
        SELECT COUNT(*) FROM public.rsvps r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.event_id = target_event_id
        AND p.dob_year IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - p.dob_year) BETWEEN 25 AND 34
      ),
      age_bucket_35_44 = (
        SELECT COUNT(*) FROM public.rsvps r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.event_id = target_event_id
        AND p.dob_year IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - p.dob_year) BETWEEN 35 AND 44
      ),
      age_bucket_45_60 = (
        SELECT COUNT(*) FROM public.rsvps r
        JOIN public.profiles p ON r.user_id = p.id
        WHERE r.event_id = target_event_id
        AND p.dob_year IS NOT NULL
        AND (EXTRACT(YEAR FROM CURRENT_DATE) - p.dob_year) BETWEEN 45 AND 60
      )
    WHERE event_id = target_event_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;