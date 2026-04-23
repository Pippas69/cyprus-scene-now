
-- ============================================================
-- 1. Drop duplicate function (keep the canonical 1-arg version)
-- ============================================================
DROP FUNCTION IF EXISTS public.consume_pending_booking(text, uuid, uuid);

-- ============================================================
-- 2. Drop old duplicate policies (keep new "Business owners X own/..." set)
-- ============================================================
-- business_payment_methods (old set with "can")
DROP POLICY IF EXISTS "Business owners can delete their payment methods" ON public.business_payment_methods;
DROP POLICY IF EXISTS "Business owners can insert their payment methods" ON public.business_payment_methods;
DROP POLICY IF EXISTS "Business owners can update their payment methods" ON public.business_payment_methods;
DROP POLICY IF EXISTS "Business owners can view their payment methods" ON public.business_payment_methods;

-- pending_bookings (old set with "can")
DROP POLICY IF EXISTS "Business owners can create pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Business owners can delete their pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Business owners can update their pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Business owners can view their pending bookings" ON public.pending_bookings;

-- sms_charges (old)
DROP POLICY IF EXISTS "Business owners can view their sms charges" ON public.sms_charges;

-- ============================================================
-- 3. Drop duplicate indexes (keep the more descriptive new ones)
-- ============================================================
DROP INDEX IF EXISTS public.idx_business_payment_methods_active;
DROP INDEX IF EXISTS public.idx_pending_bookings_business_status;
DROP INDEX IF EXISTS public.idx_sms_charges_uncharged;
DROP INDEX IF EXISTS public.idx_sms_rate_limits_business_time;
DROP INDEX IF EXISTS public.idx_sms_rate_limits_phone_business_time;
DROP INDEX IF EXISTS public.idx_sms_rate_limits_phone_time;

-- ============================================================
-- 4. Also drop the old UNIQUE constraint on business_payment_methods
--    that prevents multiple cards per business (we want multi-card support)
-- ============================================================
ALTER TABLE public.business_payment_methods
  DROP CONSTRAINT IF EXISTS business_payment_methods_business_id_key;
