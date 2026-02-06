-- Ensure idempotency is race-safe by enforcing uniqueness

-- 1) Remove duplicates in notification_log (keep the earliest row)
WITH ranked AS (
  SELECT
    ctid,
    id,
    user_id,
    notification_type,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, notification_type
      ORDER BY COALESCE(sent_at, created_at, now()) ASC, id ASC
    ) AS rn
  FROM public.notification_log
)
DELETE FROM public.notification_log nl
USING ranked r
WHERE nl.ctid = r.ctid
  AND r.rn > 1;

-- 2) Add unique constraint/index so concurrent sends can't double-send
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'notification_log_user_notification_type_uniq'
  ) THEN
    CREATE UNIQUE INDEX notification_log_user_notification_type_uniq
      ON public.notification_log (user_id, notification_type);
  END IF;
END $$;

-- 3) (Optional but helpful) prevent duplicate push subscription rows per endpoint
WITH ranked_ps AS (
  SELECT
    ctid,
    id,
    user_id,
    endpoint,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, endpoint
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.push_subscriptions
  WHERE endpoint IS NOT NULL
)
DELETE FROM public.push_subscriptions ps
USING ranked_ps r
WHERE ps.ctid = r.ctid
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'push_subscriptions_user_endpoint_uniq'
  ) THEN
    CREATE UNIQUE INDEX push_subscriptions_user_endpoint_uniq
      ON public.push_subscriptions (user_id, endpoint);
  END IF;
END $$;