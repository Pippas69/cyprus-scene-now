# Memory: technical/analytics/boost-metrics-window-refinement-el
Updated: now

Για τις ημερήσιες προωθήσεις (non-hourly boosts), το παράθυρο έναρξης των analytics περιορίζεται (cap) από το timestamp `boost.created_at` **μέσα στη συνάρτηση `computeBoostWindow`** στο `boostWindow.ts`. Αυτό σημαίνει ότι ΟΛΟΙ οι consumers (useBoostValueMetrics, useBoostComparison, useGuidanceMetrics, BoostManagement) αυτόματα λαμβάνουν τη σωστή αρχή παραθύρου.

Επιπλέον, το `useBoostComparison.ts` αντικαταστάθηκε ώστε να χρησιμοποιεί `computeBoostWindow` + `isTimestampWithinWindow` αντί για δική του ad-hoc λογική, εξαλείφοντας inconsistencies μεταξύ των tabs.

**ΚΡΙΤΙΚΟΣ ΚΑΝΟΝΑΣ**: Κανένα analytics module δεν πρέπει να υπολογίζει boost windows χειροκίνητα. Πρέπει ΠΑΝΤΑ να χρησιμοποιεί `computeBoostWindow` από `@/lib/boostWindow`.
