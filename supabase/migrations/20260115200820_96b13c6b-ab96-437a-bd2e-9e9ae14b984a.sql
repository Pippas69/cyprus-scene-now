-- Add missing columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_price_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_annual TEXT,
ADD COLUMN IF NOT EXISTS commission_percent INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS map_pin_size VARCHAR(10) DEFAULT 'sm',
ADD COLUMN IF NOT EXISTS analytics_level VARCHAR(20) DEFAULT 'overview';

-- Update Starter to Basic
UPDATE public.subscription_plans 
SET 
  slug = 'basic',
  name = 'Basic',
  price_monthly_cents = 5999,
  price_annual_cents = 59988,
  stripe_price_monthly = 'price_1SpwozHTQ1AOHDjnVuRc9Qna',
  stripe_price_annual = 'price_1Spwp1HTQ1AOHDjnQx155dfC',
  event_boost_budget_cents = 5000,
  commission_percent = 10,
  map_pin_size = 'sm',
  analytics_level = 'performance',
  display_order = 1,
  features = '[
    {"el": "Προφίλ επιχείρησης", "en": "Business profile"},
    {"el": "Συμμετοχή στο marketplace", "en": "Marketplace participation"},
    {"el": "Αναλυτικά απόδοσης", "en": "Performance analytics"},
    {"el": "Χαμηλότερη προμήθεια (10%)", "en": "Lower commission (10%)"},
    {"el": "€50 boost credits/μήνα", "en": "€50 boost credits/month"}
  ]'::jsonb
WHERE slug = 'starter';

-- Update Growth to Pro
UPDATE public.subscription_plans 
SET 
  slug = 'pro',
  name = 'Pro',
  price_monthly_cents = 11999,
  price_annual_cents = 119988,
  stripe_price_monthly = 'price_1Spwp2HTQ1AOHDjnrxToaDoC',
  stripe_price_annual = 'price_1Spwp3HTQ1AOHDjnq9F1BnZh',
  event_boost_budget_cents = 15000,
  commission_percent = 8,
  map_pin_size = 'md',
  analytics_level = 'boost_value',
  display_order = 2,
  features = '[
    {"el": "Όλα τα οφέλη του Basic", "en": "All Basic benefits"},
    {"el": "Αναλυτικά απόδοσης", "en": "Performance analytics"},
    {"el": "Σύγκριση Boost vs Μη Boost", "en": "Boost vs Non-Boost comparison"},
    {"el": "Μειωμένη προμήθεια (8%)", "en": "Reduced commission (8%)"},
    {"el": "€150 boost credits/μήνα", "en": "€150 boost credits/month"}
  ]'::jsonb
WHERE slug = 'growth';

-- Update Professional to Elite
UPDATE public.subscription_plans 
SET 
  slug = 'elite',
  name = 'Elite',
  price_monthly_cents = 23999,
  price_annual_cents = 239988,
  stripe_price_monthly = 'price_1Spwp5HTQ1AOHDjn8NpaDDj6',
  stripe_price_annual = 'price_1Spwp6HTQ1AOHDjn7yqgzaPN',
  event_boost_budget_cents = 30000,
  commission_percent = 6,
  map_pin_size = 'lg',
  analytics_level = 'guidance',
  display_order = 3,
  features = '[
    {"el": "Όλα τα οφέλη του Pro", "en": "All Pro benefits"},
    {"el": "Καθοδήγηση & προτάσεις", "en": "Guidance & recommendations"},
    {"el": "Καλύτερες μέρες & ώρες", "en": "Best days & times"},
    {"el": "Αναφορά PDF", "en": "PDF reports"},
    {"el": "Ελάχιστη προμήθεια (6%)", "en": "Minimum commission (6%)"},
    {"el": "€300 boost credits/μήνα", "en": "€300 boost credits/month"}
  ]'::jsonb
WHERE slug = 'professional';

-- Create the free plan entry (not active, not displayed in UI)
INSERT INTO public.subscription_plans (
  slug, 
  name, 
  price_monthly_cents, 
  price_annual_cents,
  event_boost_budget_cents,
  commission_percent,
  commission_free_offers_count,
  display_order,
  active,
  map_pin_size,
  analytics_level,
  features
)
VALUES (
  'free',
  'Free',
  0,
  0,
  0,
  12,
  0,
  0,
  false,
  'xs',
  'overview',
  '[{"el": "Προφίλ επιχείρησης", "en": "Business profile"}, {"el": "Συμμετοχή στο marketplace", "en": "Marketplace participation"}, {"el": "Commission 12%", "en": "Commission 12%"}]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_annual_cents = EXCLUDED.price_annual_cents,
  event_boost_budget_cents = EXCLUDED.event_boost_budget_cents,
  commission_percent = EXCLUDED.commission_percent,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active,
  map_pin_size = EXCLUDED.map_pin_size,
  analytics_level = EXCLUDED.analytics_level,
  features = EXCLUDED.features;