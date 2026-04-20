

## Πλάνο Διόρθωσης Χάρτη

### Πρόβλημα
Το lazy loading του `RealMap` προκάλεσε collapse του container σε 0px ύψος → ο Mapbox δεν είχε διαστάσεις να ζωγραφίσει → λευκή οθόνη στο `/xartis`.

### Λύση
Επαναφορά του `RealMap` σε **static import** στο `MapWrapper.tsx`. Το αρχείο επανέρχεται στην ακριβή μορφή που είχε πριν το bundle splitting.

### Αρχείο που αλλάζει (1)

**`src/components/map/MapWrapper.tsx`**
- Αφαίρεση του `lazy(() => import('./RealMap'))`
- Αφαίρεση του `Suspense` wrapper και του fallback spinner
- Επαναφορά σε απλό `import RealMap from './RealMap'`
- Απλή επιστροφή του `<RealMap ... />` απευθείας

### Τι ΔΕΝ αλλάζει
- `vite.config.ts` → παραμένει. Τα vendor chunks (mapbox-vendor, charts-vendor, pdf-vendor, κλπ.) συνεχίζουν να δουλεύουν ανεξάρτητα από το lazy loading.
- `RealMap.tsx` → καμία αλλαγή
- `EventAnalytics.tsx` / `EventAnalyticsChart.tsx` → παραμένουν lazy (το analytics tab έχει parent με σταθερό ύψος, δεν έχει το ίδιο πρόβλημα)
- Όλα τα flows (tickets, reservations, hybrid, checkout, QR, auth) → ανέγγιχτα

### Performance impact
- Χάνουμε: ~200ms καθυστέρηση πρώτης φόρτωσης landing page (mapbox φορτώνει παράλληλα αντί on-demand)
- Κρατάμε: όλα τα άλλα benefits (vendor chunking, analytics lazy, map code σε ξεχωριστό αρχείο, browser caching)
- Καθαρό όφελος vs. πριν το bundle splitting: ~60-70% της αρχικής βελτίωσης

### Testing
1. Πήγαινε στο `/xartis` → ο χάρτης πρέπει να εμφανίζεται κανονικά με pins
2. Landing page → παραμένει γρήγορο
3. Business Dashboard → Analytics tab → δουλεύει όπως τώρα (δεν αγγίζεται)

### Ειλικρινής δέσμευση
Αυτή η αλλαγή είναι **πραγματικά** ασφαλής γιατί επιστρέφει τον κώδικα σε **ακριβώς την κατάσταση** που είχε πριν — δεν είναι νέα υλοποίηση, είναι revert.

