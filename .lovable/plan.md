

## Πλάνο: Ασφαλείς βελτιστοποιήσεις Performance (χωρίς bundle splitting)

### Στόχος
Βελτίωση του Lighthouse score από **43 → ~65-75** χωρίς να αγγίξουμε **καμία** λογική flow (tickets, reservations, hybrid, checkout, QR, auth).

### Τι θα αλλάξει (4 σημεία)

**1. Hero video lazy loading (Landing page)**
- Αρχείο: `src/components/home/HeroSection.tsx` (ή όπου υπάρχει το `<video>`)
- Αλλαγή: Προσθήκη `preload="none"` και `poster` attribute
- Όφελος: Εξοικονόμηση ~3.4 MB στο initial load (το video φορτώνει μόνο όταν χρειαστεί)
- Επίπτωση σε flows: **Καμία** — μόνο landing page

**2. Image resize (Event covers στο landing)**
- Αρχείο: `src/components/home/UpcomingEventsPreview.tsx`
- Αλλαγή: `width=800` → `width=662` (ή responsive μέσω `srcset`)
- Όφελος: ~59 KB εξοικονόμηση + σωστό sizing
- Επίπτωση σε flows: **Καμία** — μόνο preview cards στο landing

**3. Font loading optimization (CLS fix)**
- Αρχείο: `index.html`
- Αλλαγή: Προσθήκη `&display=swap` (ήδη υπάρχει) + ένωση των 2 ξεχωριστών font requests σε **1 request** (μειώνει render-blocking chain)
- Όφελος: CLS από 0.101 → ~0.02, ταχύτερο FCP κατά ~750ms
- Επίπτωση σε flows: **Καμία** — visual μόνο

**4. Hero background image (Unsplash 867 KB)**
- Αρχείο: `src/components/home/HeroSection.tsx`
- Αλλαγή: Μείωση `w=1920` → `w=1200&fm=webp&q=75` ή lazy load μέσω CSS
- Όφελος: ~600 KB εξοικονόμηση
- Επίπτωση σε flows: **Καμία** — μόνο landing hero

### Τι ΔΕΝ θα αγγίξω (zero-regression guarantee)

❌ Tickets / Reservations / Hybrid logic
❌ Checkout / Stripe flows
❌ QR scanning / validation
❌ Auth (signup, login, OTP, business approval)
❌ Capacitor / native code
❌ Edge functions
❌ Database queries / RLS
❌ Routing (`App.tsx`, `Index.tsx`)
❌ Providers (Auth, Theme, Query)
❌ Business / User / Admin dashboards

### Αρχεία που θα τροποποιηθούν

```
text
index.html                                  (font loading)
src/components/home/HeroSection.tsx         (video preload, hero bg)
src/components/home/UpcomingEventsPreview.tsx  (image width)
```

**Σύνολο: 3 αρχεία**, όλα στο **landing page scope**.

### Testing που χρειάζεται από εσένα

✅ Άνοιγμα landing page → δες ότι:
- Φαίνεται το splash screen κανονικά
- Φορτώνει το hero (video ή poster)
- Φαίνονται τα upcoming events
- Δουλεύουν τα κουμπιά "Sign up" / "Login"

❌ **ΔΕΝ χρειάζεται** να ξανατεστάρεις: tickets, reservations, hybrid, QR, payments, dashboard, CRM. Δεν αγγίζονται.

### Επόμενο βήμα (μετά την επιτυχία)

Όταν επιβεβαιώσεις ότι όλα δουλεύουν, ξανασυζητάμε για **bundle splitting μόνο των admin routes** (`/admin/*`) ως πρώτο πειραματικό βήμα.

