# Memory: features/analytics/boost-management-visits-attribution-v1
Updated: now

Το Boost Management section υπολογίζει τις επισκέψεις (visits) με βάση την ώρα **απόκτησης** (αγορά εισιτηρίου, κράτηση, ή διεκδίκηση προσφοράς), ΟΧΙ την ώρα check-in/redemption:

**Events:**
- Ticket visits: Μετράει εισιτήρια που **αγοράστηκαν** κατά τη διάρκεια του boost period (`tickets.created_at` εντός window) ΚΑΙ έγινε check-in (`checked_in_at IS NOT NULL`)
- Reservation visits: Μετράει κρατήσεις που **δημιουργήθηκαν** κατά τη διάρκεια του boost period (`reservations.created_at` εντός window) ΚΑΙ έγινε check-in (`checked_in_at IS NOT NULL`)

**Offers:**
- Visits: Μετράει διεκδικήσεις που **έγιναν** κατά τη διάρκεια του boost period (`offer_purchases.created_at` εντός window) ΚΑΙ εξαργυρώθηκαν (`redeemed_at IS NOT NULL`)

Αυτή η λογική διασφαλίζει ότι οι επισκέψεις αποδίδονται σωστά στην προωθητική καμπάνια που οδήγησε τον χρήστη στην απόκτηση, ανεξάρτητα από το πότε έγινε η φυσική επίσκεψη. Είναι συνεπής με τη λογική του `useBoostValueMetrics.ts` για τα analytics tabs.
