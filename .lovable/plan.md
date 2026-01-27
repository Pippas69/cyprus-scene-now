
# Fix: Missing `businessUserId` in Offer Claim Notification

## Problem Identified
When an offer is claimed, the `claim-offer` function calls `send-offer-claim-business-notification` but **does not include the `businessUserId`** in the request payload. The notification function only sends a push notification if `businessUserId` is provided (line 178 check).

## Root Cause
In `claim-offer/index.ts` lines 312-325, the payload is missing the `businessUserId` field even though the business user ID is available from the query as `discount.businesses.user_id`.

## Solution
Add `businessUserId: discount.businesses.user_id` to the payload when calling the business notification function.

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/claim-offer/index.ts` | Add `businessUserId` to the notification payload |

## Code Change (lines 312-325)

**Before:**
```javascript
body: JSON.stringify({
  businessEmail: businessOwner.email,
  businessName: discount.businesses.name,
  offerTitle: discount.title,
  customerName: userName,
  partySize,
  claimedAt: new Date().toISOString(),
  remainingPeople: newPeopleRemaining,
  totalPeople: discount.total_people,
  hasReservation: !!reservationId,
  reservationDate: reservationData?.preferred_date,
  reservationTime: reservationData?.preferred_time,
}),
```

**After:**
```javascript
body: JSON.stringify({
  businessEmail: businessOwner.email,
  businessName: discount.businesses.name,
  businessUserId: discount.businesses.user_id,  // <-- ADD THIS
  offerTitle: discount.title,
  customerName: userName,
  partySize,
  claimedAt: new Date().toISOString(),
  remainingPeople: newPeopleRemaining,
  totalPeople: discount.total_people,
  hasReservation: !!reservationId,
  reservationDate: reservationData?.preferred_date,
  reservationTime: reservationData?.preferred_time,
}),
```

## Why This Was Missed
The interface in `send-offer-claim-business-notification` marks `businessUserId` as optional (`businessUserId?: string`), which meant no error was thrown when it was missing. The function gracefully skipped the push notification because the check `if (data.businessUserId)` failed silently.

## Expected Result
After this fix, when a user redeems an offer:
1. Business owner receives an email (already working)
2. Business owner receives a push notification on their device (will now work)
