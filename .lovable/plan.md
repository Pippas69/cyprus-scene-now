

## Πλάνο: Πληροφορίες Πελατών & Τηλέφωνο στα Settings

### Αλλαγή 1: Μετονομασία + Αλλαγή λογικής δημογραφικών

**Τι αλλάζει:** Η ενότητα "Κοινό που επισκέφθηκε το μαγαζί" μετονομάζεται σε **"Πληροφορίες Πελατών"** και τα δημογραφικά (φύλο, ηλικία, πόλη) θα υπολογίζονται για **όλους τους πελάτες** — όχι μόνο αυτούς με check-in.

**Τεχνικά:**
- **SQL Migration** — Νέα έκδοση του `get_audience_demographics` RPC:
  - Αφαίρεση του φίλτρου `checked_in_at IS NOT NULL` από tickets, reservations, και offer_purchases
  - Tickets: κάθε ticket με status `valid` ή `used` μετράει (αντί μόνο checked-in)
  - Reservations: κάθε κράτηση (εκτός cancelled) μετράει
  - Offer purchases: κάθε αγορά προσφοράς μετράει (εκτός cancelled)
  - Τα δεδομένα φύλου/ηλικίας/πόλης αντλούνται από `profiles` (ό,τι έχει δηλώσει ο χρήστης)

- **`src/components/business/analytics/AudienceTab.tsx`**:
  - Τίτλος: "Κοινό που επισκέφθηκε το μαγαζί" → "Πληροφορίες Πελατών"
  - Ενημέρωση tooltips/explanations ώστε να αντικατοπτρίζουν τη νέα λογική
  
- **`src/components/business/analytics/PerformanceTab.tsx`**:
  - Ενημέρωση τίτλου εκεί επίσης

### Αλλαγή 2: Τηλέφωνο στα User Settings

**Τι αλλάζει:** Προσθήκη πεδίου τηλεφώνου (read-only) στα Settings του χρήστη, δίπλα στο email. Το τηλέφωνο υπάρχει ήδη στο `profiles.phone` (αποθηκεύεται κατά το signup).

**Τεχνικά:**
- **`src/components/user/UserSettings.tsx`**:
  - Προσθήκη πεδίου "Τηλέφωνο" κάτω από το Email (disabled, read-only, ίδιο στυλ)
  - Translations: `phone: 'Τηλέφωνο'` / `phone: 'Phone'`

### Αρχεία που αλλάζουν

1. **SQL Migration** — Νέα έκδοση `get_audience_demographics` (χωρίς check-in filter)
2. **`src/components/business/analytics/AudienceTab.tsx`** — Νέος τίτλος + tooltips
3. **`src/components/business/analytics/PerformanceTab.tsx`** — Νέος τίτλος
4. **`src/components/user/UserSettings.tsx`** — Πεδίο τηλεφώνου

