

## Πλάνο: Διόρθωση PR Dashboard (3 bugs)

### Bug #1 — Καθυστέρηση φόρτωσης στο PR Dashboard
**Αιτία:** Κάθε σελίδα τρέχει δικό της `getUser()` + κανένα hook δεν έχει cache (`staleTime: 0`).

**Λύση:**
- Μεταφορά του `getUser()` στο **`PromoterLayout`** (υπάρχει ήδη!). Περνάμε το `userId` στα children μέσω **React Context**, ώστε οι σελίδες να μην ξανατρέχουν auth check.
- **Prefetch** και των 3 promoter queries (applications, events, totals, attributions) στο layout — έτσι όταν μπαίνεις στο `/dashboard-promoter`, **φορτώνουν παράλληλα όλα** τα data για όλα τα tabs.
- Προσθήκη `staleTime: 2 λεπτά` σε όλα τα promoter hooks → αλλαγή tab = **στιγμιαία** εμφάνιση δεδομένων από cache.

### Bug #2 — Sign Out δεν δουλεύει στο PR Dashboard
**Αιτία:** Το `onAuthStateChange` listener στο `PromoterLayout` τρέχει `load()` σε κάθε auth event, που προσπαθεί να κάνει fetch profile μετά το sign out → race με το navigation.

**Λύση:**
- Στο `handleSignOut` του `UserAccountDropdown`: προσθήκη **καθαρισμού React Query cache** (`queryClient.clear()`) πριν το signOut, για να μην μείνουν stale data.
- Στο `PromoterLayout`: το `onAuthStateChange` να χειρίζεται ρητά το `SIGNED_OUT` event → κάνει απευθείας `navigate('/')` **χωρίς** να ξαναζητά profile.
- Αφαίρεση του διπλού navigation (το layout θα χειριστεί το redirect).

### Bug #3 — User Dashboard αργεί μετά το switch πίσω
**Αιτία:** Τα promoter queries παραμένουν ενεργά (subscriptions, realtime channels).

**Λύση:**
- Προσθήκη `staleTime` σε όλα τα hooks → React Query δεν ξαναζητά δεδομένα κατά το unmount/remount.
- Το realtime channel (`usePromoterApplicationsRealtime`) ήδη cleanup σωστά με `removeChannel`.

### Αρχεία που αλλάζουν (5)

1. **`src/hooks/usePromoter.ts`** — προσθήκη `staleTime: 2*60*1000` σε `usePromoterApplications`, `useIsActivePromoter`.
2. **`src/hooks/usePromoterLinks.ts`** — προσθήκη `staleTime` σε `usePromoterEvents`.
3. **`src/hooks/usePromoterEarnings.ts`** — προσθήκη `staleTime` σε `usePromoterAttributions`, `usePromoterTotals`.
4. **`src/components/layouts/PromoterLayout.tsx`** — 
   - Δημιουργία `PromoterContext` που παρέχει `userId`
   - Prefetch των queries στο mount
   - Fix του `onAuthStateChange` για να χειρίζεται `SIGNED_OUT` καθαρά
5. **`src/components/UserAccountDropdown.tsx`** — 
   - `handleSignOut` να κάνει `queryClient.clear()` πριν το signOut
   - Ένα μόνο navigation μετά
6. **`src/pages/promoter/PromoterOverview.tsx`, `PromoterEventsPage.tsx`, `PromoterEarningsPage.tsx`** — αφαίρεση του lokal `getUser()`, χρήση του context από το layout.

### Τι ΔΕΝ αγγίζω
- Business dashboard, User dashboard flows
- Auth flow (login, signup, password reset)
- RLS policies, migrations
- Realtime subscriptions (δουλεύουν σωστά)
- Payments, QR, tickets

### Testing
1. User Dashboard → switch σε PR Dashboard → πρέπει να φορτώσει γρήγορα, μία φορά
2. PR Dashboard → αλλαγή tabs (Overview/Events/Earnings) → **καθόλου loading spinners** μετά την πρώτη φόρτωση
3. PR Dashboard → Sign Out → πρέπει να κάνει logout και redirect στο `/`
4. PR Dashboard → My Account → πίσω στο User Dashboard → πρέπει να είναι γρήγορο

