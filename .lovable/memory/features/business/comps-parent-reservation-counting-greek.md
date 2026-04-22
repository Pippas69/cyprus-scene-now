---
name: comps-parent-reservation-counting-greek
description: Comp guests μετράνε ως πρόσθετα άτομα της parent κράτησης (sum party_size), ποτέ ως ξεχωριστές κρατήσεις σε counts/notifications/lists.
type: feature
---
Όταν ο επιχειρηματίας προσθέτει δωρεάν καλεσμένους (comps) σε μια υπάρχουσα κράτηση:

1. **DB**: Η edge function `add-comp-guests` δημιουργεί child rows με `is_comp=true` + `parent_reservation_id` και αυξάνει το `party_size` του parent (status `accepted`).
2. **Counts/Stats** (παντού: `useBusinessStats`, `ReservationDashboard.buildEventCounts`, `EventReservationOverview`, `CombinedTicketReservationOverview`):
   - Φιλτράρουμε out τα comp rows (`is_comp.eq.false` ή `parent_reservation_id IS NULL`).
   - Μετράμε **sum(party_size)** των parent rows — όχι row count — ώστε να αντικατοπτρίζονται οι comps μέσω του ενημερωμένου parent.party_size.
3. **Check-ins**: Το `EventReservationOverview.checkedIn` = used tickets + sum(party_size) reservations με `checked_in_at`. Το realtime hook `useRealtimeEventCheckins` invalidates `event-reservation-overview` & `combined-overview` ώστε το UI να ενημερώνεται instant.
4. **Notifications**: Το `useRealtimeNotifications` αγνοεί payloads με `is_comp=true` ή `parent_reservation_id` — δεν δείχνουμε "νέα κράτηση" toast.
5. **Lists**: Το `DirectReservationsList` κρύβει τα comp rows από την κύρια λίστα και τα εμφανίζει ως sub-line κάτω από την parent κράτηση.
