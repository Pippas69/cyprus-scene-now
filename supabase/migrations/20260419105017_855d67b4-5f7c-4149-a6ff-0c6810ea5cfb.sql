-- Helper: generate a transaction code XXXX-XXXX (8 chars from unambiguous set)
CREATE OR REPLACE FUNCTION public.generate_transaction_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  charset TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- exclude 0,O,1,I,L
  code TEXT;
  i INT;
  charset_len INT := length(charset);
BEGIN
  code := '';
  FOR i IN 1..4 LOOP
    code := code || substr(charset, 1 + floor(random() * charset_len)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(charset, 1 + floor(random() * charset_len)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Generic trigger function that ensures uniqueness within the same table
CREATE OR REPLACE FUNCTION public.set_transaction_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
  exists_already BOOLEAN;
BEGIN
  IF NEW.transaction_code IS NOT NULL AND NEW.transaction_code <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    new_code := public.generate_transaction_code();
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE transaction_code = $1)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      INTO exists_already
      USING new_code;
    EXIT WHEN NOT exists_already OR attempts > 10;
    attempts := attempts + 1;
  END LOOP;

  NEW.transaction_code := new_code;
  RETURN NEW;
END;
$$;

-- Add columns
ALTER TABLE public.reservations    ADD COLUMN IF NOT EXISTS transaction_code TEXT;
ALTER TABLE public.ticket_orders   ADD COLUMN IF NOT EXISTS transaction_code TEXT;
ALTER TABLE public.offer_purchases ADD COLUMN IF NOT EXISTS transaction_code TEXT;

-- Backfill existing rows
UPDATE public.reservations    SET transaction_code = public.generate_transaction_code() WHERE transaction_code IS NULL;
UPDATE public.ticket_orders   SET transaction_code = public.generate_transaction_code() WHERE transaction_code IS NULL;
UPDATE public.offer_purchases SET transaction_code = public.generate_transaction_code() WHERE transaction_code IS NULL;

-- Unique indexes (after backfill)
CREATE UNIQUE INDEX IF NOT EXISTS reservations_transaction_code_key    ON public.reservations(transaction_code);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_orders_transaction_code_key   ON public.ticket_orders(transaction_code);
CREATE UNIQUE INDEX IF NOT EXISTS offer_purchases_transaction_code_key ON public.offer_purchases(transaction_code);

-- Triggers (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_reservations_set_txn_code    ON public.reservations;
CREATE TRIGGER trg_reservations_set_txn_code
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_code();

DROP TRIGGER IF EXISTS trg_ticket_orders_set_txn_code   ON public.ticket_orders;
CREATE TRIGGER trg_ticket_orders_set_txn_code
BEFORE INSERT ON public.ticket_orders
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_code();

DROP TRIGGER IF EXISTS trg_offer_purchases_set_txn_code ON public.offer_purchases;
CREATE TRIGGER trg_offer_purchases_set_txn_code
BEFORE INSERT ON public.offer_purchases
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_code();