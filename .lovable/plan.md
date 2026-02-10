

# Remove Pause, Simplify Boost Lifecycle: Deactivate Only

## Overview

This plan removes the entire "Pause/Resume/Frozen Time" system from boosts and simplifies the lifecycle to: **Active -> Deactivated (or Expired)**. It also adds a no-refund disclaimer for free-plan business users wherever boosts are created.

---

## What Changes

### 1. Remove Pause/Resume/Frozen Time from Backend

**Delete 4 edge functions:**
- `supabase/functions/pause-event-boost/`
- `supabase/functions/pause-offer-boost/`
- `supabase/functions/resume-event-boost/`
- `supabase/functions/resume-offer-boost/`

**Update 2 edge functions (remove frozen time consumption):**
- `supabase/functions/create-event-boost/index.ts` -- Remove `consumeFrozenTime` function and all `useFrozenTime` / `frozenHoursUsed` / `frozenDaysUsed` parameters
- `supabase/functions/create-offer-boost/index.ts` -- Same cleanup

**Deactivation edge functions stay as-is** (`deactivate-event-boost`, `deactivate-offer-boost`) -- they already handle the correct refund logic:
- Free plan: no refund (forfeit)
- Paid plan: remaining value returned to `monthly_budget_remaining_cents`
- Hybrid (paid plan + Stripe top-up): remaining value goes to credits (resets at month end)

### 2. Remove Pause/Resume/Frozen Time from Frontend

**`src/components/business/BoostManagement.tsx`:**
- Remove `pauseEventBoost`, `resumeEventBoost`, `pauseOfferBoost`, `resumeOfferBoost` functions
- Remove all frozen time state/calculations (`totalFrozenHours`, `totalFrozenDays`, `hasFrozenTime`, `getFrozenTimeText`, `FrozenTimeBadge`)
- Remove "paused" status from active boost filters (active = only `status === "active"` within window)
- Remove Pause button, Resume button, and their confirmation dialogs from both event and offer boost cards
- Remove the global frozen time banner
- Keep only the Deactivate button for active boosts
- Deactivated boosts go to expired/history section and are **not clickable** (no actions possible)

**`src/components/business/EventBoostDialog.tsx`:**
- Remove all frozen time state (`frozenHoursAvailable`, `frozenDaysAvailable`, `useFrozenTime`)
- Remove frozen time fetch logic
- Remove frozen time conversion calculations
- Remove frozen time UI section (Snowflake toggle)
- Remove `useFrozenTime`, `frozenHoursUsed`, `frozenDaysUsed` from API call payloads

**`src/components/business/OfferBoostDialog.tsx`:**
- Same cleanup as EventBoostDialog

**`src/components/business/OfferBoostSection.tsx`:**
- No frozen time here currently, so minimal changes

### 3. Add Free Plan No-Refund Disclaimer

Add a warning message for free-plan business users at **every boost creation point**:

> "Attention: On the Free plan, deactivating a boost does not return any credits. The remaining value is permanently lost."
> (Greek: "Προσοχή: Στο Δωρεάν πλάνο, η απενεργοποίηση μιας προώθησης δεν επιστρέφει credits. Η εναπομείνασα αξία χάνεται οριστικά.")

This disclaimer appears in:
- `EventBoostDialog.tsx` (boost from Events list)
- `OfferBoostDialog.tsx` (boost from Offers list)
- `OfferBoostSection.tsx` (boost during Offer creation, Step 9)
- `BoostManagement.tsx` deactivation confirmation dialog (already has different messages for free vs paid -- will ensure clarity)

The disclaimer only shows when `hasActiveSubscription === false`.

### 4. Deactivated Boost Behavior

- Deactivated boosts appear in the "Expired" / history section with a "Deactivated" badge
- **No buttons or actions** on deactivated boosts -- they are read-only history
- The boost loses its "Boosted" visibility in feed/events immediately upon deactivation (already handled by status check)

---

## Technical Details

### Files to Delete
- `supabase/functions/pause-event-boost/index.ts`
- `supabase/functions/pause-offer-boost/index.ts`
- `supabase/functions/resume-event-boost/index.ts`
- `supabase/functions/resume-offer-boost/index.ts`

### Files to Edit
| File | Changes |
|------|---------|
| `src/components/business/BoostManagement.tsx` | Remove pause/resume/frozen logic, remove paused status handling, make deactivated cards non-interactive |
| `src/components/business/EventBoostDialog.tsx` | Remove frozen time UI and logic, add free-plan disclaimer |
| `src/components/business/OfferBoostDialog.tsx` | Remove frozen time UI and logic, add free-plan disclaimer |
| `src/components/business/OfferBoostSection.tsx` | Add free-plan disclaimer |
| `supabase/functions/create-event-boost/index.ts` | Remove `consumeFrozenTime` and frozen time params |
| `supabase/functions/create-offer-boost/index.ts` | Remove frozen time consumption logic |

### Memory Files to Update
- `.memory/technical/boost/refund-and-pause-policy-v1-el.md` -- Remove pause policy, update to deactivation-only
- `.memory/features/business/boost-management-pause-deactivate-v1-el.md` -- Remove pause references
- `.memory/features/business/boost-management-pause-resume-v3-el.md` -- Remove entirely or rewrite
- `.memory/features/business/boost-frozen-time-consumption-v3-el.md` -- Remove entirely

### Database Columns
The `frozen_hours` and `frozen_days` columns on `event_boosts` and `offer_boosts` tables will become unused. They can remain without harm (nullable, default 0) to avoid a migration, or we can drop them for cleanliness.

