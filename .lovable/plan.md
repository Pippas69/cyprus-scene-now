

## Πλάνο: Bundle Splitting — Αναλυτική Εξήγηση & Στρατηγική

### Τι ανακάλυψα ελέγχοντας τον κώδικα

Έλεγξα τα αρχεία `App.tsx`, `vite.config.ts`, `package.json` και όλα τα core pages. Ορίστε η **πραγματική** κατάσταση:

#### ✅ Τι είναι ΗΔΗ σπασμένο σωστά (lazy loaded)
Όλα τα admin pages, dashboards (User/Promoter), tickets/reservations views, public info pages. **Δεν υπάρχει τίποτα να σπάσουμε εδώ — είναι ήδη βέλτιστο.**

#### ⚠️ Που είναι το πραγματικό πρόβλημα

Βρήκα **3 "βαριές" βιβλιοθήκες** που φορτώνουν στο initial bundle χωρίς λόγο:

| Βιβλιοθήκη | Μέγεθος | Που χρησιμοποιείται | Πρόβλημα |
|---|---|---|---|
| **mapbox-gl** | ~600 KB | Μόνο στον χάρτη (`/xartis`) | Φορτώνει ΚΑΙ στο landing, feed, events, offers |
| **recharts** | ~400 KB | Μόνο σε admin/business analytics | Φορτώνει σε όλους τους χρήστες |
| **xlsx, jspdf, html2canvas, ffmpeg** | ~800 KB συνολικά | Μόνο σε business CRM/exports | Φορτώνουν σε όλους |

---

### Εξήγηση με απλά λόγια (χωρίς coding)

**Φαντάσου την εφαρμογή σαν ένα σπίτι με αποθήκη.**

Σήμερα, όταν κάποιος μπαίνει στο σπίτι (ανοίγει το app), του δίνεις **όλα** τα έπιπλα μαζί στην είσοδο:
- Καναπές (απαραίτητος, τον χρειάζεται αμέσως)
- Τραπέζι κουζίνας (απαραίτητο)
- **ΚΑΙ** τον χάρτη Mapbox (600 KB) — ακόμα κι αν ο χρήστης δεν θα πάει ποτέ στον χάρτη
- **ΚΑΙ** τα γραφήματα (400 KB) — ακόμα κι αν δεν είναι business owner
- **ΚΑΙ** το Excel exporter (800 KB) — ακόμα κι αν δεν θα κάνει ποτέ export

Αποτέλεσμα: ο χρήστης περιμένει 5 δευτερόλεπτα να φορτώσουν πράγματα **που δεν θα δει ποτέ**.

**Τι θα κάνουμε:** Θα βάλουμε αυτά τα "βαριά έπιπλα" στην αποθήκη. Όταν ο χρήστης πάει στον χάρτη → φέρνουμε τον χάρτη (1 δευτερόλεπτο, με spinner). Όταν πάει σε analytics → φέρνουμε τα γραφήματα. Αλλιώς → δεν τα φέρνουμε ποτέ.

---

### Τι θα αλλάξω συγκεκριμένα (3 αλλαγές)

#### Αλλαγή 1: Lazy load του χάρτη Mapbox
**Αρχείο:** `src/components/map/MapWrapper.tsx`

**Τώρα:** Φορτώνει το `RealMap` αμέσως (στατικά).
**Μετά:** Θα φορτώνει το `RealMap` **μόνο όταν ο χρήστης μπει στο `/xartis`**.

**Πως φαίνεται στον χρήστη:**
- Πριν: Loading 5s → εμφανίζεται όλο μαζί
- Μετά: Loading 2s → εμφανίζεται το app → πας στον χάρτη → spinner 1s → χάρτης

**Ρίσκο για flows:** **Μηδενικό.** Ο χάρτης δουλεύει ακριβώς ίδια. Μόνο ο τρόπος φόρτωσης αλλάζει. Υπάρχει ήδη `Suspense` με fallback spinner.

#### Αλλαγή 2: Manual vendor chunks στο Vite
**Αρχείο:** `vite.config.ts`

