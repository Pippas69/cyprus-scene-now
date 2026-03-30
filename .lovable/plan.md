

## Δύο Αλλαγές: Editable Πόλη (Ticket-Only) + Κουμπί Αναζήτησης

### 1. Editable Πόλη για ΟΛΟΥΣ στο Ticket-Only Mode

**Αρχείο: `DirectReservationsList.tsx` (γραμμές 1159-1200)**

Αφαίρεση του `if (ticket.is_account_user)` branch (γρ. 1162-1167) που κάνει read-only τις πόλεις account users. Αντ' αυτού, ΟΛΕΣ οι πόλεις (account + ghost, με ή χωρίς τιμή) θα χρησιμοποιούν το ίδιο editable pattern που ήδη υπάρχει για τους ghost users — click για edit, input field με Check/X buttons, αποθήκευση στο `guest_city` του πίνακα `tickets`.

Η λογική θα είναι:
- Αν γίνεται editing → input + Check/X (ίδιο με τώρα)
- Αν υπάρχει πόλη (account_city ή guest_city) → εμφάνιση με Edit2 icon on hover, clickable
- Αν δεν υπάρχει πόλη → `—` με Edit2 icon on hover, clickable

Ουσιαστικά αφαιρείται μόνο ο έλεγχος `is_account_user` και η αρχική τιμή στο editing θα είναι `ticket.guest_city || ticket.account_city || ''`.

### 2. Κουμπί Αναζήτησης δίπλα στο (+)

**Αρχείο: `ReservationDashboard.tsx`**

- Import `Search` icon από lucide-react
- Νέο state: `searchQuery` (string), `searchOpen` (boolean)
- Ακριβώς αριστερά από το κυκλικό κουμπί `+` (γρ. 557-565 και 654-662), προσθήκη κυκλικού κουμπιού Search (ίδιο style: `rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0`)
- Όταν πατηθεί, toggle ενός Input field κάτω/πάνω από τα tabs για πληκτρολόγηση ονόματος
- Το `searchQuery` περνάει ως νέο prop στο `DirectReservationsList`

**Αρχείο: `DirectReservationsList.tsx`**

- Νέο prop: `searchQuery?: string`
- Πριν το sorting, φιλτράρισμα: ticket-only → `guest_name`, reservation/hybrid → `reservation_name`, case-insensitive `includes`

### Καμία αλλαγή database — δεν χρειάζεται migration

