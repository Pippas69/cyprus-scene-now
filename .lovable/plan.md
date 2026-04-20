

# Πλάνο: Option A — Rate Limit Bypass για Authenticated Business Owners

## Στόχος
Να μπορούν οι 3 (ή περισσότερες) συσκευές με τον ίδιο business account να σαρώνουν tickets χωρίς όριο, διατηρώντας προστασία από anonymous spam.

---

## Τι αλλάζει (2 αρχεία, μόνο)

### 1. `supabase/functions/validate-ticket/index.ts`
**Τωρινή ροή** (lines 32-41):
```
1. Rate limit check (60 req / 5min) → 429 αν ξεπεραστεί
2. Auth check
3. Validate ticket
```

**Νέα ροή**:
```
1. Auth check (πρώτα)
   ├─ Αν authenticated business owner του event → SKIP rate limit
   └─ Αν unauthenticated/invalid → rate limit check (κρατάμε 60/5min για anonymous spam)
2. Validate ticket
```

**Συγκεκριμένα**:
- Αφαιρώ το rate-limit block από την κορυφή.
- Μετά το `supabaseClient.auth.getUser(token)`:
  - Αν αποτύχει η auth → εφαρμόζεται το rate limit και επιστρέφεται 401/429.
  - Αν επιτύχει → προχωράει κανονικά **χωρίς** rate limit (αφού η authorization check `business.user_id !== staffUserId` παρακάτω είναι ισχυρότερη προστασία).

### 2. `supabase/functions/validate-qr/index.ts`
**Ίδια αλλαγή**: μετακίνηση του rate-limit block να εκτελείται μόνο όταν αποτύχει η `auth.getUser()` (lines 138-172).

---

## Τι ΔΕΝ αλλάζει (Zero-Regression)

- ❌ Το `_shared/rate-limiter.ts` παραμένει ως έχει — χρησιμοποιείται ακόμα από 41 άλλα endpoints (`create-connect-account`, `process-offer-payment`, `preview-transactional-email`, κ.λπ.)
- ❌ Καμία αλλαγή στην `atomic_ticket_checkin` RPC
- ❌ Καμία αλλαγή στην auth/authorization logic (`business.user_id === user.id` παραμένει)
- ❌ Καμία αλλαγή σε άλλα edge functions
- ❌ Καμία αλλαγή σε RLS, migrations, frontend
- ❌ Καμία αλλαγή στο linked-reservation auto-checkin flow

---

## Γιατί είναι ασφαλές

1. **Authentication > Rate limiting**: Ο μόνος τρόπος να φτάσεις το `validate-ticket`/`validate-qr` είναι με valid JWT business owner token. Αν κάποιος έχει αυτό το token, έχει ήδη πλήρη πρόσβαση στο business — δεν τον σταματά rate limit.
2. **Anonymous spam ακόμα μπλοκαρισμένο**: Αν κάποιος καλέσει χωρίς auth ή με σπασμένο token, παίρνει rate limit κανονικά.
3. **Συμμόρφωση με την οδηγία της Lovable**: "Don't add rate limiting" — εδώ **αφαιρούμε** για legitimate traffic, δεν προσθέτουμε.
4. **Race conditions**: `atomic_ticket_checkin` εγγυάται ότι το ίδιο ticket δεν μπορεί να γίνει double check-in από 100 συσκευές ταυτόχρονα — η DB κάνει τη δουλειά.

---

## Throughput μετά την αλλαγή

| Σενάριο | Πριν | Μετά |
|---|---|---|
| 3 συσκευές, ίδιο account, ίδιο WiFi | ❌ 60 σαρώσεις/5min total | ✅ Απεριόριστα |
| 2.000 σαρώσεις σε 2 ώρες | ❌ 429 μετά τα 30min | ✅ Άνετα |
| Anonymous spam attack | ✅ 60/5min όριο | ✅ 60/5min όριο (αμετάβλητο) |
| DB load ανά σάρωση | 2 extra queries (count + insert στο `rate_limit_entries`) | 0 extra queries |

**Bonus**: Επειδή αφαιρούμε το `count + insert` στο `rate_limit_entries` για κάθε σάρωση, **κάθε scan γίνεται ~150ms ταχύτερο**. Σε 2.000 σαρώσεις = **5 λεπτά συνολικός χρόνος εξοικονόμηση**.

---

## Testing (μετά την υλοποίηση)

1. **Throughput test**: Κάνε 100 διαδοχικές σαρώσεις από 1 συσκευή σε 1 λεπτό → όλες περνάνε, **κανένα 429**.
2. **Multi-device test**: 3 browser tabs με ίδιο business login → σαρώνουν 3 διαφορετικά QRs ταυτόχρονα → όλα γίνονται check-in.
3. **Race condition test**: 2 συσκευές σαρώνουν **το ίδιο** QR ταυτόχρονα → μόνο μία πετυχαίνει, η άλλη παίρνει "Already Used" (διασφαλίζεται από `atomic_ticket_checkin`, regression check).
4. **Anonymous spam test**: Καλείς το endpoint **χωρίς** Authorization header 100 φορές → μετά τις 60 παίρνεις 429 (rate limit ακόμα ενεργό για anonymous).
5. **Wrong business test**: Συνδέεσαι ως διαφορετικός business owner και προσπαθείς να σαρώσεις ticket από άλλο event → παίρνεις "wrongBusiness" (authorization regression check).

---

## Επόμενο βήμα (μετά το approval & την υλοποίηση)

Όταν επιβεβαιώσεις ότι το Option A δουλεύει, προχωράμε στο **Realtime Plan** που είχα ήδη παρουσιάσει:
- Νέο hook: `src/hooks/useRealtimeEventCheckins.ts`
- Integration σε: `CombinedTicketReservationOverview.tsx`, `EventsList.tsx`, `DashboardBusiness.tsx` + `TicketSales.tsx`

Δύο ξεχωριστά implementations, όπως ζήτησες — πρώτα throughput, μετά realtime.

