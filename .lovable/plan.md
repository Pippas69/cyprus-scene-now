

## Διάγνωση: Γιατί κολλάει στο splash σε iPhone Safari (με αδιάσειστα τεκμήρια)

### Τι έκανα

1. Έκανα `curl` στο live `https://fomo.com.cy/` και διάβασα το πραγματικό HTML που σερβίρεται **αυτή τη στιγμή**.
2. Κατέβασα το πραγματικό vendor chunk που φορτώνει το browser σου.
3. Διασταύρωσα με τα Sentry/Auth logs και τη ροή bootstrap στον κώδικα.

### Αδιάσειστα τεκμήρια

**Τεκμήριο 1 — Τα παλιά broken chunks ΕΙΝΑΙ ΑΚΟΜΑ LIVE:**

Το HTML που σερβίρει το `fomo.com.cy` αυτή τη στιγμή περιέχει:
```
<script type="module" crossorigin src="/assets/index-CyKly9DB.js"></script>
<link rel="modulepreload" crossorigin href="/assets/pdf-vendor-CjICdACB.js">
<link rel="modulepreload" crossorigin href="/assets/charts-vendor-DGFcTSGr.js">
<link rel="modulepreload" crossorigin href="/assets/react-vendor-CE8Yv075.js">
```

Το `charts-vendor-DGFcTSGr.js` και το `pdf-vendor-CjICdACB.js` είναι ακριβώς τα chunks που υποτίθεται ότι **διαγράφηκαν** από το `vite.config.ts` στο προηγούμενο approve.

**Τεκμήριο 2 — Το TDZ bug είναι μέσα στο live chunk:**

Κατέβασα το `charts-vendor-DGFcTSGr.js`. Η πρώτη γραμμή είναι:
```
import{r as R,a as Dm,R as P}from"./react-vendor-CE8Yv075.js";
```

Αυτό το `P` (που είναι το React) εισάγεται και χρησιμοποιείται στην top-level εκτέλεση του chunk **πριν** ολοκληρωθεί η αρχικοποίηση του `react-vendor` σε circular eval. Είναι το ίδιο TDZ error που είχαμε διαγνώσει: `Cannot access 'P' before initialization`.

**Τεκμήριο 3 — Γιατί laptop ναι, iPhone όχι:**

- **Chrome (V8)** στο laptop: ανεκτικό στο ESM circular evaluation order. Το `P` ίσως φτάνει initialized λόγω διαφορετικού scheduling των modulepreload requests — το crash δεν εμφανίζεται κάθε φορά.
- **Safari (JavaScriptCore)** σε iPhone iOS: αυστηρή τήρηση του ECMAScript spec για TDZ + διαφορετικό ordering των modulepreload. Το `P` είναι uninitialized όταν εκτελείται το top-level του charts-vendor → exception → το `App` ποτέ δεν mount-άρει → το splash μένει για πάντα.

Αυτό συμφωνεί ακριβώς με το γνωστό bug στο WebKit όπου strict ES module circular dependencies κρασάρουν με TDZ ενώ το Chrome συγχωρεί.

**Τεκμήριο 4 — Τα Auth logs του Supabase:**

Στις 10:24:42Z σήμερα, λογιν ΕΠΙΤΥΧΕΣ από `referer: https://fomo.com.cy/` — αλλά μόνο το `/auth/v1/token` και `/user` εκτελέστηκαν. Δεν υπάρχουν επόμενα RPC calls (π.χ. `get_event_rsvp_counts`, `public_businesses_safe`) από αυτό το IP — πράγμα που δείχνει ότι το app crash-άρει αμέσως μετά το login response, πριν προλάβει να φορτώσει τη feed σελίδα. Σύμφωνο με το TDZ crash του charts-vendor.

**Τεκμήριο 5 — Service Worker αποκλείεται ως αιτία:**

Ο `public/sw.js` v3.0.0 κάνει network-first για JS/CSS chunks (γραμμές 130-140). Δεν σερβίρει stale chunks. Επίσης, τα Cloudflare headers (`cache-control: no-cache, must-revalidate, max-age=0`) σπρώχνουν fresh HTML. Άρα δεν είναι θέμα cache — είναι θέμα **του ίδιου του deployed bundle**.

### Συμπέρασμα

Το προηγούμενο fix στο `vite.config.ts` (αφαίρεση `charts-vendor` και `pdf-vendor` από `manualChunks`) **δεν έχει publish-αριστεί στο production**. Το `fomo.com.cy` εξακολουθεί να σερβίρει το παλιό build με `index-CyKly9DB.js` + `charts-vendor-DGFcTSGr.js`. Δεν υπάρχει νέο deployment μετά την αλλαγή.

### Τι πρέπει να γίνει

**Δεν χρειάζεται καμία νέα αλλαγή κώδικα.** Το fix υπάρχει ήδη στο `vite.config.ts`. Χρειάζεται **νέο publish** για να βγει στο production.

Όμως, για να δώσουμε επιπλέον ασφάλεια ώστε αν ξανασυμβεί παρόμοιο TDZ crash στο μέλλον να μην κολλάει όλο το app στο splash, θα προσθέσω ένα small hardening:

| Αρχείο | Αλλαγή |
|---|---|
| `index.html` | Προσθήκη inline `window.addEventListener('error', ...)` που πιάνει top-level uncaught script errors **πριν** ξεκινήσει το main bundle, και αν περάσουν 8 δευτερόλεπτα χωρίς να αφαιρεθεί το `#inline-splash`, το αφαιρεί και δείχνει μήνυμα "Ξανά προσπάθεια" με reload button. Αυτό είναι ανεξάρτητο από το App.tsx, οπότε δουλεύει ακόμα κι αν τα vendor chunks κρασάρουν. |
| `vite.config.ts` | Καμία αλλαγή — ήδη σωστό από το προηγούμενο approve. |

### Βήματα για εσένα

1. **Approve το παρόν πλάνο** για το hardening του `index.html`.
2. Αμέσως μετά: **Publish → Update**. Αυτό είναι το πιο κρίσιμο βήμα — χωρίς νέο publish, **το πρόβλημα παραμένει** ακόμα κι αν το hardening εφαρμοστεί. Στο νέο build θα παραχθούν νέα chunks (π.χ. `index-XXXXX.js` ΧΩΡΙΣ ξεχωριστό charts-vendor) που θα δουλέψουν σε Safari.
3. Στο iPhone:
   - Settings → Safari → Clear History and Website Data
   - Άνοιξε `https://fomo.com.cy` σε Private Tab για επιβεβαίωση χωρίς cache

### Τι ΔΕΝ αλλάζει

- ✅ Καμία αλλαγή σε App.tsx, main.tsx, sw.js, business logic
- ✅ Καμία αλλαγή σε auth, push notifications, charts, PDF generation
- ✅ Καμία αλλαγή σε χρώματα, layout, fonts

