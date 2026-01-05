-- Drop the discount_item_options table (not needed in simplified version)
DROP TABLE IF EXISTS public.discount_item_options;

-- Remove unused columns from discount_items
ALTER TABLE public.discount_items DROP COLUMN IF EXISTS is_choice_group;
ALTER TABLE public.discount_items DROP COLUMN IF EXISTS price_cents;
ALTER TABLE public.discount_items DROP COLUMN IF EXISTS image_url;