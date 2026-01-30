

# Πλάνο: Βελτιστοποίηση Share Sheet για Κινητό

## Το Πρόβλημα
Στη φωτογραφία φαίνεται ότι στο κινητό:
- Το κουμπί "Περισσότερα" κόβεται (δεν χωράει)
- Η εικόνα preview είναι πολύ μεγάλη
- Γενικά τα στοιχεία είναι εκτός πλαισίου

## Αλλαγές (Μόνο για Mobile)

### 1. Μικρότερη Εικόνα Preview
```
Τώρα:    h-40 (160px ύψος)
Νέο:     h-32 (128px ύψος) στο mobile
```

### 2. Μικρότερα Social Media Icons
```
Τώρα:    w-12 h-12 (48px) με icon w-6 h-6
Νέο:     w-10 h-10 (40px) με icon w-5 h-5 στο mobile
```

### 3. Μικρότερα Action Buttons
```
Τώρα:    h-12, text-base, icon h-5 w-5
Νέο:     h-10, text-sm, icon h-4 w-4 στο mobile
```

### 4. Μικρότερο padding/gaps
```
Τώρα:    px-4 py-4 space-y-4 gap-3
Νέο:     px-3 py-3 space-y-3 gap-2 στο mobile
```

## Τεχνικές Αλλαγές

### Αρχείο: `src/components/sharing/SimpleShareSheet.tsx`

**ImagePreviewCard** - Μικρότερο ύψος:
```
h-40 → h-28 sm:h-40
```

**Social Media Buttons** - Μικρότερα:
```
w-12 h-12 → w-9 h-9 sm:w-12 sm:h-12
w-6 h-6 → w-4 h-4 sm:w-6 sm:h-6 (icons)
gap-4 → gap-2 sm:gap-4
p-3 → p-2 sm:p-3
```

**Action Buttons** (Αντιγραφή Link / Περισσότερα):
```
h-12 → h-9 sm:h-12
text-base → text-xs sm:text-base
h-5 w-5 → h-3.5 w-3.5 sm:h-5 sm:w-5 (icons)
gap-3 → gap-2 sm:gap-3
```

**Container padding**:
```
px-4 py-4 → px-3 py-3 sm:px-4 sm:py-4
space-y-4 → space-y-3 sm:space-y-4
```

## Αναμενόμενο Αποτέλεσμα

```
┌─────────────────────────┐
│     Κοινοποίηση    ✕    │
├─────────────────────────┤
│ ┌─────────────────────┐ │  ← Μικρότερη εικόνα (h-28)
│ │   Summer Beach      │ │
│ └─────────────────────┘ │
│                         │
│  [IG]  [WA]  [Msg]      │  ← Μικρότερα icons (w-9)
│                         │
│ [Αντιγραφή] [Περισσότ]  │  ← Μικρότερα κουμπιά (h-9)
│                         │     ΧΩΡΑΝΕ ΚΑΙ ΤΑ ΔΥΟ!
└─────────────────────────┘
```

## Αλλαγές σε Αρχεία

| Αρχείο | Ενέργεια | Περιγραφή |
|--------|----------|-----------|
| `src/components/sharing/SimpleShareSheet.tsx` | Τροποποίηση | Responsive classes για mobile-first sizing |

## Σημείωση
Όλες οι αλλαγές χρησιμοποιούν Tailwind responsive prefixes (`sm:`) έτσι ώστε:
- **Κινητό (< 640px)**: Μικρότερα μεγέθη
- **Desktop (≥ 640px)**: Παραμένει όπως είναι τώρα

