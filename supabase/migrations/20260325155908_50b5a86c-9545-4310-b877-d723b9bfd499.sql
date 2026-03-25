-- Fix CRM stats runtime failure: get_crm_guest_stats references offer_purchases.guest_name
-- Ensure the column exists and backfill from per-guest rows when available.
ALTER TABLE public.offer_purchases
ADD COLUMN IF NOT EXISTS guest_name text;

UPDATE public.offer_purchases op
SET guest_name = src.guest_name
FROM (
  SELECT DISTINCT ON (purchase_id)
    purchase_id,
    guest_name
  FROM public.offer_purchase_guests
  WHERE guest_name IS NOT NULL
  ORDER BY purchase_id, created_at ASC
) AS src
WHERE op.id = src.purchase_id
  AND (op.guest_name IS NULL OR btrim(op.guest_name) = '');