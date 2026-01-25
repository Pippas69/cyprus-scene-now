

# Σχέδιο: Αναβάθμιση Story Sharing με Web Share API + Share για Προσφορές

## Επισκόπηση

Θα αναβαθμίσουμε το σύστημα κοινοποίησης για:
1. **Stories με Web Share API**: Χρήση του native share sheet του κινητού για άμεση κοινοποίηση εικόνας χωρίς manual download
2. **Share για Προσφορές**: Προσθήκη κουμπιού Share στο OfferCard
3. **Σωστά Links**: Κάθε share περιλαμβάνει link προς τη σελίδα event/offer

---

## Μέρος 1: Νέα Ροή Stories με Web Share API

### Τι αλλάζει

**Πριν (τρέχουσα ροή):**
```text
1. Χρήστης πατάει "Instagram Story"
2. Download εικόνα στο κινητό
3. Toast: "Ανέβασε την εικόνα στο Story..."
4. Προσπάθεια άνοιγμα app με deep link
5. Χρήστης ψάχνει εικόνα, ανεβάζει χειροκίνητα
```

**Μετά (νέα ροή με Web Share API):**
```text
1. Χρήστης πατάει "Instagram Story"
2. Δημιουργία εικόνας (1080x1920)
3. Άνοιγμα native share sheet με την εικόνα
4. Χρήστης επιλέγει Instagram/Facebook
5. Εικόνα κοινοποιείται απευθείας!
```

### Τεχνική Υλοποίηση

#### 1. Νέα function: `shareWithNativeSheet`

Θα προστεθεί στο `useShare.ts` μια νέα function που:
- Μετατρέπει το DataURL σε `File` object
- Ελέγχει αν ο browser υποστηρίζει file sharing: `navigator.canShare({ files })`
- Καλεί `navigator.share({ files, title, text, url })`

```typescript
// Νέο utility για μετατροπή DataURL → File
const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

// Νέα export function
export const canShareFiles = (): boolean => {
  if (typeof navigator === 'undefined' || !('share' in navigator)) return false;
  if (typeof navigator.canShare !== 'function') return false;
  // Test with dummy file
  const testFile = new File(['test'], 'test.png', { type: 'image/png' });
  return navigator.canShare({ files: [testFile] });
};
```

#### 2. Αλλαγή ροής για instagram-story / facebook-story

Αντί να κατεβάζει την εικόνα:

```typescript
case 'instagram-story':
case 'facebook-story':
  // 1. Generate image
  const imageDataUrl = await options?.onGenerateImage?.();
  if (!imageDataUrl) break;
  
  // 2. Try Web Share API with file
  if (canShareFiles()) {
    const file = dataURLtoFile(imageDataUrl, 'fomo-story.png');
    try {
      await navigator.share({
        files: [file],
        title: options?.title || 'ΦΟΜΟ',
        text: text,
        url: url,
      });
      toast.success(t.nativeShareSuccess);
      break;
    } catch (e) {
      // User cancelled or failed - fall through to fallback
      if ((e as Error)?.name === 'AbortError') break;
    }
  }
  
  // 3. Fallback: download + instructions
  if (options?.onImageDownload) await options.onImageDownload();
  toast.info(t.storyInstruction);
  break;
```

#### 3. Αλλαγή interface στο PremiumShareSheet

Νέο callback `onGenerateImage` αντί μόνο `onImageDownload`:

```typescript
interface ShareOptions {
  onImageDownload?: () => Promise<void>;
  onGenerateImage?: () => Promise<string | null>; // Returns DataURL
}
```

---

## Μέρος 2: Share για Προσφορές

### Νέα Components

#### 1. `ShareableOfferCard.tsx`

Story-ready εικόνα (1080x1920) για προσφορές:

```text
┌───────────────────────┐
│        ΦΟΜΟ           │
│                       │
│   ┌───────────────┐   │
│   │  Cover Image  │   │
│   │  (Business)   │   │
│   └───────────────┘   │
│                       │
│      🔥 -20%          │
│   Τίτλος Προσφοράς    │
│                       │
│   📅 Λήγει 15 Φεβ     │
│   📍 Business Name    │
│                       │
│  ┌─────────────────┐  │
│  │ Δες στο ΦΟΜΟ    │  │
│  └─────────────────┘  │
└───────────────────────┘
```

#### 2. `ShareOfferDialog.tsx`

Wrapper που ανοίγει το `PremiumShareSheet` με `type="offer"`:

```tsx
<ShareOfferDialog
  open={isShareOpen}
  onOpenChange={setIsShareOpen}
  offer={{
    id: offer.id,
    title: offer.title,
    percent_off: offer.percent_off,
    end_at: offer.end_at,
    businesses: { id: businessId, name: businessName }
  }}
  language={language}
/>
```

### Αλλαγές σε υπάρχοντα αρχεία

#### 1. PremiumShareSheet.tsx

- Προσθήκη `type: 'offer'` στο interface
- Νέο `ShareSheetOffer` interface
- ImagePreviewCard για offers
- HiddenStoryCard με ShareableOfferCard

#### 2. OfferCard.tsx

- Προσθήκη Share icon δίπλα στο "Εξαργύρωσε"
- State για share dialog
- Import ShareOfferDialog

```text
Πριν:
│  [-20%]     [Εξαργύρωσε]│

Μετά:
│  [-20%]   [⬆️] [Εξαργύρωσε]│
```

#### 3. useShare.ts

- Fix `formatOfferShareText` - σωστό URL pattern
- Νέο `getOfferUrlFallback()`

```typescript
export const getOfferUrlFallback = (offerId: string) => 
  `${window.location.origin}/offer/${offerId}`;
```

---

## Μέρος 3: Συμβατότητα & Fallbacks

### Browser Support για Web Share API Files

| Platform | Υποστήριξη |
|----------|------------|
| iOS Safari 15+ | ✅ Πλήρης |
| Chrome Android 76+ | ✅ Πλήρης |
| Desktop browsers | ❌ Όχι (fallback) |

### Fallback Strategy

```text
1. Έλεγχος: canShareFiles()
   ├── ✅ YES → navigator.share({ files })
   │            └── Αν fail → download + instructions
   └── ❌ NO  → download + instructions + try deep link
```

---

## Αρχεία που θα τροποποιηθούν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/hooks/useShare.ts` | Web Share API με files, νέα utilities, fix offer URL |
| `src/components/sharing/PremiumShareSheet.tsx` | Υποστήριξη offers, νέο onGenerateImage callback |
| `src/components/OfferCard.tsx` | Προσθήκη Share button |

## Αρχεία που θα δημιουργηθούν

| Αρχείο | Περιγραφή |
|--------|-----------|
| `src/components/sharing/ShareableOfferCard.tsx` | Story image generator για offers |
| `src/components/sharing/ShareOfferDialog.tsx` | Wrapper component |

---

## Σειρά Υλοποίησης

1. **useShare.ts**: Προσθήκη Web Share API με files + utilities
2. **ShareableOfferCard.tsx**: Δημιουργία story card για offers
3. **ShareOfferDialog.tsx**: Wrapper component
4. **PremiumShareSheet.tsx**: Υποστήριξη offers + νέα ροή stories
5. **OfferCard.tsx**: Share button

