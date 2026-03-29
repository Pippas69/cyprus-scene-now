

## Πλάνο: Ομοιόμορφα μεγέθη γραμμάτων & premium mobile UI σε όλα τα dialogs

### Πρόβλημα
Τα input fields σε mobile στα dialogs προσφορών (OfferPurchaseDialog) και εκδηλώσεων (TicketPurchaseFlow, ReservationEventCheckout, KalivaTicketReservationFlow) έχουν ανομοιόμορφα μεγέθη κειμένου. Επίσης, το τηλέφωνο στις προσφορές γεμίζει αυτόματα από το προφίλ ενώ πρέπει να είναι κενό.

### Αλλαγές

**1. Ομοιόμορφα μεγέθη γραμμάτων σε mobile (4 αρχεία)**

Προσθήκη `[&_input]:!text-xs [&_textarea]:!text-xs [&_select]:!text-xs` στο mobile scroll container κάθε dialog — ακριβώς όπως έγινε στο DirectReservationDialog:

- `src/components/user/OfferPurchaseDialog.tsx` — γραμμή 1035
- `src/components/tickets/TicketPurchaseFlow.tsx` — γραμμή 1017
- `src/components/user/ReservationEventCheckout.tsx` — γραμμή 1029
- `src/components/tickets/KalivaTicketReservationFlow.tsx` — γραμμή 1021

Κάθε mobile scroll div αλλάζει από:
```
className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide"
```
σε:
```
className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide [&_input]:!text-xs [&_textarea]:!text-xs"
```

**2. Τηλέφωνο κενό στις προσφορές (1 αρχείο)**

`src/components/user/OfferPurchaseDialog.tsx` — γραμμή 847: Αφαίρεση του auto-fill `if (profile.phone) setReservationPhone(profile.phone);` ώστε το πεδίο τηλεφώνου να παραμένει κενό και να το συμπληρώνει ο χρήστης.

### Αρχεία
- `src/components/user/OfferPurchaseDialog.tsx`
- `src/components/tickets/TicketPurchaseFlow.tsx`
- `src/components/user/ReservationEventCheckout.tsx`
- `src/components/tickets/KalivaTicketReservationFlow.tsx`

