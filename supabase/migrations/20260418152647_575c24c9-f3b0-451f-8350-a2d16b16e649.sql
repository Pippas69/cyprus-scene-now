-- Add bottle-based pricing mode to seating tiers
-- Backwards compatible: pricing_mode defaults to 'amount' (existing behavior)

CREATE TYPE public.seating_tier_pricing_mode AS ENUM ('amount', 'bottles');
CREATE TYPE public.seating_tier_bottle_type AS ENUM ('bottle', 'premium_bottle');

ALTER TABLE public.seating_type_tiers
  ADD COLUMN pricing_mode public.seating_tier_pricing_mode NOT NULL DEFAULT 'amount',
  ADD COLUMN bottle_type public.seating_tier_bottle_type NULL,
  ADD COLUMN bottle_count integer NULL;

-- Validation: when pricing_mode = 'bottles', bottle_type and bottle_count are required and > 0
CREATE OR REPLACE FUNCTION public.validate_seating_tier_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pricing_mode = 'bottles' THEN
    IF NEW.bottle_type IS NULL THEN
      RAISE EXCEPTION 'bottle_type is required when pricing_mode is bottles';
    END IF;
    IF NEW.bottle_count IS NULL OR NEW.bottle_count < 1 THEN
      RAISE EXCEPTION 'bottle_count must be >= 1 when pricing_mode is bottles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_seating_tier_pricing ON public.seating_type_tiers;
CREATE TRIGGER trg_validate_seating_tier_pricing
BEFORE INSERT OR UPDATE ON public.seating_type_tiers
FOR EACH ROW
EXECUTE FUNCTION public.validate_seating_tier_pricing();