

# Πλάνο: Phase 2 — Realtime Updates σε 3 σημεία ταυτόχρονα

## Στόχος
Όλα τα critical business dashboards να ενημερώνονται **instant (<1 sec)** χωρίς manual refresh, διατηρώντας **100% την υπάρχουσα λειτουργικότητα** (zero-regression).

---

## Αρχιτεκτονική

Ακολουθούμε **το ίδιο pattern** που ήδη υπάρχει και δουλεύει στο `useRealtimeCrm.ts` και `useRealtimeNotifications.ts`:
- Supabase Realtime channel subscription
- Debounced (300ms) `queryClient.invalidateQueries` για να αποφύγουμε spam re-renders
- Per-business filtering για ασφάλεια & performance
- Auto cleanup στο unmount

---

## Τι αλλάζει

### 1. ΝΕΟ αρχείο: `src/hooks/useRealtimeEventCheckins.ts`
Generic realtime hook που:
- Δέχεται `businessId` (required) και προαιρετικό `eventId`
- Subscribes σε: `tickets`, `reservations`, `reservation_scans`, `reservation_guests`, `ticket_orders`, `rsvps`
- Φιλτράρει per business (μέσω event lookup όπου χρειάζεται, όπως ήδη κάνει το `useRealtimeCrm`)
- Invalidates τα query keys: `business-stats`, `business-events`, `ticket-sales`, `event-checkins`, `combined-overview`
- Debounce 300ms

### 2. Integration σε `CombinedTicketReservationOverview.tsx`
- Προσθήκη `useRealtimeEventCheckins(businessId, eventId)` στο top του component
- Καμία αλλαγή σε queries / UI / λογική

### 3. Integration σε `EventsList.tsx` (business dashboard)
- Προσθήκη `useRealtimeEventCheckins(businessId)` (χωρίς eventId → ακούει όλα τα events του business)
- Καμία αλλαγή σε υπάρχουσα λογική

### 4. Integration σε `DashboardBusiness.tsx` + `TicketSales.tsx`
- Προσθήκη του ίδιου hook στο top-level
- Τα KPIs ανανεώνονται αυτόματα όταν αλλάζει οτιδήποτε

### 5. Migration: Enable realtime publication
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE reservation_scans;
ALTER PUBLICATION supabase_realtime ADD TABLE reservation_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;
```
(Με `IF NOT EXISTS`-style guard για να μη σπάσει αν κάποιος πίνακας είναι ήδη μέσα.)

---

## Zero-Regression Guarantees

| Τι | Status |
|---|---|
| Business logic / υπολογισμοί | ❌ Καμία αλλαγή |
| RLS / security policies | ❌ Καμία αλλαγή |
| Checkout / payment flow | ❌ Καμία αλλαγή |
| QR scan flow + Option A rate limit bypass | ❌ Καμία αλλαγή |
| Edge functions | ❌ Καμία αλλαγή |
| Υπάρχοντα `useRealtimeCrm` / `useRealtimeNotifications` | ❌ Καμία αλλαγή (συνυπάρχουν) |
| Query keys / React Query setup | ❌ Καμία αλλαγή (μόνο invalidations) |

---

## Τι θα δεις live μετά

- **Doorman σαρώνει QR στην είσοδο** → ο owner στο γραφείο βλέπει αμέσως +1 check-in counter
- **Online ticket sale** → live increment στο `EventsList` και `TicketSales`
- **Νέα κράτηση** → εμφανίζεται αμέσως στο `CombinedTicketReservationOverview`
- **KPIs στο `DashboardBusiness`** → ζωντανά (έσοδα, πωλήσεις σήμερα, ενεργές κρατήσεις)

---

## Επόμενα βήματα μετά την έγκριση

1. Switch σε default mode
2. Δημιουργία hook `useRealtimeEventCheckins.ts`
3. Integration στα 4 components (1 hook call ανά component)
4. Migration για το realtime publication
5. Παράδοση με οδηγία να δοκιμάσεις: άνοιξε dashboard σε ένα tab, κάνε scan/sale από άλλη συσκευή, δες live update

