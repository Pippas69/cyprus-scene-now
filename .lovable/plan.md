

## Πλάνο: Ενιαίο Premium Dialog Design σε Mobile (αντί Drawer)

### Πρόβλημα
Αυτή τη στιγμή σε κινητό:
- **Προσφορές** → χρησιμοποιούν κεντραρισμένο `Dialog` (premium, scrollable, σταθερό)
- **Κρατήσεις, Εισιτήρια, Υβριδικά** → χρησιμοποιούν `Drawer` (bottom sheet) που είναι λιγότερο σταθερό και ασυνεπές

### Στόχος
Αντικατάσταση του `Drawer` με `Dialog` σε **4 αρχεία** για mobile, ακολουθώντας ακριβώς το pattern της προσφοράς:
- Κεντραρισμένο modal (`max-w-[92vw] max-h-[85vh]`)
- Fixed header με border-bottom
- Scrollable content area (`overflow-y-auto`)

### Αρχεία που αλλάζουν

**1. `src/components/business/ReservationDialog.tsx`** (Κράτηση μέσω προφίλ)
- Αφαίρεση `Drawer/DrawerContent/DrawerHeader/DrawerTitle/DrawerDescription` imports
- Αντικατάσταση mobile block (γραμμές 400-413) με `Dialog` + `DialogContent` με classes: `max-w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0`
- Header: `DialogHeader` με `flex-shrink-0 border-b border-border/50 pb-3 px-4 pt-4`
- Content: `div` με `flex-1 overflow-y-auto px-4 py-4`

**2. `src/components/user/ReservationEventCheckout.tsx`** (Κράτηση μέσω εκδήλωσης)
- Ίδια αλλαγή: αντικατάσταση mobile `Drawer` block (γραμμές 1022-1035) με `Dialog`
- Ίδιο pattern classes

**3. `src/components/tickets/TicketPurchaseFlow.tsx`** (Εισιτήριο μέσω εκδήλωσης)
- Αντικατάσταση mobile `Drawer` block (γραμμές 1010-1023) με `Dialog`
- Ίδιο pattern classes

**4. `src/components/tickets/KalivaTicketReservationFlow.tsx`** (Εισιτήριο + Κράτηση υβριδικό)
- Αντικατάσταση mobile `Drawer` block (γραμμές 1014-1027) με `Dialog`
- Ίδιο pattern classes

### Τεχνικό Pattern (κοινό σε όλα)
```tsx
// Πριν (Drawer):
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerContent>
    <DrawerHeader>...</DrawerHeader>
    <div className="px-4 pb-6 overflow-y-auto">{content}</div>
  </DrawerContent>
</Drawer>

// Μετά (Dialog - ίδιο με Offer):
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0"
    onOpenAutoFocus={(e) => e.preventDefault()}>
    <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-3 px-4 pt-4">
      <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
      <DialogDescription className="text-xs">{description}</DialogDescription>
    </DialogHeader>
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      {content}
    </div>
  </DialogContent>
</Dialog>
```

### Τι δεν αλλάζει
- Desktop rendering (παραμένει ως έχει σε όλα τα αρχεία)
- Όλη η λογική forms, validation, βήματα (steps)
- Μόνο το mobile container wrapper αλλάζει

