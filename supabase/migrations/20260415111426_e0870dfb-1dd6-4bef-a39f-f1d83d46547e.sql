
DO $$
DECLARE
  uid uuid := 'c641469b-1b23-4dcb-a493-ed5845691fba';
BEGIN
  DELETE FROM reservation_scans WHERE scanned_by = uid;
  DELETE FROM reservation_scans WHERE reservation_id IN (SELECT id FROM reservations WHERE user_id = uid);
  DELETE FROM ticket_orders WHERE user_id = uid;
  DELETE FROM ticket_orders WHERE linked_reservation_id IN (SELECT id FROM reservations WHERE user_id = uid);
  DELETE FROM reservations WHERE user_id = uid OR checked_in_by = uid;
  DELETE FROM rsvps WHERE user_id = uid;
  DELETE FROM redemptions WHERE user_id = uid;
  DELETE FROM messages WHERE user_id = uid;
  DELETE FROM reports WHERE user_id = uid;
  DELETE FROM favorites WHERE user_id = uid;
  DELETE FROM business_followers WHERE user_id = uid;
  DELETE FROM event_views WHERE user_id = uid;
  DELETE FROM discount_views WHERE user_id = uid;
  DELETE FROM engagement_events WHERE user_id = uid;
  DELETE FROM favorite_discounts WHERE user_id = uid;
  DELETE FROM notifications WHERE user_id = uid;
  DELETE FROM discount_scans WHERE scanned_by = uid;
  DELETE FROM user_connections WHERE requester_id = uid OR receiver_id = uid;
  DELETE FROM direct_messages WHERE sender_id = uid;
  DELETE FROM conversation_participants WHERE user_id = uid;
  DELETE FROM event_posts WHERE user_id = uid;
  DELETE FROM post_reactions WHERE user_id = uid;
  DELETE FROM business_post_poll_votes WHERE user_id = uid;
  DELETE FROM business_post_likes WHERE user_id = uid;
  DELETE FROM business_post_views WHERE user_id = uid;
  DELETE FROM student_verifications WHERE user_id = uid OR reviewed_by = uid;
  DELETE FROM student_discount_redemptions WHERE scanned_by = uid;
  DELETE FROM credit_transactions WHERE redeemed_by = uid;
  DELETE FROM free_entry_reports WHERE reporter_user_id = uid OR resolved_by = uid;
  DELETE FROM student_redemptions WHERE user_id = uid OR scanned_by = uid;
  DELETE FROM crm_guest_tag_assignments WHERE assigned_by = uid;
  DELETE FROM crm_guest_notes WHERE author_id = uid;
  DELETE FROM crm_guests WHERE user_id = uid OR brought_by_user_id = uid;
  DELETE FROM profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;
