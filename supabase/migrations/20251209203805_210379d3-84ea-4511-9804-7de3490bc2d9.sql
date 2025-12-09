-- Add price field to events for actual price display (RSRVIN-inspired)
ALTER TABLE events ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Add operating hours to businesses for time-of-day categorization
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS opens_at TIME;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS closes_at TIME;

-- Add comment for clarity
COMMENT ON COLUMN events.price IS 'Actual event price in EUR. When set, displayed instead of price_tier.';
COMMENT ON COLUMN businesses.opens_at IS 'Business opening time for time-of-day categorization';
COMMENT ON COLUMN businesses.closes_at IS 'Business closing time for time-of-day categorization';