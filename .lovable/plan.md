

## Διόρθωση: Αφαίρεση partial budget credits μετά από πληρωμή Stripe

### Πρόβλημα
Οταν ενα boost κοστίζει €40 αλλά εχεις μόνο €39.50 credits, το σύστημα σωστά σε στέλνει στο Stripe να πληρώσεις τα €0.50. Ομως τα €39.50 credits **δεν αφαιρούνται ποτέ** απο το budget σου. Η συνάρτηση `activate-pending-boost` απλά αλλάζει το status σε "active" χωρίς να κάνει αφαίρεση.

### Λύση
Θα ενημερωθεί η `activate-pending-boost` edge function ωστε οταν ενεργοποιεί ένα boost που εχει `partial_budget_cents > 0`, να αφαιρεί αυτό το ποσό απο τα `monthly_budget_remaining_cents` του subscription.

### Τεχνικές αλλαγές

**1. `supabase/functions/create-boost-checkout/index.ts` (Event boosts)**
- Αποθήκευση `partial_budget_cents` μέσα στο boost record (νέο πεδίο ή χρήση υπάρχοντος) ωστε να είναι διαθέσιμο στο `activate-pending-boost`.

**2. `supabase/functions/create-offer-boost-checkout/index.ts` (Offer boosts)**
- Ίδια αλλαγή: αποθήκευση `partial_budget_cents` στο offer_boosts record.

**3. `supabase/functions/create-profile-boost-checkout/index.ts` (Profile boosts)**  
- Ίδια αλλαγή.

**4. Database migration**
- Προσθήκη column `partial_budget_cents` (integer, default 0) στους πίνακες `event_boosts`, `offer_boosts`, και `profile_boosts`.

**5. `supabase/functions/activate-pending-boost/index.ts`** (κύρια διόρθωση)
- Μετά την ενεργοποίηση κάθε pending boost, έλεγχος αν `partial_budget_cents > 0`.
- Αν ναι, αφαίρεση αυτού του ποσού απο `business_subscriptions.monthly_budget_remaining_cents`.
- Αν αποτύχει η αφαίρεση, rollback (επαναφορά boost σε pending).

### Ροή μετά τη διόρθωση

```text
Χρήστης επιλέγει boost €40, εχει €39.50 credits
    |
    v
create-*-checkout: Δημιουργεί pending boost 
    με partial_budget_cents=3950, χρεώνει €0.50 στο Stripe
    |
    v
Χρήστης πληρώνει στο Stripe
    |
    v
activate-pending-boost: 
    1. Ενεργοποιεί το boost (status -> active)
    2. Αφαιρεί €39.50 απο budget (budget -> €0.00)
```

