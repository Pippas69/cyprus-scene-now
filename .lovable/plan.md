
Σωστά — το έχω εντοπίσει ακριβώς από το screenshot και τον κώδικα. Το πρόβλημα **δεν είναι μόνο UI**, είναι και data source.

1) Root cause που κρατάει την πόλη ως "—"
- Στο `DirectReservationsList.tsx` η πόλη για account users διαβάζεται από `profiles` (client-side query).
- Στο business dashboard αυτό μπλοκάρεται από RLS (ο επιχειρηματίας δεν μπορεί να κάνει SELECT σε ξένα πλήρη profiles), άρα έρχεται κενό city.
- Επιπλέον, στο ticket-only render υπάρχει branch που για `is_account_user` δείχνει πάντα muted/παύλα λογική πριν φτάσει στο σωστό style branch.

2) Τι θα αλλάξω
- `src/components/business/reservations/DirectReservationsList.tsx`
  - `fetchTicketOnlyOrders`:
    - αντικατάσταση query από `profiles` -> `public_profiles` (μόνο safe πεδία: `id, city, town`).
    - ίδιο fallback `city || town`.
  - `fetchCitiesForReservations`:
    - ίδια αλλαγή σε `public_profiles`, για reservation/hybrid ροές.
  - Ticket-only "Λεπτομέρειες" render:
    - Νέα προτεραιότητα:
      1. Αν υπάρχει `account_city` => δείξε πόλη με `text-foreground` (λευκά, non-editable).
      2. Αν είναι account user αλλά χωρίς πόλη => δείξε `—` muted, non-editable.
      3. Αν ghost => `—` / `guest_city` clickable-editable (όπως τώρα).
  - Reservation/Hybrid "Λεπτομέρειες":
    - όπου δείχνουμε `cityByReservation[...]`, θα γίνει `text-foreground` ώστε οι πόλεις account χρηστών να φαίνονται καθαρά (όχι faded).

3) Τι ΔΕΝ θα αλλάξει
- Για users χωρίς account (ghost): το `—` παραμένει clickable/editable από τον επιχειρηματία.
- Δεν χρειάζεται migration ή αλλαγή backend schema.
- Δεν αγγίζω checkout/payment flows εδώ.

4) Έλεγχοι αποδοχής (για να επιβεβαιωθεί ότι “διορθώθηκε”)
- Περίπτωση Α: account user με δηλωμένη πόλη -> εμφανίζεται η σωστή πόλη με λευκά γράμματα στη στήλη "Λεπτομέρειες".
- Περίπτωση Β: account user χωρίς πόλη -> εμφανίζεται απλή παύλα `—` (όχι editable).
- Περίπτωση Γ: ghost user -> `—` clickable, αποθήκευση `guest_city` δουλεύει και μένει στο row.
- Έλεγχος και στα 3 modes λίστας: Ticket-only, Reservation-only, Hybrid, σε mobile viewport όπως στο screenshot.
