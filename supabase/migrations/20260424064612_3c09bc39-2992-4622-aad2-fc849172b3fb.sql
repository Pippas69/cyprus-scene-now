
-- Cleanup test fixtures
DELETE FROM pending_booking_audit_log
WHERE business_id='b46262e4-50db-4ad7-83e2-8f06d4975354'
  AND (metadata->>'twilio_message_sid' LIKE 'SMverif_%' OR metadata->>'source'='cron');

DELETE FROM sms_charges WHERE twilio_message_sid LIKE 'SMverif_%';

DELETE FROM pending_bookings
WHERE id IN ('5726cada-3c89-4f21-a695-a72cc4b5dbb3')
   OR customer_phone='+35799999004';

DELETE FROM events WHERE title='Phase5 NoShow Event' AND business_id='b46262e4-50db-4ad7-83e2-8f06d4975354';

DELETE FROM sms_rate_limits WHERE business_id='29b238d6-c2ab-40c0-aa5b-efaae88458d2'
  AND phone_number LIKE '+35799000%';

DELETE FROM business_sms_daily_quota WHERE business_id='b46262e4-50db-4ad7-83e2-8f06d4975354'
  AND quota_date=(now() AT TIME ZONE 'Asia/Nicosia')::date;
