

## Σχέδιο: Διόρθωση Πληροφοριών Πελατών

### Τι θα γίνει

Οι Πληροφορίες Πελατών θα αντικατοπτρίζουν **όλα** τα δεδομένα από όλες τις πηγές: εγγεγραμμένους χρήστες ΚΑΙ χειροκίνητες καταχωρήσεις.

### Βήμα 1: Ενημέρωση SQL function `get_audience_demographics`

Αλλαγές στη λογική:

- **Συμπερίληψη manual entries**: Τα εισιτήρια χωρίς `user_id` (χειροκίνητες καταχωρήσεις) θα συμπεριλαμβάνονται στους υπολογισμούς. Αντί να αγνοούνται (`WHERE user_id IS NOT NULL`), θα δημιουργείται ξεχωριστό CTE για αυτά.
- **Fallback για ηλικία**: `COALESCE(profiles.age, tickets.guest_age)` — αν ο χρήστης έχει ηλικία στο profile, χρησιμοποιείται αυτή. Αλλιώς, χρησιμοποιείται η ηλικία από το εισιτήριο.
- **Fallback για πόλη**: `COALESCE(profiles.city, profiles.town, tickets.guest_city)` — ίδια λογική.
- **Φύλο**: Μόνο από `profiles.gender` (χωρίς fallback, αφού μόνο η πλήρης εγγραφή FOMO δίνει φύλο).
- **Αφαίρεση LIMIT 6** στις πόλεις — θα εμφανίζονται όλες.

Δομή του νέου SQL:
1. CTE `registered_customers`: χρήστες με `user_id` — demographics από profiles με fallback σε ticket guest data
2. CTE `manual_customers`: εισιτήρια χωρίς `user_id` — demographics από `guest_age`/`guest_city` απευθείας
3. UNION ALL των δύο → υπολογισμός gender/age/cities στατιστικών

### Βήμα 2: Ενημέρωση UI (`AudienceTab.tsx`)

- Αφαίρεση του `.slice(0, 6)` στις πόλεις ώστε να εμφανίζονται όλες

### Βήμα 3: Cache invalidation

- Στα σημεία όπου ο επιχειρηματίας κάνει edit στοιχεία πελάτη (guest_city, guest_age σε manual entries), θα γίνεται invalidation του query `audience-metrics` ώστε τα analytics να ανανεώνονται αμέσως.

### Τεχνικά αρχεία που θα τροποποιηθούν

1. **Νέο SQL migration** — επανασύνταξη `get_audience_demographics` με τα παραπάνω
2. **`src/components/business/analytics/AudienceTab.tsx`** — αφαίρεση slice(0, 6)
3. **Management components** (edit guest) — προσθήκη invalidation για `audience-metrics` query key

