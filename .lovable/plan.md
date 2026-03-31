

## Αφαίρεση συνολικού αριθμού από dropdown badges (πολλαπλά events)

### Αλλαγή
Όταν ένας τύπος (Εισιτήρια/Κρατήσεις/Υβριδικό) έχει **2+ events**, το badge δείχνει μόνο το label + βελάκι dropdown, **χωρίς** τον συνολικό αριθμό. Ο αριθμός φαίνεται μόνο αναλυτικά ανά event μέσα στο dropdown.

Όταν έχει **1 event**, ο αριθμός παραμένει δίπλα στο label (αφού δεν υπάρχει dropdown).

### Τεχνική υλοποίηση

**Αρχείο:** `src/components/business/reservations/ReservationDashboard.tsx`

Αφαίρεση του `totalCount` badge (γραμμές 598-602) από μέσα στο `SelectTrigger` του dropdown (πολλαπλά events). Το `<span>` με τον αριθμό αφαιρείται — μένει μόνο το label text.

Η λογική μέσα στο dropdown (γραμμές 606-621) παραμένει ως έχει, δείχνοντας ημερομηνία + count ανά event.

