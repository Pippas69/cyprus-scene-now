

## Διάγνωση: Γιατί κολλάει στο splash στο fomo.com.cy

### Απόδειξη (από browser console του live site)

Άνοιξα το `https://fomo.com.cy` σε καθαρό browser session. Το app crash-άρει αμέσως μετά τη φόρτωση των chunks με:

```
Uncaught ReferenceError: Cannot access 'P' before initialization
  at https://fomo.com.cy/assets/charts-vendor-DGFcTSGr.js:1:22655
```

Αυτό **δεν είναι** πρόβλημα service worker, ούτε chunk download error, ούτε CSP. Είναι **bundling bug**:
- Το `charts-vendor` chunk προσπαθεί να χρησιμοποιήσει τη μεταβλητή `P` (πιθανότατα `prop-types` ή ένα recharts internal) **πριν αρχικοποιηθεί**.
- Όταν crash-άρει το vendor chunk, το `App.tsx` ποτέ δεν εκτελείται, άρα ο `useEffect` που αφαιρεί το `#inline-splash` ποτέ δεν τρέχει.
- Αποτέλεσμα: μένει για πάντα στο splash screen (το failsafe των 4500ms του App.tsx επίσης δεν τρέχει — βρίσκεται μέσα στο App component που ποτέ δεν mount-άρει).

### Γιατί συμβαίνει τώρα

Το `vite.config.ts` χωρίζει τα node_modules σε manual chunks:
- `react-vendor` → react, react-dom, react-router, scheduler, react-is, use-sync-external-store
- `charts-vendor` → recharts + d3 + victory-vendor

Όμως το recharts εξαρτάται από επιπλέον packages που **δεν** ταξινομούνται ρητά (`prop-types`, `react-smooth`, `react-transition-group`, διάφορα lodash internals). Το Rollup τα τοποθετεί σε ένα κοινό auto-chunk με **κυκλική εξάρτηση** μεταξύ `charts-vendor` και αυτού του chunk → ESM `let/const` TDZ violation → "Cannot access 'P' before initialization".

Το ίδιο comment μέσα στο `vite.config.ts:31-33` προειδοποιεί ακριβώς γι' αυτό το σφάλμα ("Cannot access 'S' before initialization"). Σήμερα είναι 'P' αντί 'S' — διαφορετικός ελάχιστος bundle, ίδιο root cause.

### Πρόταση διόρθωσης (μικρή, στοχευμένη, μηδενική επίδραση σε λειτουργικότητα)

**Μοναδική αλλαγή:** `vite.config.ts` — διόρθωση των manual chunks ώστε όλα τα recharts dependencies να κατοικούν στο **ίδιο** chunk με το recharts, αποφεύγοντας τα κυκλικά imports.

**Συγκεκριμένα:**

1. Επέκταση του `charts-vendor` matcher να συμπεριλαμβάνει:
   - `prop-types`
   - `react-smooth`
   - `react-transition-group`
   - `decimal.js-light`
   - `tiny-invariant`
   - `eventemitter3`
   - `fast-equals`
   - `lodash` και `lodash-es` (όταν προέρχονται από recharts dependency tree)

2. Εναλλακτικά (πιο ασφαλές): **απενεργοποίηση του `manualChunks`** για τα προβληματικά vendors και αφήνουμε το Vite/Rollup να αποφασίσει αυτόματα. Συγκεκριμένα, αφαίρεση των γραμμών 45-46 (`charts-vendor` και `pdf-vendor`). Τα Charts θα συνενωθούν στα route chunks όπου χρησιμοποιούνται (Admin Analytics, Business Analytics) — που έτσι κι αλλιώς είναι lazy-loaded.

**Συνιστώμενη επιλογή: η εναλλακτική (#2)**, γιατί:
- Λύνει οριστικά το TDZ initialization order issue.
- Δεν χάνεται performance: το recharts φορτώνεται μόνο όταν ο χρήστης μπει στα analytics dashboards (όχι στην αρχική σελίδα).
- Δεν αγγίζει κανέναν runtime κώδικα — μόνο build configuration.

### Τι ΔΕΝ αλλάζει

- ✅ Καμία αλλαγή στο `App.tsx`, `main.tsx`, `sw.js`, `index.html`
- ✅ Καμία αλλαγή σε business logic, routes, χάρτη, χρώματα, UI
- ✅ Push notifications, offline page, PWA installability παραμένουν αμετάβλητα
- ✅ Recharts components (Admin Analytics, Business Analytics, Audience Insights, Ticket Analytics, Event Analytics, RSVP Analytics) συνεχίζουν να δουλεύουν κανονικά

### Τεχνικές λεπτομέρειες (developer notes)

| Αρχείο | Γραμμές | Αλλαγή |
|---|---|---|
| `vite.config.ts` | 45-46 | Αφαίρεση των rules για `charts-vendor` και `pdf-vendor`. Τα chunks θα δημιουργηθούν αυτόματα από το Rollup με σωστή initialization order. |

Το αποτέλεσμα bundle:
- `react-vendor` → παραμένει (προστατεύει react core)
- `mapbox-vendor`, `supabase-vendor`, `ui-vendor`, `query-vendor` → παραμένουν (αυτά δεν έχουν circular deps)
- Recharts + d3 → θα συγχωνευθούν στα lazy-loaded route chunks (AdminAnalytics, business analytics components)
- jspdf/html2canvas/xlsx → ίδιο: συγχωνεύονται στα route chunks που τα χρησιμοποιούν

### Μετά την εφαρμογή

1. **Apply changes**
2. **Publish → Update**
3. Δοκιμή σε incognito → η αρχική σελίδα φορτώνει κανονικά
4. Δοκιμή πλοήγησης στα `/admin/analytics` και `/dashboard-business/analytics` για επιβεβαίωση ότι τα γραφήματα συνεχίζουν να εμφανίζονται

### Σημαντικό για εσένα

Επειδή το browser σου ίσως έχει cached το παλιό σπασμένο `charts-vendor-DGFcTSGr.js`:
- Σε **incognito** θα δουλέψει αμέσως
- Σε κανονικό tab: hard refresh (Cmd+Shift+R) ή clear site data
- Σε iPhone Safari: Settings → Safari → Clear History and Website Data

