

## Πρόβλημα

Στο **TicketPurchaseFlow** (εκδηλώσεις μόνο με εισιτήρια), όταν ο χρήστης κάνει εγγραφή κατά τη διάρκεια της ροής, το όνομά του **χάνεται** γιατί:

1. Η σειρά βημάτων είναι: **Auth → Profile → Tickets → Guests**
2. Όταν ολοκληρώνεται το Profile, ο κώδικας προσπαθεί να βάλει το όνομα στο `guestNames[0]`, αλλά ο πίνακας `guestNames` είναι ακόμα **κενός** (`[]`) γιατί ο χρήστης δεν έχει επιλέξει εισιτήρια ακόμα
3. Αποτέλεσμα: το `if (updated.length > 0)` αποτυγχάνει → το όνομα δεν αποθηκεύεται ποτέ

Επιπλέον, το `TicketPurchaseFlow` δεν χρησιμοποιεί το `useProfileName` hook (σε αντίθεση με όλα τα άλλα flows), οπότε δεν υπάρχει fallback.

---

## Λύση

### 1. Αποθήκευση ονόματος σε buffer (TicketPurchaseFlow.tsx)

Αντί να γράφουμε απευθείας στο `guestNames[0]` στο `onComplete` του ProfileCompletionGate, αποθηκεύουμε το όνομα σε μια μεταβλητή `buyerFullName`:

```typescript
const [buyerFullName, setBuyerFullName] = useState('');
```

Στο `renderProfileStep → onComplete`:
```typescript
const fullName = `${profile.firstName} ${profile.lastName}`;
setBuyerFullName(fullName);
```

### 2. Εφαρμογή ονόματος όταν δημιουργηθούν τα slots (TicketPurchaseFlow.tsx)

Στο υπάρχον `useEffect` που συγχρονίζει το `guestNames` με `totalTickets`, προσθέτουμε λογική:

```typescript
useEffect(() => {
  setGuestNames(prev => {
    let updated = [...prev];
    // Resize array
    if (updated.length < totalTickets) {
      updated = [...updated, ...Array(totalTickets - updated.length).fill('')];
    } else if (updated.length > totalTickets) {
      updated = updated.slice(0, totalTickets);
    }
    // Apply buyer name to slot 0 if available and empty
    if (updated.length > 0 && !updated[0] && buyerFullName) {
      updated[0] = buyerFullName;
    }
    return updated;
  });
}, [totalTickets, buyerFullName]);
```

### 3. Fallback με useProfileName (TicketPurchaseFlow.tsx)

Προσθήκη του `useProfileName` hook ως fallback για returning users:

```typescript
const profileName = useProfileName(/* userId from auth */);
```

Και ένα `useEffect` που εφαρμόζει το `profileName` στο `guestNames[0]` αν είναι κενό.

### 4. Lock πρώτου ονόματος

Η μεταβλητή `lockFirstGuestName` ήδη λειτουργεί σωστά — απλά δεν είχε ποτέ τιμή για να κλειδώσει. Με τις παραπάνω αλλαγές, θα λειτουργήσει αυτόματα.

---

## Αρχεία που αλλάζουν

- **`src/components/tickets/TicketPurchaseFlow.tsx`** — Κύρια διόρθωση: buffer ονόματος, useProfileName, sync logic

Τα υπόλοιπα flows (ReservationEventCheckout, KalivaTicketReservationFlow, OfferPurchaseDialog, DirectReservationDialog) χρησιμοποιούν ήδη `useProfileName` και δουλεύουν σωστά.

