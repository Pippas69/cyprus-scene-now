-- Update subscription plans with correct boost values per the agreed structure
-- Starter: 3 events × €40 = €120 total value
-- Growth: 5 events × €50 = €250 total value  
-- Professional: 10 events × €80 = €800 total value

UPDATE subscription_plans SET 
  event_boost_budget_cents = 12000  -- €120 total boost value
WHERE slug = 'starter';

UPDATE subscription_plans SET 
  event_boost_budget_cents = 25000  -- €250 total boost value
WHERE slug = 'growth';

UPDATE subscription_plans SET 
  event_boost_budget_cents = 80000  -- €800 total boost value
WHERE slug = 'professional';