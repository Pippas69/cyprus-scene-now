
-- Delete all data for user mklifts04@gmail.com (id: 097e0f45-c11f-4924-a2fe-eae9d5877d27)
DO $$
DECLARE
  uid UUID := '097e0f45-c11f-4924-a2fe-eae9d5877d27';
  order_ids UUID[];
  res_ids UUID[];
  conv_ids UUID[];
BEGIN
  -- Get ticket order IDs
  SELECT COALESCE(array_agg(id), '{}') INTO order_ids FROM ticket_orders WHERE user_id = uid;
  IF array_length(order_ids, 1) > 0 THEN
    DELETE FROM tickets WHERE order_id = ANY(order_ids);
    DELETE FROM ticket_orders WHERE id = ANY(order_ids);
  END IF;

  -- Get reservation IDs
  SELECT COALESCE(array_agg(id), '{}') INTO res_ids FROM reservations WHERE user_id = uid;
  IF array_length(res_ids, 1) > 0 THEN
    DELETE FROM reservation_guests WHERE reservation_id = ANY(res_ids);
    DELETE FROM reservations WHERE id = ANY(res_ids);
  END IF;

  -- Conversations
  SELECT COALESCE(array_agg(conversation_id), '{}') INTO conv_ids FROM conversation_participants WHERE user_id = uid;
  DELETE FROM conversation_participants WHERE user_id = uid;
  IF array_length(conv_ids, 1) > 0 THEN
    DELETE FROM direct_messages WHERE conversation_id = ANY(conv_ids);
    DELETE FROM conversations WHERE id = ANY(conv_ids);
  END IF;

  -- User-level tables
  DELETE FROM notifications WHERE user_id = uid;
  DELETE FROM notification_log WHERE user_id = uid;
  DELETE FROM favorites WHERE user_id = uid;
  DELETE FROM favorite_discounts WHERE user_id = uid;
  DELETE FROM rsvps WHERE user_id = uid;
  DELETE FROM event_views WHERE user_id = uid;
  DELETE FROM business_post_likes WHERE user_id = uid;
  DELETE FROM business_post_poll_votes WHERE user_id = uid;
  DELETE FROM business_post_views WHERE user_id = uid;
  DELETE FROM discount_views WHERE user_id = uid;
  DELETE FROM discount_scans WHERE scanned_by = uid;
  DELETE FROM engagement_events WHERE user_id = uid;
  DELETE FROM business_followers WHERE user_id = uid;
  DELETE FROM push_subscriptions WHERE user_id = uid;
  DELETE FROM user_preferences WHERE user_id = uid;
  DELETE FROM user_connections WHERE requester_id = uid OR receiver_id = uid;
  DELETE FROM reports WHERE user_id = uid;

  -- Profile
  DELETE FROM profiles WHERE id = uid;

  -- Auth user
  DELETE FROM auth.users WHERE id = uid;
END $$;