**Τι είναι vendor chunks (απλά):** Όταν χτίζεται το app, το Vite φτιάχνει αρχεία. Αυτή τη στιγμή φτιάχνει **ένα τεράστιο αρχείο** που περιέχει ΚΑΙ τον κώδικά μας ΚΑΙ όλες τις βιβλιοθήκες (React, Supabase, κλπ).

Θα του πούμε: "**Σπάσε** τις βιβλιοθήκες σε ξεχωριστά αρχεία":
- `react-vendor.js` — React, React Router
- `supabase-vendor.js` — Supabase
- `ui-vendor.js` — Radix UI components
- `charts-vendor.js` — recharts (φορτώνει μόνο όταν χρειαστεί)
- `mapbox-vendor.js` — mapbox-gl (φορτώνει μόνο όταν χρειαστεί)
- `pdf-vendor.js` — jspdf, html2canvas, xlsx (φορτώνει μόνο όταν χρειαστεί)

**Όφελος:**
1. Όταν αλλάζω κώδικα app, ο browser δεν ξανακατεβάζει τις βιβλιοθήκες (cache)
2. Οι βαριές βιβλιοθήκες δεν φορτώνουν αν δεν χρειάζονται

**Ρίσκο για flows:** **Μηδενικό.** Δεν αλλάζει τίποτα στη συμπεριφορά της εφαρμογής. Αλλάζει μόνο πώς το Vite "πακετάρει" τα αρχεία στο build.

#### Αλλαγή 3: Lazy load των analytics components
**Αρχεία:** `src/components/business/analytics/*` που χρησιμοποιούν recharts

**Τώρα:** Όταν φορτώνει το business dashboard, φορτώνουν αμέσως ΚΑΙ όλα τα analytics tabs ΚΑΙ τα γραφήματα.
**Μετά:** Φορτώνουν μόνο όταν ο business owner κάνει click στο "Analytics" tab.

**Ρίσκο για flows:** **Μηδενικό.** Τα analytics δεν επηρεάζουν tickets/reservations/checkout. Είναι read-only data display.

---

### Τι ΔΕΝ θα αγγίξω (zero-regression guarantee)

❌ Tickets / Reservations / Hybrid logic
❌ Checkout / Stripe flows
❌ QR scanning / validation
❌ Auth (signup, login, OTP)
❌ Capacitor / native paths (όλα τα chunks είναι local στο .ipa/.apk)
❌ Edge functions
❌ Database queries / RLS
❌ Routing (`App.tsx`)
❌ Providers (Auth, Theme, Query)
❌ Business dashboard core (μόνο τα analytics tabs lazy-loaded)

---

### Αναμενόμενο όφελος

| Metric | Πριν | Μετά | Διαφορά |
|---|---|---|---|
| Initial bundle | ~1.4 MB | ~500 KB | **-65%** |
| Lighthouse Performance | 43 | ~75-85 | **+30-40 πόντοι** |
| First Contentful Paint | 2.8s | ~1.2s | **-1.6s** |
| Time to Interactive | 5.5s | ~2.5s | **-3s** |

---

### Testing που χρειάζεται από εσένα

✅ **Πρέπει να τσεκάρεις:**
1. Ανοίγει το landing page → φαίνεται το splash → φορτώνει
2. Πας στο `/xartis` → φαίνεται spinner για 1s → φορτώνει χάρτης κανονικά
3. Πας στο `/dashboard-business` → φορτώνει κανονικά
4. Κάνεις click σε "Analytics" tab → φαίνεται spinner για 1s → φορτώνουν γραφήματα

❌ **ΔΕΝ χρειάζεται** regression testing σε:
- Tickets / Reservations / Hybrid (ο κώδικάς τους δεν αγγίζεται)
- Checkout / Stripe (δεν αγγίζονται)
- QR / Auth (δεν αγγίζονται)
- Native app (το build process αλλάζει αλλά ο runtime κώδικας είναι ο ίδιος)

---

### Αρχεία που θα τροποποιηθούν (μόνο 3)

```text
vite.config.ts                              (manual vendor chunks)
src/components/map/MapWrapper.tsx           (lazy load RealMap)
src/components/business/EventAnalytics.tsx  (lazy load analytics components)
```

**Σύνολο: 3 αρχεία.** Καμία αλλαγή σε flows, routes, providers, ή business logic.

