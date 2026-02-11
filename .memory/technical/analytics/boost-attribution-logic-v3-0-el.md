# Memory: technical/analytics/boost-attribution-logic-v3-0-el
Updated: now

Η απόδοση για προβολές, αλληλεπιδράσεις, επισκέψεις και έσοδα βασίζεται αυστηρά στην κατάσταση boost της εκδήλωσης/προσφοράς κατά τη στιγμή της **αρχικής ενέργειας του χρήστη**:

- **Events**: Η απόδοση καθορίζεται από το `created_at` της αγοράς εισιτηρίου ή της κράτησης. Αν η αγορά/κράτηση έγινε ενώ ήταν boosted, ΟΛΕΣ οι προκύπτουσες μετρήσεις (check-ins, visits) αποδίδονται μόνιμα ως 'Boosted', ανεξάρτητα αν το boost έληξε ή απενεργοποιήθηκε τη στιγμή του check-in.

- **Offers**: Η απόδοση καθορίζεται από το `created_at` της εξαργύρωσης (claim/purchase), ΟΧΙ από το `redeemed_at` (QR check-in). Αν η εξαργύρωση έγινε ενώ η προσφορά ήταν boosted, η επίσκεψη (QR check-in) αποδίδεται ως 'Boosted' για πάντα.

**ΚΡΙΤΙΚΟΣ ΚΑΝΟΝΑΣ**: Η στιγμή της αρχικής ενέργειας (αγορά, κράτηση, εξαργύρωση) καθορίζει την απόδοση **ΓΙΑ ΠΑΝΤΑ**. Το check-in/visit κληρονομεί πάντα το boost status του parent action. Αν ένα event/offer φύγει από boost και ξαναγίνει boost, κάθε ενέργεια αποδίδεται στο status που ίσχυε τη στιγμή εκείνη.

Για τα ωριαία boosts, το παράθυρο ξεκινά ακριβώς από το 'created_at' του boost. Τα analytics περιλαμβάνουν δεδομένα από 'active', 'completed' και 'canceled' boosts.

**Files affected**: useBoostValueMetrics.ts, useBoostComparison.ts, useGuidanceMetrics.ts
