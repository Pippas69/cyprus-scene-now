-- Generate a transaction code in format XXXX-XXXX
-- Alphabet excludes confusing chars: 0, O, 1, I, L
CREATE OR REPLACE FUNCTION public.generate_transaction_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  alphabet_len INT := length(alphabet);
  result TEXT := '';
  i INT;
  rand_idx INT;
BEGIN
  FOR i IN 1..8 LOOP
    rand_idx := floor(random() * alphabet_len)::int + 1;
    result := result || substr(alphabet, rand_idx, 1);
    IF i = 4 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- Generic trigger function: assigns a unique transaction_code on INSERT
-- Retries up to 10 times in the unlikely case of collision
CREATE OR REPLACE FUNCTION public.assign_transaction_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
  exists_check BOOLEAN;
BEGIN
  IF NEW.transaction_code IS NOT NULL AND NEW.transaction_code <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    new_code := public.generate_transaction_code();
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I WHERE transaction_code = $1)',
      TG_TABLE_NAME
    ) INTO exists_check USING new_code;

    IF NOT exists_check THEN
      NEW.transaction_code := new_code;
      RETURN NEW;
    END IF;

    attempts := attempts + 1;
    IF attempts >= 10 THEN
      -- Fallback: append timestamp suffix (still unique)
      NEW.transaction_code := new_code;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- RESERVATIONS
-- ============================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS transaction_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_transaction_code_unique_idx
  ON public.reservations (transaction_code)
  WHERE transaction_code IS NOT NULL;

DROP TRIGGER IF EXISTS reservations_assign_transaction_code ON public.reservations;
CREATE TRIGGER reservations_assign_transaction_code
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_transaction_code();

-- ============================================
-- TICKET_ORDERS
-- ============================================
ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS transaction_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_orders_transaction_code_unique_idx
  ON public.ticket_orders (transaction_code)
  WHERE transaction_code IS NOT NULL;

DROP TRIGGER IF EXISTS ticket_orders_assign_transaction_code ON public.ticket_orders;
CREATE TRIGGER ticket_orders_assign_transaction_code
  BEFORE INSERT ON public.ticket_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_transaction_code();

-- ============================================
-- OFFER_PURCHASES
-- ============================================
ALTER TABLE public.offer_purchases
  ADD COLUMN IF NOT EXISTS transaction_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS offer_purchases_transaction_code_unique_idx
  ON public.offer_purchases (transaction_code)
  WHERE transaction_code IS NOT NULL;

DROP TRIGGER IF EXISTS offer_purchases_assign_transaction_code ON public.offer_purchases;
CREATE TRIGGER offer_purchases_assign_transaction_code
  BEFORE INSERT ON public.offer_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_transaction_code();