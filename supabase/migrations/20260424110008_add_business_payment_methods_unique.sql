-- Add unique constraint required for upsert on (business_id, stripe_payment_method_id)
ALTER TABLE public.business_payment_methods
  ADD CONSTRAINT business_payment_methods_business_pm_unique
  UNIQUE (business_id, stripe_payment_method_id);
