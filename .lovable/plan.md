
# Design Overhaul: "Οι Προσφορές Μου" Section

## Στόχος
Πλήρης αναδιαμόρφωση του design των καρτών στο section "Οι Προσφορές Μου" ώστε να ταιριάζουν ακριβώς με το mockup που παρείχες.

---

## Αλλαγές Design

### 1. Αφαίρεση "Προσφορά μη διαθέσιμη"
- Όταν μια προσφορά έχει διαγραφεί (`discounts === null`), δεν θα εμφανίζεται καθόλου
- Θα φιλτράρονται εντελώς από active, redeemed, και expired tabs

### 2. Νέα Δομή Κάρτας

```text
┌─────────────────────────────────────────┐
│  ┌──────────┐                    ┌────┐ │
│  │ Κράτηση  │                    │-20%│ │
│  └──────────┘                    └────┘ │
│                                         │
│         [ΕΙΚΟΝΑ ΠΡΟΣΦΟΡΑΣ]              │
│                                         │
├─────────────────────────────────────────┤
│ Ο Μαρίνος είναι Κουσπιτής              │
│ 🏪 DermaLissere                         │
│ 📅 5 Φεβρουαρίου 2026, 20:00    📍      │
│ 🕐 Λήγει στις 4 Φεβρουαρίου            │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │   📱 Εμφάνιση QR                   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3. Λογική Badge "Κράτηση"
- Εμφανίζεται **μόνο** όταν `claim_type === 'with_reservation'`
- **ΔΕΝ** εμφανίζεται για walk-in προσφορές

### 4. Λογική Ώρας
| Τύπος | Εμφάνιση Ώρας |
|-------|---------------|
| `with_reservation` | Συγκεκριμένη ώρα κράτησης (π.χ. "20:00") |
| `walk_in` | Εύρος ωρών (π.χ. "18:00-21:00") |

### 5. Location Badge (Clickable)
- Νέο badge τοποθεσίας δίπλα από ημερομηνία/ώρα
- Κλικ → navigate στον χάρτη με `business_id`
- Icon: MapPin (📍)

---

## Τεχνικές Αλλαγές

### Αρχείο: `src/components/user/MyOffers.tsx`

1. **Query Updates**
   - Προσθήκη στο select: `claim_type`, `reservation_id`
   - Join με `reservations` για να πάρουμε `preferred_time`
   - Προσθήκη business `city`, `id` στο nested select

2. **Filter Update**
   - Φιλτράρισμα: `purchases.filter(p => p.discounts !== null)` πριν από κάθε κατηγοριοποίηση

3. **PurchaseCard Redesign**
   - Αφαίρεση του placeholder για "Προσφορά μη διαθέσιμη"
   - Νέο layout με:
     - Badge "Κράτηση" (conditional)
     - Discount badge στο πάνω δεξί μέρος της εικόνας
     - Business row με logo + name
     - Date/Time row με location badge
     - Expiry row
     - QR button (styled όπως στο mockup)

4. **Responsive Spacing**
   - Mobile: Compact spacing, text-xs
   - Tablet: Balanced
   - Desktop: Full spacing

---

## Παράδειγμα Νέας Κάρτας (Pseudo-code)

```tsx
<Card>
  {/* Image Section */}
  <div className="h-40 relative">
    <img src={imageUrl} />
    
    {/* Κράτηση Badge - Only for reservations */}
    {claim_type === 'with_reservation' && (
      <Badge className="absolute top-2 left-2 bg-primary">
        Κράτηση
      </Badge>
    )}
    
    {/* Discount Badge */}
    <Badge className="absolute top-2 right-2">
      -{percent}%
    </Badge>
  </div>
  
  {/* Content Section */}
  <div className="p-3">
    {/* Title */}
    <h4>{title}</h4>
    
    {/* Business */}
    <div className="flex items-center gap-1.5">
      <img src={logo} className="h-4 w-4 rounded-full" />
      <span>{businessName}</span>
    </div>
    
    {/* Date + Time + Location */}
    <div className="flex items-center gap-2">
      <Calendar />
      <span>
        {formatDate}
        {claim_type === 'with_reservation' 
          ? `, ${reservationTime}` 
          : `, ${validStartTime}-${validEndTime}`
        }
      </span>
      <button onClick={navigateToMap}>
        <MapPin />
      </button>
    </div>
    
    {/* Expiry */}
    <div className="flex items-center gap-1.5">
      <Clock />
      <span>Λήγει στις {expiryDate}</span>
    </div>
    
    {/* QR Button */}
    <Button>
      <QrCode /> Εμφάνιση QR
    </Button>
  </div>
</Card>
```

---

## Αρχεία που θα τροποποιηθούν

| Αρχείο | Αλλαγές |
|--------|---------|
| `src/components/user/MyOffers.tsx` | Πλήρης redesign του PurchaseCard, νέο query, φιλτράρισμα |

---

## Responsive Behavior

- **Mobile**: Ίδιο layout, compact spacing
- **Tablet**: Grid 2 columns  
- **Desktop**: Grid 3 columns

Οι αποστάσεις θα είναι ακριβώς όπως στο mockup σε όλες τις συσκευές.
