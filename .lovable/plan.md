

## Διόρθωση: Check-in δημιουργεί duplicate CRM entries

### Αιτία
Ο trigger `trg_crm_guest_from_ticket` ακούει σε `UPDATE OF user_id, event_id, order_id, status`. Όταν ο ManualStatusToggle αλλάζει `status` σε `'used'` (Ήρθε), ο trigger εκτελείται και καλεί `upsert_crm_guest_identity` η οποία για ghosts κάνει ΠΑΝΤΑ INSERT. Αποτέλεσμα: κάθε check-in = νέος πελάτης.

### Λύση

#### 1. Database Migration — Αφαίρεση `status` από το trigger
```sql
DROP TRIGGER IF EXISTS trg_crm_guest_from_ticket ON public.tickets;
CREATE TRIGGER trg_crm_guest_from_ticket
AFTER INSERT OR UPDATE OF user_id, event_id, order_id
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_crm_guest_from_ticket();
```

Ο CRM guest δημιουργείται μόνο κατά το INSERT (νέο εισιτήριο) ή αλλαγή `user_id/event_id/order_id`. Η αλλαγή `status` (check-in, no-show) δεν ενεργοποιεί πλέον τον trigger.

#### 2. Cleanup — Διαγραφή duplicate που δημιουργήθηκε
Διαγραφή του duplicate ghost "Ανδρέας" που δημιουργήθηκε από το check-in, διατηρώντας τον αρχικό.

### Αρχεία
- Database migration: trigger fix + cleanup

