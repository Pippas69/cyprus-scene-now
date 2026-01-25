
# Διόρθωση Συστήματος Analytics - Συνέπεια Προβολών

## Τι συμβαίνει τώρα (ΛΑΘΟΣ)

Αυτή τη στιγμή υπάρχουν **ασυνέπειες** μεταξύ των sections λόγω διαφορετικής μέτρησης:

| Section | Τι μετράει τώρα | Πρόβλημα |
|---------|-----------------|----------|
| Overview - Συνολικές Προβολές | Profile + Offers + Events views | Οι αριθμοί δεν ταιριάζουν με Performance |
| Performance - Profile Views | `engagement_events.profile_view` | Σωστό |
| Performance - Offer Views | `discount_views` | Σωστό |
| Performance - Event Views | `event_views` | Σωστό |
| Boost Value - Profile | Split με βάση subscription period | Άθροισμα δεν ισούται με Performance |
| Boost Value - Offers | Split με βάση boost periods | Άθροισμα δεν ισούται με Performance |
| Boost Value - Events | Split με βάση boost periods | Άθροισμα δεν ισούται με Performance |
| Guidance - Profile | Δεν δείχνει αριθμό προβολών | Λείπει ο αριθμός |
| Guidance - Offers | Δεν δείχνει αριθμό προβολών | Λείπει ο αριθμός |
| Guidance - Events | Δεν δείχνει αριθμό προβολών | Λείπει ο αριθμός |

---

## Τι πρέπει να συμβαίνει (ΣΩΣΤΟ)

### Κανόνες Συνέπειας

1. **Overview Total Views** = Performance Profile Views + Performance Offer Views + Performance Event Views

2. **Boost Value Profile** (Non-Featured + Featured) = Performance Profile Views

3. **Boost Value Offers** (Non-Boosted + Boosted) = Performance Offer Views

4. **Boost Value Events** (Non-Boosted + Boosted) = Performance Event Views

5. **Guidance Profile Views** = Performance Profile Views (ακριβώς ο ίδιος αριθμός)

6. **Guidance Offer Views** = Performance Offer Views (ακριβώς ο ίδιος αριθμός)

7. **Guidance Event Views** = Performance Event Views (ακριβώς ο ίδιος αριθμός)

### Πώς μετράμε Προβολές (Views)

| Τύπος | Πηγή Δεδομένων | Τι σημαίνει |
|-------|----------------|-------------|
| Profile Views | `engagement_events` where `event_type='profile_view'` | Χρήστες που ΕΙΔΑΝ τη σελίδα προφίλ (από feed, χάρτη, αναζήτηση, κοινοποίηση) |
| Offer Views | `discount_views` table | Χρήστες που ΕΙΔΑΝ σελίδα προσφοράς |
| Event Views | `event_views` table | Χρήστες που ΕΙΔΑΝ σελίδα εκδήλωσης |

Οι προβολές είναι **impressions** (οπτική επαφή), ΟΧΙ clicks.

---

## Αλλαγές που θα γίνουν

### 1. `useOverviewMetrics.ts` - Χρήση Performance data

Το `totalViews` θα υπολογίζεται ακριβώς όπως στο Performance:
- Profile: count από `engagement_events.profile_view`
- Offers: count από `discount_views`
- Events: count από `event_views`

Αυτό ήδη λειτουργεί σωστά - θα επιβεβαιώσω ότι τα queries είναι ίδια.

### 2. `useBoostValueMetrics.ts` - Εξασφάλιση αθροίσματος

**Πρόβλημα**: Οι queries για Profile, Offers, Events ΔΕΝ χρησιμοποιούν τα ίδια date filters όπως το Performance tab.

**Λύση**:
- Profile: Οι προβολές θα χωρίζονται σε non-featured/featured με βάση το `current_period_start` του subscription
- Offers: Οι προβολές θα χωρίζονται σε non-boosted/boosted με βάση τα `offer_boosts` periods
- Events: Οι προβολές θα χωρίζονται σε non-boosted/boosted με βάση τα `event_boosts` periods

**Κρίσιμο**: Το άθροισμα (without + with) ΠΡΕΠΕΙ να ισούται με το Performance total.

### 3. `useGuidanceData.ts` - Προσθήκη αριθμών προβολών

**Πρόβλημα**: Το hook επιστρέφει μόνο `TimeWindow[]` (μέρες/ώρες), αλλά ΔΕΝ επιστρέφει τον **συνολικό αριθμό** προβολών.

**Λύση**: Θα προσθέσω νέα πεδία στο return object:
```typescript
profileTotals: {
  views: number;
  interactions: number;
  visits: number;
}
offerTotals: {
  views: number;
  interactions: number;
  visits: number;
}
eventTotals: {
  views: number;
  interactions: number;
  visits: number;
}
```

Αυτοί οι αριθμοί θα υπολογίζονται ακριβώς όπως στο Performance.

### 4. `GuidanceTab.tsx` - Εμφάνιση αριθμών

**Πρόβλημα**: Δεν εμφανίζει τον αριθμό προβολών δίπλα στη μετρική.

**Λύση**: Θα προσθέσω τον αριθμό δίπλα από κάθε μετρική:
```
Προβολές: 150    Καλύτερες Μέρες & Ώρες: Παρασκευή 18:00-20:00
Αλληλεπιδράσεις: 45    Καλύτερες Μέρες & Ώρες: Σάββατο 20:00-22:00
Επισκέψεις: 20    Καλύτερες Μέρες & Ώρες: Παρασκευή 21:00-23:00
```

---

## Τεχνικές Λεπτομέρειες

### Αρχεία που θα τροποποιηθούν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/hooks/useGuidanceData.ts` | Προσθήκη `profileTotals`, `offerTotals`, `eventTotals` |
| `src/components/business/analytics/GuidanceTab.tsx` | Εμφάνιση αριθμών προβολών/αλληλεπιδράσεων/επισκέψεων |
| `src/hooks/useBoostValueMetrics.ts` | Διόρθωση queries για να ταιριάζει με Performance |
| `src/hooks/useOverviewMetrics.ts` | Επιβεβαίωση ότι τα queries είναι ίδια με Performance |

### Λογική υπολογισμού για Boost Value

```typescript
// Profile - Split by subscription period
const totalProfileViews = /* same as Performance */;
if (!featuredStart || featuredStart > endDate) {
  profileWithout.views = totalProfileViews;
  profileWith.views = 0;
} else if (featuredStart <= startDate) {
  profileWithout.views = 0;
  profileWith.views = totalProfileViews;
} else {
  // Split proportionally based on date
  profileWithout.views = /* views before featuredStart */;
  profileWith.views = /* views after featuredStart */;
}
// Άθροισμα πάντα = totalProfileViews
```

### Λογική υπολογισμού για Guidance

```typescript
// Guidance totals - SAME queries as Performance
const profileTotals = {
  views: /* count from engagement_events where event_type='profile_view' */,
  interactions: /* count from engagement_events + business_followers */,
  visits: /* count from reservations with checked_in_at */,
};
```

---

## Τελικό αποτέλεσμα

Μετά τις αλλαγές:

| Metric | Overview | Performance | Boost Value (sum) | Guidance |
|--------|----------|-------------|-------------------|----------|
| Profile Views | ✓ (included) | 150 | 50 + 100 = 150 | 150 |
| Offer Views | ✓ (included) | 80 | 30 + 50 = 80 | 80 |
| Event Views | ✓ (included) | 120 | 40 + 80 = 120 | 120 |
| **Total Views** | 350 | 350 | — | — |

Όλοι οι αριθμοί θα είναι **συνεπείς** σε όλα τα sections.
