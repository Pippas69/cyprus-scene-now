# Load Tests — Production Reliability Verification

## Prerequisites

1. Install [k6](https://k6.io/docs/get-started/installation/)
2. Set environment variables (see each test file)

## Test 1: Concurrent Ticket Checkout (200 VUs / 50 tickets)

Tests that `reserve_tickets_atomically` prevents overselling under extreme concurrency.

```bash
# Setup: Create an event with a tier that has exactly 50 tickets available
# Then run:
k6 run \
  -e SUPABASE_URL=https://iasahlgurfxufrtdigcr.supabase.co \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e TEST_EVENT_ID=your_event_id \
  -e TEST_TIER_ID=your_tier_id \
  -e TEST_USER_TOKEN=your_auth_token \
  tests/load/k6-concurrent-checkout.js
```

**Pass criteria:**
- `successful_checkouts <= 50` (CRITICAL — no overselling)
- `p95 < 10s`
- No unhandled errors

## Test 2: Multi-Scanner Stress (5 scanners / 500 scans / 3 min)

Tests that `atomic_ticket_checkin` prevents double check-ins across concurrent scanners.

```bash
# Setup: Generate 100+ valid tickets for testing
# Export their QR tokens as comma-separated list
k6 run \
  -e SUPABASE_URL=https://iasahlgurfxufrtdigcr.supabase.co \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e TEST_BUSINESS_ID=your_business_id \
  -e TEST_SCANNER_TOKEN=your_staff_auth_token \
  -e TEST_TICKET_TOKENS=token1,token2,token3,... \
  tests/load/k6-scanner-stress.js
```

**Pass criteria:**
- `duplicate_entries == 0` (CRITICAL — no double check-ins)
- `p95 < 3s`
- Error rate < 1%

## Results

Results are saved to `tests/load/results/` as JSON after each run.

## Architecture Guarantees Tested

| Mechanism | Function | Lock Type |
|---|---|---|
| Ticket reservation | `reserve_tickets_atomically` | `pg_advisory_xact_lock(hashtext('ticket_tier_' + id))` — per-tier |
| Ticket check-in | `atomic_ticket_checkin` | `UPDATE WHERE status='valid' RETURNING` — row-level |
| Offer claims | `claim_offer_spots_atomically` | `pg_advisory_xact_lock(hashtext('discount_' + id))` — per-discount |
| Reservation booking | `book_slot_atomically` | `pg_advisory_xact_lock(hashtext(biz + date + slot))` — per-slot |

All advisory locks have `SET lock_timeout = '5s'` to prevent indefinite waits.
