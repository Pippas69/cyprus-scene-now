# Memory: features/analytics/visit-and-customer-attribution-el
Updated: now

Το σύστημα 'Analytics & CRM' χρησιμοποιεί τον πίνακα 'crm_guests' ως την αποκλειστική πηγή αλήθειας (source of truth) για τη μέτρηση των πελατών:
1) Πελάτες (Customers): Σύνολο των μοναδικών εγγραφών (covers) — εγγεγραμμένοι και ghost.
2) Επιστρέφοντες (Returning %): Εγγεγραμμένοι χρήστες (user_id) με 2 ή περισσότερες διακριτές επισκέψεις.
3) Επισκέψεις (Visits): Το σύνολο των επαληθευμένων check-ins. Εφαρμόζεται λογική deduplication: αν ένας χρήστης έχει και εισιτήριο και κράτηση για την ίδια ακριβώς εκδήλωση, η ενέργεια προσμετράται ως μία (1) επίσκεψη για την αποφυγή διπλοεγγραφών στα analytics και στο CRM.

**Unified Dedup Model (v2):**
- Η deduplication εφαρμόζεται σε ΟΛΕΣ τις πηγές: `get_crm_guest_stats` (SQL), `get_audience_demographics` (SQL), `useOverviewMetrics`, `usePerformanceMetrics`, `useBoostValueMetrics`.
- Κανόνας: ίδιο user_id + ίδιο event_id = 1 επίσκεψη (ticket+reservation μετράνε μία φορά).
- Non-event visits (profile reservations, offers, student) δεν γίνονται dedup μεταξύ τους (είναι ανεξάρτητα flows).

**User-First Identity Matching:**
- Στο `get_crm_guest_stats`, τα tickets και το spend χρησιμοποιούν `COALESCE(user_match, name_match)` (user-first), ΟΧΙ name-first.
- Στο CRM ingestion (`sync_crm_guest_from_ticket_data`, `auto_create_crm_guest_from_reservation`), αν υπάρχει user_id, ΠΑΝΤΑ γίνεται link στο registered profile ανεξάρτητα από το όνομα που πληκτρολογήθηκε.
