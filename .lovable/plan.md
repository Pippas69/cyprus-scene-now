

## Σχέδιο: Προσθήκη στηλών Ηλικία & Πόλη στον πίνακα CRM

### Τι αλλάζει

Προσθήκη δύο νέων στηλών **Ηλικία** και **Πόλη** στον πίνακα πελατών του CRM, αμέσως μετά το No-shows και πριν τις Σημειώσεις. Τα δεδομένα αντλούνται 1:1 από τη διαχείριση (tickets.guest_age, tickets.guest_city).

### Αρχεία & αλλαγές

**1. SQL Migration — Επέκταση `get_crm_guest_stats`**
- Προσθήκη δύο νέων στηλών στο RETURNS TABLE: `guest_age integer`, `guest_city text`
- Για κάθε CRM guest, αντλεί από τα mapped tickets το πιο πρόσφατο μη-κενό `guest_age` και `guest_city`
- Για registered users χωρίς ticket data, fallback στο `profiles.age` / `profiles.city` (ίδια λογική με τα demographics analytics)

**2. `src/hooks/useCrmGuests.ts`**
- Προσθήκη `guest_age: number | null` και `guest_city: string | null` στο interface `CrmGuest`
- Mapping των νέων πεδίων από τα stats results στο guest object

**3. `src/components/business/crm/CrmGuestTable.tsx`**
- Δύο νέα `<TableHead>` μετά το No-shows: "Ηλικία" και "Πόλη"
- Δύο νέα `<TableCell>` ανά γραμμή:
  - **Ηλικία**: εμφανίζει τον αριθμό ή `—` αν δεν υπάρχει
  - **Πόλη**: εμφανίζει το όνομα ή `—` αν δεν υπάρχει
- Σταθερό styling: `text-sm text-foreground` για τιμές, `text-muted-foreground/40` για παύλα

### Σειρά στηλών (τελική)

```text
Πελάτης | Επισκέψεις | Τελευταία | Έξοδα | No-shows | Ηλικία | Πόλη | Σημειώσεις | Tags | Email
```

### Τεχνική σημείωση

Η ηλικία και πόλη ανά CRM guest υπολογίζονται στη βάση (RPC) χρησιμοποιώντας τα ίδια ticket mappings που χρησιμοποιούνται ήδη για visits/spend, οπότε τα δεδομένα είναι 100% συνεπή με τη διαχείριση.

