
# Fix: Free Plan Stripe Boosts Stuck as "Pending" (Showing as Expired)

## Problem

When a free-plan business user pays for a boost via Stripe, the boost record is created with `status: "pending"` in the database. The Stripe webhook (`stripe-webhook` edge function) is supposed to update this to `"active"` after successful payment, but the webhook is either not configured correctly or not reaching the function. As a result:

- The boost stays as `"pending"` forever
- The Boost Management UI filters `status === "active"` for the active tab, so pending boosts appear under "Expired"
- The feed/events never show the boost as "Boosted"
- The user sees a "success" toast (from the URL redirect) but nothing actually works

Evidence from the database: all `source: "purchase"` event boosts have `status: "pending"` and `stripe_payment_intent_id: null`.

## Solution

Two-pronged fix to make this bulletproof:

### 1. Frontend Fallback: Activate Pending Boosts on Success Redirect

When the user returns to the dashboard with `?boost=success`, the frontend should call a new edge function that finds the user's most recent `"pending"` boost and activates it. This ensures boosts work even if the webhook is delayed or misconfigured.

**New edge function: `activate-pending-boost`**
- Accepts the user's auth token
- Finds the most recent `"pending"` event or offer boost for the user's business
- Updates status to `"active"` (or `"scheduled"` if future start date)
- Sets `active: true` for offer boosts

**Update `DashboardBusiness.tsx`:**
- On `?boost=success`, call the `activate-pending-boost` function before showing the success toast

### 2. Fix Stripe Webhook Reliability

The `stripe-webhook` already has the correct logic (lines 165-281) to activate boosts. The issue is likely that the webhook endpoint isn't receiving events. We should verify the webhook configuration, but as a defensive measure, the webhook handler code is correct and needs no changes.

### 3. Fix BoostManagement Filtering

Currently, `"pending"` boosts are grouped with expired. Add `"pending"` as a separate visible status so users can at least see that a boost is processing, rather than it silently appearing as expired.

## Technical Details

### New File: `supabase/functions/activate-pending-boost/index.ts`
- Auth: verify JWT from header
- Find user's business
- Query for most recent `event_boosts` or `offer_boosts` with `status = 'pending'` and `source = 'purchase'`
- Update status to `'active'` (if `start_date <= now`) or `'scheduled'`
- For offer boosts, also set `active = true`

### Edit: `src/pages/DashboardBusiness.tsx`
- In the `useEffect` that handles `?boost=success`:
  - Call `supabase.functions.invoke("activate-pending-boost")` before showing toast
  - Refresh boost data after activation

### Edit: `src/components/business/BoostManagement.tsx`
- In the active/expired filtering logic (lines 426-441):
  - Treat `"pending"` boosts from `source: "purchase"` as "processing" (not expired)
  - Or simply include them in the active section with a "Processing Payment" badge

### Memory file update
- Update `.memory/technical/boost-transactional-safety-logic-el.md` to document the fallback activation flow
