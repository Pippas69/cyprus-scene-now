

# Fix Pause and Deactivate Buttons for Boost Management

## Problems Found

After thorough investigation, here are the bugs preventing pause/deactivate from working properly:

### 1. Offer Boost Pause Inconsistency
The `pause-offer-boost` edge function sets `active: false` but does NOT set a `status` field to `"paused"`. Meanwhile, `pause-event-boost` correctly sets `status: "paused"`. The UI for offer boosts checks `b.active` instead of `b.status`, creating confusion.

### 2. Paused Boosts Disappear into "Expired" Section
The active/expired filtering logic:
- Event boosts: `b.status === 'active'` -- paused boosts (status "paused") fall into expired
- Offer boosts: `b.active` -- paused boosts (active=false) fall into expired

Paused boosts should remain visible in the active section with a "Paused" badge, not get buried in expired.

### 3. Deactivation Deletes Records (Data Loss)
Both `deactivate-event-boost` and `deactivate-offer-boost` edge functions DELETE the boost record entirely. This means:
- Frozen time stored on the record is lost forever
- Historical metrics disappear
- The policy says deactivation should calculate refunds and store them, not destroy the record

### 4. No Confirmation Dialog
Pause and deactivate are destructive actions with financial consequences (deactivation can forfeit remaining value for free users). There is no confirmation prompt before executing.

### 5. Frozen Time Not Displayed
The policy states frozen time should be visible in the Boost Management UI. Currently:
- `frozen_hours` / `frozen_days` columns exist in the database
- The pause edge functions correctly calculate and store frozen time
- But the UI never fetches or displays these values

### 6. No Resume Functionality
The policy states paused boosts can be resumed directly. Currently the UI only shows a dialog saying "create a new boost" when clicking the paused badge.

---

## Implementation Plan

### Step 1: Fix Edge Functions

**`pause-offer-boost/index.ts`**: Add `status: "paused"` alongside `active: false` for consistency.

**`deactivate-event-boost/index.ts`** and **`deactivate-offer-boost/index.ts`**: Change from DELETE to UPDATE. Set `status: "deactivated"` instead of deleting the record. Keep the refund logic (returning credits to budget for paid users).

### Step 2: Fix UI Data Fetching

Update `BoostManagement.tsx` fetch queries to include `frozen_hours` and `frozen_days` in the SELECT for both event and offer boosts.

Update the interfaces `EventBoostWithMetrics` and `OfferBoostWithMetrics` to include frozen time fields.

### Step 3: Fix Active/Expired/Paused Filtering

Change the filtering logic:
- **Active**: `status === "active"` AND within time window
- **Paused**: `status === "paused"` (shown in active section with paused badge)
- **Expired/Deactivated**: Everything else (expired time window, deactivated status)

For offer boosts, use `status` field instead of `active` boolean for consistency.

### Step 4: Add Confirmation Dialogs

Add `AlertDialog` confirmation before:
- **Pause**: Simple confirmation ("Are you sure you want to pause this boost? Remaining time will be frozen.")
- **Deactivate**: Warning with plan-specific messaging:
  - Free users: "Remaining value will be forfeited"
  - Paid users: "Remaining value will be returned as credits"

### Step 5: Display Frozen Time

For paused boosts, show the frozen time in the card:
- "Frozen: X hours" or "Frozen: X days" displayed near the status badge
- This matches the policy: "Frozen time is displayed in the Boost Management UI (corner of the section)"

### Step 6: Update UI State After Actions

- **Pause**: Update local state to set `status: "paused"` and store returned `frozenHours`/`frozenDays`
- **Deactivate**: Update local state to set `status: "deactivated"` (not remove from array)

---

## Technical Details

### Files to modify:
1. `supabase/functions/pause-offer-boost/index.ts` -- add `status: "paused"`
2. `supabase/functions/deactivate-event-boost/index.ts` -- UPDATE instead of DELETE
3. `supabase/functions/deactivate-offer-boost/index.ts` -- UPDATE instead of DELETE
4. `src/components/business/BoostManagement.tsx` -- fix filtering, add frozen time display, add confirmation dialogs, fix state updates

### No database changes needed
All required columns (`frozen_hours`, `frozen_days`, `status`) already exist on both `event_boosts` and `offer_boosts` tables.

