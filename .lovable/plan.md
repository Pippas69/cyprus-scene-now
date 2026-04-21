

## Διάγνωση: Γιατί μένει στο loading screen στο fomo.com.cy

### Τι βρήκα με τεκμήρια (όχι εικασίες)

**1. Console error στο preview (επιβεβαιωμένο):**
```
[bootstrap] Failed to start app: TypeError: Importing a module script failed.
```
Επαναλαμβάνεται 4 φορές μέσα σε 30 δευτερόλεπτα. Αυτό προέρχεται από το `src/main.tsx` γραμμή 178 (`catch` του `bootstrap()`).

**2. Πού γεννιέται το σφάλμα:**
Στο `src/main.tsx:170`: `const { default: App } = await import("./App.tsx");` — το dynamic import του App αποτυγχάνει με `TypeError: Importing a module script failed`.

**3. Τι κάνει ο handler που έχουμε σήμερα (αυτό είναι το πραγματικό πρόβλημα):**
Στο `src/main.tsx:148-160`, υπάρχει `setupChunkRecovery()` που πιάνει αυτά τα errors και καλεί `recoverFromChunkLoadError()` (γραμμές 83-104). Αυτό:
- Κάνει `unregister` όλα τα service workers
- Καθαρίζει όλα τα browser caches (`caches.delete`)
- Κάνει `window.location.replace()` με `?__reload=<timestamp>` query param

**4. Διπλό registration του service worker (επιβεβαιωμένο σύγκρουση):**
- `index.html` γραμμές 144-165: **εγγράφει** το `/sw.js` σε production
- `src/main.tsx` γραμμές 106-146 (`setupServiceWorkerHandling`): **παρακολουθεί** το ίδιο `/sw.js`, στέλνει `SKIP_WAITING`, και **κάνει `window.location.reload()` σε `controllerchange`** (γραμμή 128)

**5. Service worker (`public/sw.js`):**
- Στο `fetch` handler γραμμή 117-122: Για navigation requests κάνει `fetch(req, { cache: 'no-store' }).catch(() => caches.match(OFFLINE_PAGE))`. Αν το δίκτυο αποτύχει στιγμιαία, σερβίρει το `/offline.html`.
- Στο `install` event κάνει `skipWaiting()` και στο `activate` κάνει `clients.claim()` — δηλαδή κάθε deploy που εγκαθιστά νέο SW παίρνει αμέσως control και προκαλεί `controllerchange` → reload.

### Ποια είναι η πιθανή ακολουθία που σε κρατάει στο splash

```text
1. Επισκέπτεσαι fomo.com.cy
2. Ο παλιός service worker (από προηγούμενο deploy) έχει cached references σε παλιά chunks
3. Το main.tsx ξεκινά, καλεί import("./App.tsx") που resolveάρει σε ένα νέο hash chunk (/assets/index-XXXX.js)
4. Ο SW ή το browser cache δίνει 404 / mismatched chunk → "Importing a module script failed"
5. Ο χειριστής χτυπάει → unregister SW + clear caches + window.location.replace με ?__reload=
6. Νέα φόρτωση → ο SW ξανα-εγκαθίσταται μέσω index.html
7. Το controllerchange listener στο main.tsx → άλλο reload
8. Loop / άπειρο splash screen
```

Ο χρόνος που "κολλάει" συμβαδίζει με αυτό το loop unregister → reload → re-register → reload.

### Πρόταση διόρθωσης (zero functional regression)

**Σκοπός:** Σπάσιμο του reload loop χωρίς αφαίρεση λειτουργικότητας (push notifications, offline page, chunk recovery).

**Αλλαγές:**

**A. `src/main.tsx`** — να μην κάνει dual-control του SW:
- **Διαγραφή** της `setupServiceWorkerHandling()` (γραμμές 106-146 + κλήση 163). Το registration γίνεται ήδη στο `index.html`. Δεν χρειαζόμαστε ξεχωριστό `controllerchange → reload` listener — αυτός είναι ο βασικός λόγος για τα reload loops.
- **Διατήρηση** του `setupChunkRecovery`, αλλά με **stronger guard**: όχι μόνο sessionStorage flag, αλλά και έλεγχος του `?__reload=` query param. Αν υπάρχει ήδη, **μην ξανατρέξεις recovery** — αντί αυτού, εμφάνισε `renderBootstrapError()` ώστε ο χρήστης να βλέπει μήνυμα αντί για άπειρο splash.

**B. `index.html`** — async SW registration χωρίς να μπλοκάρει το LCP:
- Καμία αλλαγή στο registration logic, παραμένει ως έχει. Είναι ήδη μέσα σε `window.addEventListener('load', ...)`.

**C. `public/sw.js`** — milder navigation strategy:
- Αλλαγή του navigation fetch handler από `cache: 'no-store'` σε κανονικό `fetch(req)`. Διατήρηση του fallback σε offline page **μόνο** όταν είμαστε offline (έλεγχος `navigator.onLine === false`). Έτσι αποφεύγουμε μη απαραίτητα OFFLINE_PAGE responses σε στιγμιαία network glitches που "παραπληροφορούν" τον browser ότι το app εκκινεί κανονικά.
- Αφαίρεση `clients.claim()` από το activate → ο νέος SW θα πάρει control μόνο σε επόμενη επίσκεψη, σπάζοντας τα immediate `controllerchange` reloads.

**D. App.tsx splash removal** — προαιρετικό safety:
- Διατήρηση του υπάρχοντος splash logic ως έχει. Όχι αλλαγές στη λειτουργικότητα του App.

### Τεχνικές λεπτομέρειες (developer notes)

| Αρχείο | Γραμμές | Αλλαγή |
|---|---|---|
| `src/main.tsx` | 106-146, 163 | Διαγραφή `setupServiceWorkerHandling` + call site |
| `src/main.tsx` | 83-104 | Προσθήκη early-return όταν `?__reload=` ήδη υπάρχει στο URL → καλείται `renderBootstrapError()` αντί για άλλο reload |
| `public/sw.js` | 109 | Αφαίρεση `.then(() => clients.claim())` |
| `public/sw.js` | 117-122 | Fallback στο offline page μόνο αν `!navigator.onLine` |

### Μηδενική επίδραση σε λειτουργικότητα

- ✅ Push notifications: παραμένουν (δεν αγγίζουμε το push handler)
- ✅ Offline page: παραμένει αλλά πιο συντηρητικό
- ✅ PWA installability: `manifest.webmanifest` και SW registration στο `index.html` αμετάβλητα
- ✅ Chunk recovery: παραμένει αλλά δεν loop-άρει
- ✅ Δεν αλλάζει UI, routes, χάρτης, χρώματα, business logic

### Action μετά την έγκριση

1. Εφαρμογή των 3 αλλαγών στα `src/main.tsx` και `public/sw.js`
2. **Apply changes & Publish → Update**
3. Δοκιμή: άνοιγμα fomo.com.cy σε **incognito** (για να αποφευχθούν cached SW από προηγούμενες επισκέψεις) και επιβεβαίωση πως φορτώνει η αρχική σελίδα

### Σημαντικό για εσένα ως χρήστη

Επειδή έχεις ήδη κολλημένο SW στον browser σου από προηγούμενο deploy:
- Μετά το publish, την **πρώτη φορά** που θα ανοίξεις fomo.com.cy ίσως ξαναδείς το splash για 1-2 ανανεώσεις (όσο unregister-άρει ο παλιός SW)
- Σε incognito θα δουλέψει αμέσως
- Σε iPhone Safari: Settings → Safari → Clear History and Website Data → δοκιμή ξανά

