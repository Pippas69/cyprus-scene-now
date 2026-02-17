

# Fix Commission Ledger for Tickets & Reservations (No Offers)

## Context

Since offers no longer involve prepayment, there is no reason to track offer commissions. The `commission_ledger` table was built exclusively for offers (with NOT NULL foreign keys to `discount_id` and `redemption_id`), but it has zero records. We will repurpose it cleanly for the two actual revenue sources: **tickets** and **prepaid reservations**.

## What Changes

### 1. Database Migration -- Rebuild commission_ledger

Since the table is empty, we can safely drop the offer-specific constraints and reshape it:

- Make `discount_id` and `redemption_id` **nullable** (keep columns for backward compatibility with existing code/policies, but they will no longer be required)
- Add `source_type` column: `'ticket'` or `'reservation'`
- Add `ticket_order_id` (nullable UUID, FK to `ticket_orders`)
- Add `reservation_id` (nullable UUID, FK to `reservations`)
- Add a validation trigger ensuring proper references based on `source_type`
- Update RLS policies to also cover the new source types (current policies reference `discount_id` which won't work for tickets/reservations)

### 2. Update `process-ticket-payment` Edge Function

Currently at line 360-363, there is a fake "Commission recorded" log with no actual database insert. Replace this with a real INSERT into `commission_ledger`:

```
source_type: 'ticket'
business_id: from the event's business
ticket_order_id: orderId
original_price_cents: order.total_cents
commission_percent: order.commission_percent
commission_amount_cents: order.commission_cents
status: 'pending'
redeemed_at: now()
```

Skip the insert if `commission_cents` is 0 (free tickets).

### 3. Update `process-reservation-event-payment` Edge Function

After the reservation is updated to paid/accepted (line 126), add commission calculation and ledger insert:

- Query the business's active subscription plan to determine commission rate (Free: 12%, Basic: 10%, Pro: 8%, Elite: 6%)
- Calculate commission from `paidAmountCents`
- INSERT into `commission_ledger`:

```
source_type: 'reservation'
business_id: from reservation -> event -> business
reservation_id: reservationId
original_price_cents: paidAmountCents
commission_percent: (calculated)
commission_amount_cents: (calculated)
status: 'pending'
redeemed_at: now()
```

### 4. Monthly Invoice Function (`calculate-monthly-commission`)

No changes needed -- it already queries by `status = 'pending'` and groups by `business_id`, which is source-agnostic.

## Technical Details

### Database SQL

```sql
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
```

### Files Modified

| File | Change |
|------|--------|
| Database migration | Alter `commission_ledger` schema, add trigger, update RLS |
| `supabase/functions/process-ticket-payment/index.ts` | Replace fake log with real `commission_ledger` INSERT |
| `supabase/functions/process-reservation-event-payment/index.ts` | Add commission calculation + `commission_ledger` INSERT after payment |

### Edge Cases

- **Free tickets** (commission = 0): No ledger entry created
- **Free reservations** (no prepaid): No webhook fires, so no entry
- **Existing offer delete policy**: Dropped since offers no longer generate commissions
- **Monthly invoicing**: Works as-is, source-agnostic
- **Duplicate prevention**: Both functions already have idempotency checks (order status = completed / reservation status = accepted)

