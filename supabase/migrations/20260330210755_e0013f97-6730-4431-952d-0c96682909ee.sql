
-- Insert Elite subscriptions for Notes and Spirits, Element X, and Eterna
INSERT INTO public.business_subscriptions (
  business_id, plan_id, status, billing_cycle,
  current_period_start, current_period_end,
  monthly_budget_remaining_cents, commission_free_offers_remaining
) VALUES
  -- Notes and Spirits
  ('4c7e388f-343c-45ee-861b-390f4c058d28', '75065354-1b25-4a16-a64f-899f913ca3f1', 'active', 'monthly',
   now(), now() + interval '1 month', 30000, 20),
  -- Element X
  ('3f45ba54-3e15-443c-8d29-152a1fcdebd1', '75065354-1b25-4a16-a64f-899f913ca3f1', 'active', 'monthly',
   now(), now() + interval '1 month', 30000, 20),
  -- Eterna
  ('cacc28f8-918f-49ab-8b81-9fac86739981', '75065354-1b25-4a16-a64f-899f913ca3f1', 'active', 'monthly',
   now(), now() + interval '1 month', 30000, 20);
