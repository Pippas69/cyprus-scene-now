

## Πλάνο: Μικρότερα γράμματα στα input fields του DirectReservationDialog (mobile)

### Πρόβλημα
Τα input fields (Όνομα Κράτησης, Αριθμός Ατόμων, Ονόματα Ατόμων, Τηλέφωνο, Ειδικές Απαιτήσεις) εμφανίζουν μεγαλύτερο κείμενο από το Select "Ώρα Άφιξης". Αυτό συμβαίνει γιατί το base `Input` component έχει `text-base` (16px) στις default classes, και παρόλο που περνάμε `text-xs`, ενδέχεται η σειρά εφαρμογής να μην λειτουργεί σωστά σε όλα τα στοιχεία.

### Λύση
Αλλαγή **μόνο** στο `src/components/business/DirectReservationDialog.tsx` — εφαρμογή μικρότερου ύψους και font size στα mobile inputs:

1. **Reservation Name Input** (γραμμή ~634): Προσθήκη `[&]:text-xs` για αναγκαστική εφαρμογή σε mobile
2. **NumberInput (Party Size)** (γραμμή ~658): Ήδη μικρό, θα επιβεβαιωθεί
3. **Guest Name Inputs** (γραμμή ~683): Ίδια αλλαγή `[&]:text-xs`
4. **Phone Input** (γραμμή ~785): Ίδια αλλαγή
5. **Special Requests Textarea** (γραμμή ~826): Ίδια αλλαγή

### Τεχνική Προσέγγιση
Αντί `text-xs sm:text-sm`, θα χρησιμοποιηθεί `text-[12px] sm:text-sm` ή εναλλακτικά wrapper με `[&_input]:text-xs [&_textarea]:text-xs` στο mobile form container, ώστε να εφαρμόζεται καθολικά σε όλα τα πεδία χωρίς conflict με το base `text-base` του Input component.

### Αρχείο
- `src/components/business/DirectReservationDialog.tsx` — μόνο mobile styling, χωρίς αλλαγή λογικής

