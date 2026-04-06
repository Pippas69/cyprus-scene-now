

## Πρόβλημα

Στο `DashboardUser.tsx`, η συνάρτηση `checkUser()` ελέγχει αν ο χρήστης έχει `role === 'business'` στον πίνακα `profiles` και τον ανακατευθύνει αυτόματα στο `/dashboard-business`. Αυτό σημαίνει ότι κανένας business χρήστης δεν μπορεί ποτέ να δει το user dashboard (και τα settings του).

## Λύση

Αφαίρεση του business role redirect από το `DashboardUser.tsx`. Ο business χρήστης πρέπει να μπορεί να βλέπει και το user dashboard του (settings, events, offers κλπ). Η πλοήγηση μεταξύ dashboards γίνεται ήδη σωστά μέσω του `UserAccountDropdown`.

### Αλλαγή σε 1 αρχείο

**`src/pages/DashboardUser.tsx`** — Αφαίρεση των γραμμών 45-55 (business role check + redirect). Ο χρήστης θα φορτώνει κανονικά ανεξάρτητα αν είναι business ή user. Ο μόνος redirect παραμένει αν δεν είναι logged in.

Τίποτα άλλο δεν αλλάζει.

