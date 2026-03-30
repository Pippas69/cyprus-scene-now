

## Τρεις Αλλαγές: Πόλη στη Φόρμα + Clickable Status + CRM Spend Fix

### 1. Προσθήκη πεδίου Πόλης στη φόρμα "Προσθήκη εισιτηρίου"

**Αρχείο: `ManualEntryDialog.tsx`**

- Νέο state: `city` (string)
- Νέο πεδίο Input μετά το Τηλέφωνο (γρ. 345), πριν το Ηλικία (γρ. 377) — μόνο για `entryType === 'ticket'`
- Label: "Πόλη" / "City"
- Κατά το save (γρ. 229-241), προσθήκη `guest_city: city.trim() || null` στο insert του tickets
- Reset στο `resetForm()`

### 2. Clickable "Επιβεβαιωμένη" για manual ticket entries

**Αρχείο: `DirectReservationsList.tsx`**

- Προσθήκη `is_manual_entry` στο query tickets (γρ. 527) και στο `TicketOnlyOrder` interface (γρ. 74-90)
- Αποθήκευση στο enrichment (γρ. 627-643): `is_manual_entry: (t as any).is_manual_entry || false`
- Στο status cell (γρ. 1240-1246): Αν `ticket.is_manual_entry && !ticket.checked_in`, αντί για static "Επιβεβαιωμένη" text, render `ManualStatusToggle` με `table="tickets"` — ίδιο pattern με τις reservations. Αυτό επιτρέπει στον επιχειρηματία να κάνει click και να επιλέξει check-in ή no-show.
- Η `onStatusChange` θα ενημερώνει τοπικά το state (checked_in, status) χωρίς refresh.

### 3. Fix CRM Spend για Manual Tickets

**Πρόβλημα**: Η `standalone_ticket_spend` CTE στο `get_crm_guest_stats` υπολογίζει spend ως `SUM(tt.price_cents)` — δηλαδή παίρνει την τιμή από τον πίνακα `ticket_tiers`. Για manual entries, ο επιχειρηματίας βάζει custom τιμή (π.χ. €5) που αποθηκεύεται στο `ticket_orders.subtotal_cents`, αλλά η tier μπορεί να έχει διαφορετική τιμή (π.χ. €1). Αυτό εξηγεί γιατί στο CRM φαίνεται €1 αντί €5.

**Database migration**: Αλλαγή στο `standalone_ticket_spend` CTE:
- Αντί `SUM(COALESCE(tt.price_cents, 0))`, χρήση: per-ticket price από order = `COALESCE(tord.subtotal_cents, 0) / GREATEST(ticket_count_in_order, 1)`
- Εναλλακτικά, πιο απλά: JOIN `ticket_orders` και χρήση `tord.subtotal_cents / (count of tickets in order)` αντί tier price

Η ακριβής αλλαγή: Αντικατάσταση `SUM(COALESCE(tt.price_cents, 0))` με υπολογισμό βάσει `ticket_orders.subtotal_cents` διαιρεμένο ανά αριθμό tickets στο ίδιο order. Αυτό εξασφαλίζει ότι η πραγματική τιμή που πλήρωσε (ή καταχωρήθηκε) ο πελάτης αντικατοπτρίζεται στο CRM.

### Αρχεία
- `ManualEntryDialog.tsx`: πεδίο πόλης
- `DirectReservationsList.tsx`: is_manual_entry + ManualStatusToggle στα tickets
- Database migration: fix standalone_ticket_spend formula

