-- =====================================================================
-- Trigger 1: update_daily_analytics_realtime
-- Replace heavy COUNT(DISTINCT) recalcs with simple +1 increments
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_daily_analytics_realtime()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_business_id uuid;
  v_date date;
BEGIN
  IF TG_TABLE_NAME = 'event_views' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.viewed_at::date;
    
  ELSIF TG_TABLE_NAME = 'discount_views' THEN
    SELECT d.business_id INTO v_business_id
    FROM discounts d
    WHERE d.id = NEW.discount_id;
    v_date := NEW.viewed_at::date;
    
  ELSIF TG_TABLE_NAME = 'business_followers' THEN
    v_business_id := NEW.business_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'rsvps' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    SELECT e.business_id INTO v_business_id
    FROM events e
    WHERE e.id = NEW.event_id;
    v_date := NEW.created_at::date;
    
  ELSIF TG_TABLE_NAME = 'redemptions' THEN
    SELECT d.business_id INTO v_business_id
    FROM discounts d
    WHERE d.id = NEW.discount_id;
    v_date := NEW.redeemed_at::date;
  END IF;

  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO daily_analytics (
    business_id,
    date,
    total_event_views,
    unique_event_viewers,
    total_discount_views,
    unique_discount_viewers,
    new_rsvps_interested,
    new_rsvps_going,
    new_reservations,
    discount_redemptions,
    new_followers,
    unfollows
  )
  VALUES (
    v_business_id,
    v_date,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (business_id, date) 
  DO NOTHING;

  IF TG_TABLE_NAME = 'event_views' THEN
    -- Incremental +1 only. Accurate unique count reconciled by scheduled
    -- update_daily_analytics job.
    UPDATE daily_analytics
    SET 
      total_event_views = total_event_views + 1,
      unique_event_viewers = unique_event_viewers + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'discount_views' THEN
    -- Incremental +1 only. Accurate unique count reconciled by scheduled
    -- update_daily_analytics job.
    UPDATE daily_analytics
    SET 
      total_discount_views = total_discount_views + 1,
      unique_discount_viewers = unique_discount_viewers + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'business_followers' THEN
    IF NEW.unfollowed_at IS NULL THEN
      UPDATE daily_analytics
      SET 
        new_followers = new_followers + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    ELSE
      UPDATE daily_analytics
      SET 
        unfollows = unfollows + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = NEW.unfollowed_at::date;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'rsvps' THEN
    IF NEW.status = 'interested' THEN
      UPDATE daily_analytics
      SET 
        new_rsvps_interested = new_rsvps_interested + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    ELSIF NEW.status = 'going' THEN
      UPDATE daily_analytics
      SET 
        new_rsvps_going = new_rsvps_going + 1,
        updated_at = now()
      WHERE business_id = v_business_id AND date = v_date;
    END IF;
    
  ELSIF TG_TABLE_NAME = 'reservations' THEN
    UPDATE daily_analytics
    SET 
      new_reservations = new_reservations + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'redemptions' THEN
    UPDATE daily_analytics
    SET 
      discount_redemptions = discount_redemptions + 1,
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
  END IF;

  RETURN NEW;
END;
$function$;


-- =====================================================================
-- Trigger 2: update_realtime_stats
-- Replace heavy recounts with incremental +1 / -1 adjustments per
-- operation (INSERT / DELETE / UPDATE), targeting only the affected
-- status counter and the affected age bucket.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_realtime_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_event_id UUID;
  event_exists BOOLEAN;

  old_birth_year INTEGER;
  old_birth_month INTEGER;
  new_birth_year INTEGER;
  new_birth_month INTEGER;
  old_age INTEGER;
  new_age INTEGER;
  old_bucket TEXT;
  new_bucket TEXT;

  -- Helper to resolve an age into the bucket column name
  bucket_for_age TEXT;
BEGIN
  -- Determine which event_id to use
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  -- Check if event still exists (handles cascade deletes)
  SELECT EXISTS(SELECT 1 FROM public.events WHERE id = target_event_id)
  INTO event_exists;

  IF NOT event_exists THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Upsert the realtime_stats row
  INSERT INTO public.realtime_stats (event_id)
  VALUES (target_event_id)
  ON CONFLICT (event_id) DO NOTHING;

  -- ===== Incremental status counters (interested_count / going_count) =====
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'interested' THEN
      UPDATE public.realtime_stats
      SET interested_count = interested_count + 1, updated_at = now()
      WHERE event_id = target_event_id;
    ELSIF NEW.status = 'going' THEN
      UPDATE public.realtime_stats
      SET going_count = going_count + 1, updated_at = now()
      WHERE event_id = target_event_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'interested' THEN
      UPDATE public.realtime_stats
      SET interested_count = GREATEST(interested_count - 1, 0), updated_at = now()
      WHERE event_id = target_event_id;
    ELSIF OLD.status = 'going' THEN
      UPDATE public.realtime_stats
      SET going_count = GREATEST(going_count - 1, 0), updated_at = now()
      WHERE event_id = target_event_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF OLD.status = 'interested' THEN
        UPDATE public.realtime_stats
        SET interested_count = GREATEST(interested_count - 1, 0), updated_at = now()
        WHERE event_id = target_event_id;
      ELSIF OLD.status = 'going' THEN
        UPDATE public.realtime_stats
        SET going_count = GREATEST(going_count - 1, 0), updated_at = now()
        WHERE event_id = target_event_id;
      END IF;

      IF NEW.status = 'interested' THEN
        UPDATE public.realtime_stats
        SET interested_count = interested_count + 1, updated_at = now()
        WHERE event_id = target_event_id;
      ELSIF NEW.status = 'going' THEN
        UPDATE public.realtime_stats
        SET going_count = going_count + 1, updated_at = now()
        WHERE event_id = target_event_id;
      END IF;
    END IF;
  END IF;

  -- ===== Incremental age-bucket adjustment =====
  -- Resolve OLD user's bucket
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    SELECT dob_year, dob_month INTO old_birth_year, old_birth_month
    FROM public.profiles WHERE id = OLD.user_id;

    IF old_birth_year IS NOT NULL THEN
      old_age := EXTRACT(YEAR FROM CURRENT_DATE) - old_birth_year;
      IF old_birth_month IS NOT NULL AND old_birth_month > EXTRACT(MONTH FROM CURRENT_DATE) THEN
        old_age := old_age - 1;
      END IF;

      old_bucket := CASE
        WHEN old_age BETWEEN 15 AND 17 THEN 'age_bucket_15_17'
        WHEN old_age BETWEEN 18 AND 24 THEN 'age_bucket_18_24'
        WHEN old_age BETWEEN 25 AND 34 THEN 'age_bucket_25_34'
        WHEN old_age BETWEEN 35 AND 44 THEN 'age_bucket_35_44'
        WHEN old_age BETWEEN 45 AND 60 THEN 'age_bucket_45_60'
        ELSE NULL
      END;
    END IF;
  END IF;

  -- Resolve NEW user's bucket
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT dob_year, dob_month INTO new_birth_year, new_birth_month
    FROM public.profiles WHERE id = NEW.user_id;

    IF new_birth_year IS NOT NULL THEN
      new_age := EXTRACT(YEAR FROM CURRENT_DATE) - new_birth_year;
      IF new_birth_month IS NOT NULL AND new_birth_month > EXTRACT(MONTH FROM CURRENT_DATE) THEN
        new_age := new_age - 1;
      END IF;

      new_bucket := CASE
        WHEN new_age BETWEEN 15 AND 17 THEN 'age_bucket_15_17'
        WHEN new_age BETWEEN 18 AND 24 THEN 'age_bucket_18_24'
        WHEN new_age BETWEEN 25 AND 34 THEN 'age_bucket_25_34'
        WHEN new_age BETWEEN 35 AND 44 THEN 'age_bucket_35_44'
        WHEN new_age BETWEEN 45 AND 60 THEN 'age_bucket_45_60'
        ELSE NULL
      END;
    END IF;
  END IF;

  -- Apply bucket deltas: only the affected bucket(s) are touched.
  IF TG_OP = 'INSERT' AND new_bucket IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.realtime_stats SET %I = %I + 1, updated_at = now() WHERE event_id = $1',
      new_bucket, new_bucket
    ) USING target_event_id;

  ELSIF TG_OP = 'DELETE' AND old_bucket IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.realtime_stats SET %I = GREATEST(%I - 1, 0), updated_at = now() WHERE event_id = $1',
      old_bucket, old_bucket
    ) USING target_event_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only adjust if the bucket changed (e.g., user switched accounts unlikely,
    -- but covers any future age/profile change). Same-bucket updates are no-ops.
    IF old_bucket IS DISTINCT FROM new_bucket THEN
      IF old_bucket IS NOT NULL THEN
        EXECUTE format(
          'UPDATE public.realtime_stats SET %I = GREATEST(%I - 1, 0), updated_at = now() WHERE event_id = $1',
          old_bucket, old_bucket
        ) USING target_event_id;
      END IF;
      IF new_bucket IS NOT NULL THEN
        EXECUTE format(
          'UPDATE public.realtime_stats SET %I = %I + 1, updated_at = now() WHERE event_id = $1',
          new_bucket, new_bucket
        ) USING target_event_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;