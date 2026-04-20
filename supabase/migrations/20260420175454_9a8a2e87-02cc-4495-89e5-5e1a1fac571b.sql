
DO $$
DECLARE
  biz_id uuid := 'f39d1fff-32bb-40d0-b00f-8194178bab97';
  ev_ids uuid[];
  res_ids uuid[];
  ticket_order_ids uuid[];
  guest_ids uuid[];
  post_ids uuid[];
  boost_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO ev_ids FROM events WHERE business_id = biz_id;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO res_ids FROM reservations WHERE event_id = ANY(ev_ids);
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO ticket_order_ids FROM ticket_orders WHERE event_id = ANY(ev_ids);
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO guest_ids FROM crm_guests WHERE business_id = biz_id;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO post_ids FROM business_posts WHERE business_id = biz_id;
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO boost_ids FROM event_boosts WHERE event_id = ANY(ev_ids);

  DELETE FROM reservation_scans WHERE reservation_id = ANY(res_ids);
  DELETE FROM reservation_guests WHERE reservation_id = ANY(res_ids);
  DELETE FROM reservation_table_assignments WHERE reservation_id = ANY(res_ids) OR event_id = ANY(ev_ids);
  DELETE FROM reservation_zone_assignments WHERE reservation_id = ANY(res_ids);
  DELETE FROM reservation_no_shows WHERE reservation_id = ANY(res_ids) OR business_id = biz_id;
  DELETE FROM reservation_slot_closures WHERE business_id = biz_id;

  DELETE FROM commission_ledger WHERE business_id = biz_id OR reservation_id = ANY(res_ids) OR ticket_order_id = ANY(ticket_order_ids);

  DELETE FROM tickets WHERE event_id = ANY(ev_ids);
  DELETE FROM ticket_orders WHERE event_id = ANY(ev_ids);
  DELETE FROM ticket_tiers WHERE event_id = ANY(ev_ids);
  DELETE FROM reservations WHERE event_id = ANY(ev_ids);
  DELETE FROM reservation_seating_types WHERE event_id = ANY(ev_ids);

  DELETE FROM crm_guest_tag_assignments WHERE guest_id = ANY(guest_ids);
  DELETE FROM crm_guest_notes WHERE guest_id = ANY(guest_ids) OR business_id = biz_id;
  DELETE FROM crm_communication_log WHERE guest_id = ANY(guest_ids) OR business_id = biz_id;

  DELETE FROM business_post_likes WHERE post_id = ANY(post_ids);
  DELETE FROM business_post_views WHERE post_id = ANY(post_ids);
  DELETE FROM business_post_poll_votes WHERE post_id = ANY(post_ids);

  DELETE FROM boost_analytics WHERE boost_id = ANY(boost_ids) OR event_id = ANY(ev_ids);

  DELETE FROM event_invitations WHERE event_id = ANY(ev_ids);
  DELETE FROM event_boosts WHERE event_id = ANY(ev_ids);
  DELETE FROM event_views WHERE event_id = ANY(ev_ids);
  DELETE FROM event_floor_plans WHERE event_id = ANY(ev_ids);
  DELETE FROM event_posts WHERE event_id = ANY(ev_ids);
  DELETE FROM rsvps WHERE event_id = ANY(ev_ids);
  DELETE FROM business_posts WHERE business_id = biz_id;
  DELETE FROM notifications WHERE entity_type = 'event' AND entity_id = ANY(ev_ids);

  DELETE FROM discount_items WHERE discount_id IN (SELECT id FROM discounts WHERE business_id = biz_id);
  DELETE FROM discount_scans WHERE discount_id IN (SELECT id FROM discounts WHERE business_id = biz_id);
  DELETE FROM discount_views WHERE discount_id IN (SELECT id FROM discounts WHERE business_id = biz_id);
  DELETE FROM discounts WHERE business_id = biz_id;

  DELETE FROM crm_guests WHERE business_id = biz_id;
  DELETE FROM crm_guest_tags WHERE business_id = biz_id;

  DELETE FROM events WHERE business_id = biz_id;
END $$;
