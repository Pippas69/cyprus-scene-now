# Memory: features/business/boost-management-pause-deactivate-v1-el
Updated: now

Η Διαχείριση Προωθήσεων (Boost Management) για Εκδηλώσεις και Προσφορές διαθέτει δύο κύρια κουμπιά δράσης για ενεργές προωθήσεις:

**1) Κουμπί Παύσης (Pause Button - Πράσινο/Outline)**
- Τοποθετείται δίπλα στη κόστος της προώθησης
- Υπολογίζει τον χρόνο χρήσης (rounded UP) και αποθηκεύει τον χρόνο που απομένει ("frozen time")
- Αλλάζει το status της προώθησης σε "paused"
- Αποθηκεύει το frozen_hours/frozen_days στη βάση δεδομένων
- Κατά τη δημιουργία νέας προώθησης, εμφανίζεται dialog "Do you want to use frozen time?"

**2) Κουμπί Απενεργοποίησης (Deactivate Button - Κόκκινο/Destructive)**
- Τοποθετείται δίπλα στο κουμπί Pause
- Υπολογίζει την αχρησιμοποίητη αξία (remaining value)
- Εφαρμόζει διαφορετικές πολιτικές επιστροφής ανάλογα με το πλάνο:
  - **Free Plan**: Κανένα refund, απώλεια χρημάτων
  - **Paid Plans (Credits Only)**: Pro-rata refund στο monthly_budget_remaining_cents
  - **Paid Plans (Stripe Top-up)**: Όλη η αχρησιμοποίητη αξία (credits + stripe) μετατρέπεται σε credits
- Διαγράφει τη προώθηση από τη βάση δεδομένων (deactivate)
- Η προώθηση εξαφανίζεται από το dashboard

**Edge Functions:**
- `pause-event-boost` - Υπολογίζει frozen time για event boosts
- `deactivate-event-boost` - Διαγράφει event boost και επιστρέφει χρήματα
- `pause-offer-boost` - Υπολογίζει frozen time για offer boosts
- `deactivate-offer-boost` - Διαγράφει offer boost και επιστρέφει χρήματα

**Database Fields:**
- `event_boosts.frozen_hours` (integer, default 0)
- `event_boosts.frozen_days` (integer, default 0)
- `offer_boosts.frozen_hours` (integer, default 0)
- `offer_boosts.frozen_days` (integer, default 0)
