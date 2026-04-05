-- Job 1: monitor-database-performance (every 5 min)
SELECT cron.unschedule(1);
SELECT cron.schedule(
  'monitor-db-perf',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/monitor-database-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Job 8: expire-completed-boosts (every 5 min)
SELECT cron.unschedule(8);
SELECT cron.schedule(
  'expire-boosts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/expire-completed-boosts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Job 9: reconcile-payments (every 15 min)
SELECT cron.unschedule(9);
SELECT cron.schedule(
  'reconcile-payments',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/reconcile-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Job 10: process-deferred-deadlines (every 15 min)
SELECT cron.unschedule(10);
SELECT cron.schedule(
  'process-deferred-deadlines',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/process-deferred-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{"time": "now"}'::jsonb
  ) as request_id;
  $$
);

-- Job 12: cleanup-stale-data (every 6 hours)
SELECT cron.unschedule(12);
SELECT cron.schedule(
  'cleanup-stale-data',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/cleanup-stale-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Job 3: send-personalized-notifications-cron (every 30 min)
SELECT cron.unschedule(3);
SELECT cron.schedule(
  'send-personalized-notifs',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/send-personalized-notifications-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    )
  ) as request_id;
  $$
);

-- Job 5: send-reservation-reminders (every 30 min)
SELECT cron.unschedule(5);
SELECT cron.schedule(
  'send-reservation-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/send-reservation-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    )
  ) as request_id;
  $$
);

-- Job 7: send-weekly-summary (Monday 6am)
SELECT cron.unschedule(7);
SELECT cron.schedule(
  'send-weekly-summary',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://iasahlgurfxufrtdigcr.supabase.co/functions/v1/send-weekly-summary-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
