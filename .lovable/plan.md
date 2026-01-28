
# Fix Business In-App Notifications System

## Problem Summary

Οι επιχειρηματίες δεν βλέπουν τις ειδοποιήσεις της επιχείρησής τους στο Business Dashboard. Αυτό συμβαίνει γιατί:

1. Οι transactional functions (reservations, ticket sales, offer claims) στέλνουν **push notifications** στους επιχειρηματίες, αλλά **ΔΕΝ δημιουργούν in-app notifications** για αυτούς
2. Το σύστημα δημιουργεί in-app notifications μόνο για τους χρήστες (πελάτες)
3. Η dedicated `sendBusinessNotification` helper υπάρχει αλλά δεν χρησιμοποιείται από τις κύριες functions

## Solution

### Phase 1: Backend - Add Business In-App Notifications

Θα ενημερώσουμε τις edge functions να δημιουργούν in-app notifications για τους επιχειρηματίες:

**Functions to update:**
- `send-reservation-notification` - Προσθήκη in-app notification για business owner (new reservations, cancellations)
- `process-ticket-payment` - Προσθήκη in-app notification για business owner (ticket sales)
- `send-offer-claim-email` - Προσθήκη in-app notification για business owner (offer claims)
- `validate-qr` - Προσθήκη in-app notification για business owner (QR redemptions/check-ins)

**Παράδειγμα αλλαγής (send-reservation-notification):**
```typescript
// After sending push notification to business owner, also create in-app notification
if (businessData?.user_id && (type === 'new' || type === 'cancellation')) {
  // Existing push notification code...
  
  // NEW: Create in-app notification for business owner
  await supabase.from('notifications').insert({
    user_id: businessData.user_id,
    title: type === 'new' ? '📋 Νέα Κράτηση!' : '🚫 Ακύρωση Κράτησης',
    message: `${reservation.reservation_name} • ${formattedDateTime} • ${reservation.party_size} άτομα`,
    type: 'business',  // <-- IMPORTANT: Mark as business notification
    event_type: type === 'new' ? 'new_reservation' : 'reservation_cancelled',
    entity_type: 'reservation',
    entity_id: reservationId,
    deep_link: '/dashboard-business/reservations',
    delivered_at: new Date().toISOString(),
  });
}
```

### Phase 2: Frontend - Filter Notifications by Context

**Create new hook: `useBusinessNotifications`**
```typescript
// src/hooks/useBusinessNotifications.ts
export const useBusinessNotifications = (userId: string | undefined) => {
  // Same as useNotifications but filters: WHERE type = 'business'
  // Also subscribes to realtime for type = 'business' only
};
```

**Update `useNotifications` hook:**
```typescript
// Add optional parameter to filter by type
export const useNotifications = (userId: string | undefined, type?: 'user' | 'business') => {
  // If type = 'user': filter WHERE type != 'business'
  // If type = 'business': filter WHERE type = 'business'
  // If no type: return all (backward compatible)
};
```

**Update `UserAccountDropdown`:**
- When on `/dashboard-business/*` routes, pass `type: 'business'` to show only business notifications
- When on user routes, pass `type: 'user'` to show only personal notifications

### Phase 3: Notification Types to Create

| Action | User Gets | Business Gets |
|--------|-----------|---------------|
| New Reservation | ✅ Κράτηση επιβεβαιώθηκε | ✅ Νέα Κράτηση! |
| Reservation Cancelled | ✅ Κράτηση ακυρώθηκε | ✅ Ακύρωση Κράτησης |
| Ticket Purchase | ✅ Τα εισιτήριά σου είναι έτοιμα! | ✅ Νέα Πώληση Εισιτηρίων! |
| Offer Claimed | ✅ Προσφορά διεκδικήθηκε | ✅ Νέα διεκδίκηση προσφοράς |
| QR Check-in | - | ✅ Check-in επιτυχές |
| QR Redemption | - | ✅ Εξαργύρωση προσφοράς |

## Technical Details

### Files to Modify:

**Backend (Edge Functions):**
1. `supabase/functions/send-reservation-notification/index.ts`
2. `supabase/functions/process-ticket-payment/index.ts`
3. `supabase/functions/send-offer-claim-email/index.ts` (or the claim-offer function)
4. `supabase/functions/validate-qr/index.ts`

**Frontend:**
1. `src/hooks/useNotifications.ts` - Add type filter parameter
2. `src/components/UserAccountDropdown.tsx` - Detect route and pass correct type
3. `src/components/notifications/InAppNotificationsSheet.tsx` - Pass type from parent

### Notification Schema (Existing - No DB Changes Needed):
```sql
notifications:
  - user_id: uuid (business owner's user_id)
  - type: 'business' (to differentiate from user notifications)
  - event_type: 'new_reservation' | 'ticket_sale' | 'offer_claimed' | etc.
  - entity_type: 'reservation' | 'ticket' | 'offer'
  - deep_link: '/dashboard-business/...'
```

## Implementation Order

1. Update `useNotifications` hook with optional type filter
2. Update `UserAccountDropdown` to detect business route and pass filter
3. Update each edge function to create business in-app notifications
4. Test end-to-end with a reservation/ticket sale

## Expected Result

- **Business Dashboard**: Bell icon shows only business notifications (sales, reservations, claims)
- **My Account / User pages**: Bell icon shows only personal notifications (purchases, confirmations)
- Unread counts are separate for each context
