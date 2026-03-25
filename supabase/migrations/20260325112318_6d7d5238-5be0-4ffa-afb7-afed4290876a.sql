
-- Backfill: fix existing CRM guests that have user_id but are marked as ghost
UPDATE public.crm_guests
SET profile_type = 'registered', updated_at = now()
WHERE user_id IS NOT NULL AND profile_type = 'ghost';
