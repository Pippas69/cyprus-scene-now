-- Update commission rates for the new plan slugs
-- First, delete old entries
DELETE FROM ticket_commission_rates;

-- Insert correct commission rates for each plan
INSERT INTO ticket_commission_rates (plan_slug, commission_percent) VALUES
('free', 12),
('basic', 10),
('pro', 8),
('elite', 6);