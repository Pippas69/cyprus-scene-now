-- Create trigger function to update daily analytics in real-time
CREATE OR REPLACE FUNCTION update_daily_analytics_realtime()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id uuid;
  v_date date;
BEGIN
  -- Determine business_id and date based on the table
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

  -- Skip if business_id is null
  IF v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert or update daily analytics
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

  -- Update the specific metric
  IF TG_TABLE_NAME = 'event_views' THEN
    UPDATE daily_analytics
    SET 
      total_event_views = total_event_views + 1,
      unique_event_viewers = (
        SELECT COUNT(DISTINCT user_id)
        FROM event_views ev
        JOIN events e ON e.id = ev.event_id
        WHERE e.business_id = v_business_id
          AND ev.viewed_at::date = v_date
      ),
      updated_at = now()
    WHERE business_id = v_business_id AND date = v_date;
    
  ELSIF TG_TABLE_NAME = 'discount_views' THEN
    UPDATE daily_analytics
    SET 
      total_discount_views = total_discount_views + 1,
      unique_discount_viewers = (
        SELECT COUNT(DISTINCT user_id)
        FROM discount_views dv
        JOIN discounts d ON d.id = dv.discount_id
        WHERE d.business_id = v_business_id
          AND dv.viewed_at::date = v_date
      ),
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
$$;

-- Create triggers on all tracking tables
DROP TRIGGER IF EXISTS event_views_analytics_trigger ON event_views;
CREATE TRIGGER event_views_analytics_trigger
  AFTER INSERT ON event_views
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();

DROP TRIGGER IF EXISTS discount_views_analytics_trigger ON discount_views;
CREATE TRIGGER discount_views_analytics_trigger
  AFTER INSERT ON discount_views
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();

DROP TRIGGER IF EXISTS business_followers_analytics_trigger ON business_followers;
CREATE TRIGGER business_followers_analytics_trigger
  AFTER INSERT OR UPDATE ON business_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();

DROP TRIGGER IF EXISTS rsvps_analytics_trigger ON rsvps;
CREATE TRIGGER rsvps_analytics_trigger
  AFTER INSERT ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();

DROP TRIGGER IF EXISTS reservations_analytics_trigger ON reservations;
CREATE TRIGGER reservations_analytics_trigger
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();

DROP TRIGGER IF EXISTS redemptions_analytics_trigger ON redemptions;
CREATE TRIGGER redemptions_analytics_trigger
  AFTER INSERT ON redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_analytics_realtime();