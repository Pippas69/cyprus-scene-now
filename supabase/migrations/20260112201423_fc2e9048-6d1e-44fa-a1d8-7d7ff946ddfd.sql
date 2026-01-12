-- Add new columns for simplified offer system

-- Category for the offer (drink, food, account_total)
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'account_total';

-- Discount type: percentage or special_deal
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';

-- Text for special deals (e.g., "2-for-1")
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS special_deal_text TEXT;

-- Days when offer is valid (array)
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS valid_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

-- Time range when offer is valid
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS valid_start_time TIME DEFAULT '00:00';
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS valid_end_time TIME DEFAULT '23:59';

-- Max people per single redemption
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS max_people_per_redemption INTEGER DEFAULT 1;

-- Total available people for the offer
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS total_people INTEGER DEFAULT 30;

-- People remaining (decremented on redemption)
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS people_remaining INTEGER DEFAULT 30;

-- Show reservation CTA after QR
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS show_reservation_cta BOOLEAN DEFAULT false;

-- One redemption per user flag
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS one_per_user BOOLEAN DEFAULT true;