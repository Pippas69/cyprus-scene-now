
-- Make offer-specific columns nullable (table is empty, safe to alter)
ALTER TABLE commission_ledger ALTER COLUMN discount_id DROP NOT NULL;
ALTER TABLE commission_ledger ALTER COLUMN redemption_id DROP NOT NULL;

-- Add new columns
ALTER TABLE commission_ledger
  ADD COLUMN source_type text NOT NULL DEFAULT 'ticket',
  ADD COLUMN ticket_order_id uuid REFERENCES ticket_orders(id) ON DELETE CASCADE,
  ADD COLUMN reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE;

-- Validation trigger
CREATE OR REPLACE FUNCTION validate_commission_ledger_source()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_type = 'ticket' AND NEW.ticket_order_id IS NULL THEN
    RAISE EXCEPTION 'Ticket commissions require ticket_order_id';
  END IF;
  IF NEW.source_type = 'reservation' AND NEW.reservation_id IS NULL THEN
    RAISE EXCEPTION 'Reservation commissions require reservation_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_commission_source
  BEFORE INSERT OR UPDATE ON commission_ledger
  FOR EACH ROW EXECUTE FUNCTION validate_commission_ledger_source();

-- Update RLS: business owners can view commissions for their business
DROP POLICY IF EXISTS "Business owners can delete commission rows for their offers" ON commission_ledger;

CREATE POLICY "Business owners can view their ticket/reservation commissions"
ON commission_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = commission_ledger.business_id
    AND businesses.user_id = auth.uid()
  )
);
