
# Fix: Missing User and Business Notifications for Offer Claims with Reservations

## Problem Summary
When a user claims an offer (especially with a reservation), the following notifications are broken:
1. **User in-app notification** - Not created because `userId` is not passed to `send-offer-claim-email`
2. **User push notification** - Not sent for the same reason
3. **User reservation notification** - Not triggered because `send-reservation-notification` is never called
4. **Business reservation notification** - Not sent (only offer claim notification is sent)

## Root Cause
In `claim-offer/index.ts`:
1. Line ~275: Missing `userId: user.id` in payload to `send-offer-claim-email`
2. Line ~186: After creating reservation, no call to `send-reservation-notification`

---

## Implementation Plan

### Phase 1: Fix `claim-offer/index.ts` - Pass userId to Email Function

**File**: `supabase/functions/claim-offer/index.ts`

**Change**: Add `userId: user.id` to the payload when calling `send-offer-claim-email`

```typescript
// Around line 275, add userId to the body:
body: JSON.stringify({
  purchaseId: purchase.id,
  userId: user.id,  // ADD THIS LINE
  userEmail: user.email,
  userName,
  offerTitle: discount.title,
  // ... rest of payload
})
```

---

### Phase 2: Add Reservation Notification Trigger in `claim-offer/index.ts`

**File**: `supabase/functions/claim-offer/index.ts`

**Change**: After creating a reservation (around line 186), call `send-reservation-notification`

```typescript
// After line 185 (after reservationId = reservation.id):
if (reservationId) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-reservation-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        reservationId,
        type: "new",
      }),
    });
    logStep("Reservation notification sent");
  } catch (notifError) {
    logStep("Reservation notification error", notifError);
  }
}
```

This will:
- Send reservation confirmation email to user
- Create in-app notification for user
- Send push notification to user
- Notify the business about the new reservation

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/claim-offer/index.ts` | 1. Add `userId: user.id` to email payload<br>2. Call `send-reservation-notification` after reservation creation |

---

## Expected Results After Fix

| Notification | Before Fix | After Fix |
|--------------|-----------|-----------|
| User offer claim in-app | ❌ | ✅ |
| User offer claim push | ❌ | ✅ |
| User reservation in-app | ❌ | ✅ |
| User reservation push | ❌ | ✅ |
| User reservation email | ❌ | ✅ |
| Business offer claim notification | ✅ | ✅ |
| Business reservation notification | ❌ | ✅ |

---

## Technical Notes

- The `send-reservation-notification` function already handles both user and business notifications (email + push + in-app)
- The `send-offer-claim-email` function already has the logic to create in-app and push notifications, it just needs the `userId` passed in
- No new functions need to be created
- No database changes required
