# Memory: technical/boost-transactional-safety-logic-el
Updated: now

Οι edge functions δημιουργίας προώθησης (create-event-boost, create-offer-boost, κλπ.) ακολουθούν μια αυστηρή σειρά πράξεων για τη διασφάλιση της οικονομικής ακρίβειας: 1) Δημιουργία της εγγραφής boost πρώτα, 2) Αφαίρεση του ποσού από το subscription budget ή προώθηση στο Stripe, και 3) 'Best-effort' rollback (διαγραφή του boost) αν η αφαίρεση του budget αποτύχει. Οι τιμές 'targeting_quality' στη βάση δεδομένων είναι ακέραιοι σε κλίμακα 1-5 (Standard: 4, Premium: 5). Για τα subscription-based boosts, χρησιμοποιείται η τιμή 'source: subscription' και 'commission_percent: 0' (για προσφορές).

## Fallback Activation Flow (Free Plan / Stripe Purchase)
Όταν ένας χρήστης free plan πληρώνει για boost μέσω Stripe, η εγγραφή δημιουργείται με `status: "pending"`. Επειδή το Stripe webhook μπορεί να καθυστερήσει ή να μην φτάσει, υπάρχει fallback μηχανισμός: Όταν ο χρήστης επιστρέφει στο dashboard με `?boost=success`, το frontend καλεί τη συνάρτηση `activate-pending-boost` η οποία:
1. Βρίσκει το πιο πρόσφατο pending boost (event ή offer) με `source: "purchase"`
2. Ενημερώνει το status σε `"active"` (αν `start_date <= now`) ή `"scheduled"`
3. Για offer boosts, ενημερώνει επίσης `active: true`

Αυτό διασφαλίζει ότι τα boosts ενεργοποιούνται αξιόπιστα ανεξάρτητα από το webhook.
