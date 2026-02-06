

## Summary

Fix the post-checkout redirect flow so users land on the correct dashboard section after successful payment:

1. **Tickets**: Redirect to "My Events" → "Tickets" subtab and auto-select it
2. **Reservations**: Redirect to "My Reservations" tab directly

---

## Changes Required

### 1. Fix Ticket Success Page Redirect

**File**: `src/pages/TicketSuccess.tsx`

- Change the `onViewDashboard` callback (line 179) from:
  ```
  /dashboard-user?tab=events&subtab=tickets
  ```
  to:
  ```
  /dashboard-user?tab=events&subtab=tickets
  ```
  *(This is already correct in URL - the issue is MyEvents.tsx doesn't read the subtab)*

- Also update the fallback Link (line 193) to match

### 2. Make MyEvents Read subtab from URL

**File**: `src/components/user/MyEvents.tsx`

- Import `useSearchParams` from react-router-dom
- Read the `subtab` parameter from URL on mount
- Use it to set the initial tab value instead of hardcoded `defaultValue="going"`
- This way when `subtab=tickets` is in URL, the Tickets tab will be auto-selected

### 3. Fix Reservation Checkout Redirect URL

**File**: `supabase/functions/create-reservation-event-checkout/index.ts`

- Change the `success_url` (line 251) from:
  ```
  /dashboard-user/reservations?success=true&reservation_id=...
  ```
  to:
  ```
  /dashboard-user?tab=reservations&success=true&reservation_id=...
  ```
  *(The `/dashboard-user/reservations` path doesn't exist - it uses query params)*

---

## Technical Details

### MyEvents.tsx Changes

```typescript
// Add import
import { useSearchParams } from 'react-router-dom';

// Inside component
const [searchParams] = useSearchParams();
const initialSubtab = searchParams.get('subtab') || 'going';

// Update Tabs component
<Tabs defaultValue={initialSubtab} className="w-full">
```

### Edge Function Fix

The URL structure difference:
- **Wrong**: `/dashboard-user/reservations` (path-based, doesn't exist)
- **Correct**: `/dashboard-user?tab=reservations` (query-based, how routing works)

---

## Result

After these changes:
- **Ticket purchase** → User sees QR success screen → Clicks "My Tickets" → Lands on My Events with Tickets tab auto-selected
- **Reservation purchase** → User is redirected → Lands directly on My Reservations tab

