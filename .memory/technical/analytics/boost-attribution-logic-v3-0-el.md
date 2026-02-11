# Memory: technical/analytics/boost-attribution-logic-v3-0-el
Updated: now

Η απόδοση για προβολές, αλληλεπιδράσεις, επισκέψεις και έσοδα βασίζεται αυστηρά στην κατάσταση boost της εκδήλωσης/προσφοράς κατά τη στιγμή της **αρχικής ενέργειας του χρήστη**:

- **Events**: Η απόδοση καθορίζεται από το `created_at` της αγοράς εισιτηρίου ή της κράτησης. Αν η αγορά/κράτηση έγινε ενώ ήταν boosted, ΟΛΕΣ οι προκύπτουσες μετρήσεις (check-ins, visits) αποδίδονται μόνιμα ως 'Boosted'.

- **Offers**: Η απόδοση καθορίζεται από το `created_at` της εξαργύρωσης (claim/purchase), ΟΧΙ από το `redeemed_at` (QR check-in).

**ΚΡΙΤΙΚΟΣ ΚΑΝΟΝΑΣ**: Η στιγμή της αρχικής ενέργειας (αγορά, κράτηση, εξαργύρωση) καθορίζει την απόδοση **ΓΙΑ ΠΑΝΤΑ**. Το check-in/visit κληρονομεί πάντα το boost status του parent action.

**DEACTIVATED BOOSTS**: Τα `deactivated` boosts ΠΡΕΠΕΙ να συμπεριλαμβάνονται στα analytics queries (μαζί με active/completed/canceled). Το boost window κόβεται στο `updated_at` (ώρα απενεργοποίησης) αντί να χρησιμοποιεί το αρχικό `end_date`. Η συνάρτηση `computeBoostWindow` δέχεται `deactivated_at` parameter για αυτό. Στο BoostManagement, η `getBoostWindow` κάνει το ίδιο check.

**Files affected**: boostWindow.ts, useBoostValueMetrics.ts, useBoostComparison.ts, useGuidanceMetrics.ts, BoostManagement.tsx
