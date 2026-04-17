
-- Function 1: Record a click on a promoter link with anti-fraud
-- - Increments clicks_count only if NOT a self-click
-- - Stores click record with session_id for later last-click attribution
-- - Anti-fraud: if the visitor's user_id == promoter_user_id, mark as self_click and don't count
CREATE OR REPLACE FUNCTION public.record_promoter_click(
  _tracking_code text,
  _session_id text,
  _user_id uuid DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
  v_promoter_user_id uuid;
  v_business_id uuid;
  v_event_id uuid;
  v_active boolean;
  v_is_self boolean := false;
  v_recent_click_id uuid;
BEGIN
  -- Find the link
  SELECT id, promoter_user_id, business_id, event_id, active
    INTO v_link_id, v_promoter_user_id, v_business_id, v_event_id, v_active
  FROM public.promoter_links
  WHERE tracking_code = _tracking_code
  LIMIT 1;

  IF v_link_id IS NULL OR v_active IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_or_inactive_link');
  END IF;

  -- Anti-fraud: self-click
  IF _user_id IS NOT NULL AND _user_id = v_promoter_user_id THEN
    v_is_self := true;
  END IF;

  -- Deduplication: if same session clicked the same link in last 30 minutes, skip increment
  SELECT id INTO v_recent_click_id
  FROM public.promoter_link_clicks
  WHERE link_id = v_link_id
    AND session_id = _session_id
    AND clicked_at > now() - interval '30 minutes'
  LIMIT 1;

  IF v_recent_click_id IS NOT NULL THEN
    -- Refresh expiry (extend the attribution window from now)
    UPDATE public.promoter_link_clicks
       SET expires_at = now() + interval '30 days',
           user_id = COALESCE(user_id, _user_id)
     WHERE id = v_recent_click_id;

    RETURN jsonb_build_object(
      'success', true,
      'counted', false,
      'reason', 'duplicate_within_30min',
      'link_id', v_link_id
    );
  END IF;

  -- Insert click record
  INSERT INTO public.promoter_link_clicks (
    link_id, session_id, user_id, user_agent, is_self_click
  ) VALUES (
    v_link_id, _session_id, _user_id, _user_agent, v_is_self
  );

  -- Increment counter only if NOT self-click
  IF NOT v_is_self THEN
    UPDATE public.promoter_links
       SET clicks_count = clicks_count + 1,
           updated_at = now()
     WHERE id = v_link_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'counted', NOT v_is_self,
    'is_self_click', v_is_self,
    'link_id', v_link_id,
    'event_id', v_event_id,
    'business_id', v_business_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_promoter_click(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_promoter_click(text, text, uuid, text) TO anon, authenticated;


-- Function 2: Attribute a purchase to a promoter (last-click within 30 days)
-- Looks up the most recent NON-self click for given session_id (or user_id) on a link
-- belonging to the same business as the purchase, within 30 days, then creates an
-- attribution row with computed commission.
CREATE OR REPLACE FUNCTION public.attribute_promoter_purchase(
  _business_id uuid,
  _event_id uuid,
  _session_id text,
  _customer_user_id uuid DEFAULT NULL,
  _ticket_order_id uuid DEFAULT NULL,
  _reservation_id uuid DEFAULT NULL,
  _order_amount_cents integer DEFAULT 0,
  _customer_name text DEFAULT NULL,
  _customer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_click record;
  v_app record;
  v_commission_cents integer := 0;
  v_attr_id uuid;
  v_is_ticket boolean;
BEGIN
  IF _ticket_order_id IS NULL AND _reservation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_target');
  END IF;

  v_is_ticket := _ticket_order_id IS NOT NULL;

  -- Find the most recent valid click (last-click attribution) for this session
  -- on a link belonging to this business, within 30-day window, NOT self-click.
  SELECT c.*, pl.promoter_user_id, pl.id AS link_id, pl.business_id AS link_business_id
    INTO v_click
  FROM public.promoter_link_clicks c
  JOIN public.promoter_links pl ON pl.id = c.link_id
  WHERE c.is_self_click = false
    AND c.expires_at > now()
    AND pl.business_id = _business_id
    AND (
      c.session_id = _session_id
      OR (_customer_user_id IS NOT NULL AND c.user_id = _customer_user_id)
    )
  ORDER BY c.clicked_at DESC
  LIMIT 1;

  IF v_click IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_valid_click');
  END IF;

  -- Anti-fraud: customer must not be the promoter
  IF _customer_user_id IS NOT NULL AND _customer_user_id = v_click.promoter_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_purchase');
  END IF;

  -- Get the active commission terms from accepted application
  SELECT commission_type, commission_fixed_ticket_cents,
         commission_fixed_reservation_cents, commission_percent
    INTO v_app
  FROM public.promoter_applications
  WHERE promoter_user_id = v_click.promoter_user_id
    AND business_id = _business_id
    AND status = 'accepted'
  LIMIT 1;

  IF v_app IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_agreement');
  END IF;

  -- Compute commission based on agreement type
  IF v_app.commission_type = 'fixed' THEN
    IF v_is_ticket THEN
      v_commission_cents := COALESCE(v_app.commission_fixed_ticket_cents, 0);
    ELSE
      v_commission_cents := COALESCE(v_app.commission_fixed_reservation_cents, 0);
    END IF;
  ELSIF v_app.commission_type = 'percent' THEN
    v_commission_cents := FLOOR(COALESCE(_order_amount_cents, 0) * COALESCE(v_app.commission_percent, 0) / 100.0)::integer;
  ELSE
    v_commission_cents := 0;
  END IF;

  -- Insert attribution (UNIQUE constraints on ticket_order_id / reservation_id prevent dupes)
  BEGIN
    INSERT INTO public.promoter_attributions (
      promoter_user_id, business_id, promoter_link_id, event_id,
      ticket_order_id, reservation_id, customer_user_id,
      attribution_source, commission_type,
      commission_fixed_cents, commission_percent,
      order_amount_cents, commission_earned_cents,
      status, customer_name, customer_email
    ) VALUES (
      v_click.promoter_user_id, _business_id, v_click.link_id, _event_id,
      _ticket_order_id, _reservation_id, _customer_user_id,
      'link_click', v_app.commission_type,
      CASE WHEN v_app.commission_type = 'fixed' THEN v_commission_cents ELSE 0 END,
      CASE WHEN v_app.commission_type = 'percent' THEN v_app.commission_percent ELSE 0 END,
      COALESCE(_order_amount_cents, 0), v_commission_cents,
      'confirmed', _customer_name, _customer_email
    )
    RETURNING id INTO v_attr_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_attributed');
  END;

  -- Increment conversions on the link
  UPDATE public.promoter_links
     SET conversions_count = conversions_count + 1,
         updated_at = now()
   WHERE id = v_click.link_id;

  RETURN jsonb_build_object(
    'success', true,
    'attribution_id', v_attr_id,
    'promoter_user_id', v_click.promoter_user_id,
    'commission_earned_cents', v_commission_cents
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_promoter_purchase(uuid, uuid, text, uuid, uuid, uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribute_promoter_purchase(uuid, uuid, text, uuid, uuid, uuid, integer, text, text) TO service_role;
