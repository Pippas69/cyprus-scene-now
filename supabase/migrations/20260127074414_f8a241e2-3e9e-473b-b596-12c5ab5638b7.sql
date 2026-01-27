-- One-time repair: Enable push for all users who have active subscriptions
-- This fixes the mismatch where subscription exists but notification_push_enabled = false

-- First, update existing user_preferences rows
UPDATE public.user_preferences
SET notification_push_enabled = true,
    updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM public.push_subscriptions
)
AND (notification_push_enabled = false OR notification_push_enabled IS NULL);

-- Then, insert user_preferences rows for users who have subscriptions but no preferences row
INSERT INTO public.user_preferences (user_id, notification_push_enabled, updated_at)
SELECT DISTINCT ps.user_id, true, now()
FROM public.push_subscriptions ps
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_preferences up WHERE up.user_id = ps.user_id
)
ON CONFLICT (user_id) DO UPDATE SET
  notification_push_enabled = true,
  updated_at = now();