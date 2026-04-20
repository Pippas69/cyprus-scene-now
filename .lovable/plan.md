

# Πλάνο: Reset Δεδομένων για Kaliva on the Beach

## Στόχος
Πλήρης μηδενισμός όλων των testing δεδομένων του business **Kaliva on the beach** (`f39d1fff-32bb-40d0-b00f-8194178bab97`), διατηρώντας ανέπαφο το ίδιο το business account, τον owner, το subscription και τους followers.

---

## Τι ΔΙΑΤΗΡΕΙΤΑΙ (Zero-Touch)

- ✅ Το `businesses` row (όνομα, email, λογότυπο, cover, κατηγορία, city, verified status, θέση στο feed)
- ✅ Ο `auth.users` του owner + `profiles` row + το login
- ✅ Active subscription tier + `business_pricing` profile
- ✅ Όλοι οι **followers** του business
- ✅ Reviews/ratings (αν υπάρχουν — δεν πειράζονται)

---

## Τι ΣΒΗΝΕΤΑΙ (Cascade Cleanup)

Με βάση το read-only count που έτρεξα:

| Πίνακας | Εγγραφές προς διαγραφή |
|---|---|
| `events` | 4 |
| `tickets` | 71 |
| `ticket_orders` (+ items) | 27 |
| `reservations` | 19 |
| `reservation_guests` | (όλα τα linked) |
| `reservation_scans` | (όλα τα linked) |
| `crm_guests` | 67 |
| `event_invitations` | 0 (κενό, αλλά καλύπτεται) |
| `discounts` | 0 (κενό, αλλά καλύπτεται) |
| `boosts` / `boost_*` | όσα ενεργά |
| `notifications` σχετικά με τα events | όλα |
| `analytics_events` σχετικά | όλα |
| `refund_requests` σχετικά | όλα |

---

## Σειρά εκτέλεσης (Layered Teardown — Zero-Trace Protocol)

Ακολουθώ το υπάρχον **Zero-Trace Deletion Protocol** που ήδη χρησιμοποιεί η πλατφόρμα, σε σωστή σειρά FK dependencies:

```text
Layer 1 (deepest children):
  → reservation_scans (where reservation belongs to Kaliva event)
  → reservation_guests
  → ticket_order_items
  → refund_requests (linked σε tickets/reservations του Kaliva)

Layer 2 (mid-level):
  → tickets (event_id IN Kaliva events)
  → reservations (event_id IN Kaliva events)
  → ticket_orders (event_id IN Kaliva events)
  → event_invitations (event_id IN Kaliva events)
  → boosts (event_id IN Kaliva events)
  → analytics_events (event_id IN Kaliva events)
  → notifications (related_event_id IN Kaliva events)

Layer 3 (business-level children):
  → discounts (business_id = Kaliva)
  → crm_guests (business_id = Kaliva)
  → events (business_id = Kaliva)

✅ STOP. Δεν αγγίζουμε businesses, profiles, auth.users, subscriptions,
   business_followers, business_pricing.
```

---

## Πώς θα εκτελεστεί

**Επειδή είναι DELETE operations**, χρειάζεται **migration** (όχι insert tool, όχι read query). Θα φτιάξω **ένα μοναδικό migration** με όλα τα DELETE statements σε σωστή σειρά, μέσα σε implicit transaction (αν αποτύχει ένα, όλα γίνονται rollback).

Το migration θα περιλαμβάνει:
1. Hardcoded `business_id = 'f39d1fff-32bb-40d0-b00f-8194178bab97'`
2. CTE με τα event IDs του Kaliva για να γίνουν τα joins σωστά
3. DELETE σε σωστή ιεραρχική σειρά (Layer 1 → 2 → 3)
4. Final verification query (counts) για επιβεβαίωση ότι όλα μηδενίστηκαν

---

## Verification μετά την εκτέλεση

Μετά την έγκριση του migration θα ξανατρέξω read query που θα επιβεβαιώνει:
- `events` count = 0 ✅
- `tickets` / `reservations` / `ticket_orders` count = 0 ✅
- `crm_guests` count = 0 ✅
- `businesses` row υπάρχει ακόμα ✅
- `business_followers` count = αμετάβλητο ✅
- Owner μπορεί να συνδεθεί ✅

---

## Τι ΔΕΝ αλλάζει στον κώδικα (Zero-Regression)

- ❌ Καμία αλλαγή σε frontend
- ❌ Καμία αλλαγή σε edge functions
- ❌ Καμία αλλαγή σε RLS policies
- ❌ Καμία αλλαγή σε schema (μόνο data delete)
- ❌ Καμία αλλαγή στο Realtime / Phase 2 plan που εκκρεμεί

---

## Επόμενα βήματα μετά την έγκριση

1. Switch σε default mode → δημιουργία migration με όλα τα DELETE
2. Εκτέλεση migration (θα ζητηθεί η τυπική επιβεβαίωσή σου από το Lovable migration tool)
3. Verification query για να επιβεβαιώσω ότι όλα μηδενίστηκαν
4. Ο owner του Kaliva συνδέεται και βρίσκει άδειο dashboard, έτοιμο για πραγματικά δεδομένα

Μετά από αυτό, **επιστρέφουμε στο Phase 2 (Realtime) που είχαμε αφήσει στη μέση**.

