# Memory: features/crm/identity-resolution-logic-el
Updated: now

Η ταυτοποίηση πελατών στο CRM ακολουθεί αυστηρή ιεραρχία: 
1) Προτεραιότητα Λογαριασμού: Αν υπάρχει 'user_id' (εγγεγραμμένος χρήστης), η κράτηση ή το εισιτήριο συνδέεται πάντα με το επίσημο profile name του χρήστη (match by user_id). 
2) Ghost Profiles - ΚΑΝΕΝΑ AUTO-MERGE: Κάθε εισιτήριο ή κράτηση δημιουργεί ΠΑΝΤΑ νέο ghost profile. Δεν γίνεται αυτόματη συγχώνευση ακόμα κι αν το όνομα ή/και το τηλέφωνο ταιριάζει. Η συγχώνευση (merge) μπορεί να γίνει ΜΟΝΟ χειροκίνητα από τον επιχειρηματία μέσω του CRM UI.
3) Κατανομή Εξόδων: Τα έξοδα manual entries αντλούνται από το 'prepaid_min_charge_cents' ή το 'actual_spend_cents', δίνοντας προτεραιότητα στις χειροκίνητες τιμές (overrides) και αποδίδοντας το πλήρες ποσό στον πελάτη χωρίς διαίρεση με το party size. 
4) Ghost Profile Details: Τα ghost profiles δεν κληρονομούν αυτόματα email/τηλέφωνο από τον αγοραστή, εμφανίζοντας μόνο το όνομα και το party size (· Χ άτομα).
5) Τεχνική Υλοποίηση: Η function `upsert_crm_guest_identity` κάνει ΠΑΝΤΑ INSERT για ghosts (ποτέ δεν ψάχνει existing record). Για registered users, κάνει match μόνο by user_id.
