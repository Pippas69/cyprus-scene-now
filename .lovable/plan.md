

## Πλάνο: Σωστά δημογραφικά + Editable τηλέφωνο + Αγία Νάπα

### Αλλαγή 1: SQL Migration — Demographics με fallback σε ticket/guest data

Η τρέχουσα RPC `get_audience_demographics` διαβάζει **μόνο** `profiles.age`, `profiles.city`, `profiles.gender`. Αλλά πολλοί πελάτες έχουν ηλικία/πόλη αποθηκευμένη στο `tickets.guest_age`/`tickets.guest_city` και δεν έχουν `user_id` (manual entries).

Νέα λογική:
- **Tickets με `user_id`**: `COALESCE(profiles.age, tickets.guest_age)` και `COALESCE(profiles.city, tickets.guest_city)` — fallback στα guest data αν το profile είναι κενό
- **Tickets χωρίς `user_id` (manual entries)**: Χρήση `tickets.guest_age`, `tickets.guest_city` απευθείας (φύλο = "other" αφού δεν δηλώνεται)
- Αφαίρεση `WHERE user_id IS NOT NULL` ώστε να μετρούν **όλοι** οι πελάτες
- Ίδια λογική fallback για reservations (`guest_city`)

### Αλλαγή 2: Τηλέφωνο editable στα Settings + χωρίς +357

**Αρχείο:** `src/components/user/UserSettings.tsx`
- Αφαίρεση `disabled` από το πεδίο τηλεφώνου — γίνεται editable
- Αφαίρεση τυχόν prefix "+357" — εμφανίζεται μόνο ο αριθμός
- Αποθήκευση `phone` στο `handleProfileUpdate`
- Εμφάνιση πάντα (όχι μόνο `if profile.phone`)

### Αλλαγή 3: "Αγία Νάπα" σε μία γραμμή

**Αρχείο:** `src/components/business/reservations/DirectReservationsList.tsx`
- Προσθήκη `whitespace-nowrap` στο span πόλης (~γραμμή 1241)

### Αρχεία που αλλάζουν

1. **SQL Migration** — Νέα `get_audience_demographics` με fallback σε `guest_age`/`guest_city` + manual entries
2. **`src/components/user/UserSettings.tsx`** — Τηλέφωνο editable, χωρίς +357, ομοιόμορφα μικρά γράμματα
3. **`src/components/business/reservations/DirectReservationsList.tsx`** — `whitespace-nowrap` στην πόλη

