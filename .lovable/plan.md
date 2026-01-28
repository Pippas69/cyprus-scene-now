
# Rebuild Share System: Native-Only Approach

## Πρόβλημα

Το τρέχον share system έχει πολλά προβλήματα:
- 8 αρχεία, ~1500+ γραμμές κώδικα
- Πολύπλοκη λογική deep-links που αποτυγχάνει
- html2canvas για δημιουργία εικόνων story που δεν δουλεύει αξιόπιστα
- Confusing UI με πολλές επιλογές (Instagram DM, Messenger, WhatsApp, Snapchat, Telegram, Instagram Story, Facebook Story)

## Λύση

**Αντικατάσταση με Native Share Sheet μόνο** - Χρήση του Web Share API που δουλεύει αξιόπιστα σε iOS και Android.

```text
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  │        [Cover Image]            │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Event Title / Business Name / Offer    │
│  Subtitle (date, location, etc.)        │
│                                         │
│  ┌────────────────┐ ┌────────────────┐  │
│  │   Copy Link    │ │     Share      │  │
│  │      📋        │ │       ↗        │  │
│  └────────────────┘ └────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Αλλαγές

### Αφαίρεση (7 αρχεία):
- `src/components/sharing/PremiumShareSheet.tsx` (769 γραμμές)
- `src/components/sharing/ShareableEventCard.tsx`
- `src/components/sharing/ShareableBusinessCard.tsx`
- `src/components/sharing/ShareableOfferCard.tsx`
- `src/components/sharing/SocialPlatformIcons.tsx`
- Μέρος του `src/hooks/useShare.ts` (html2canvas, deep links)

### Διατήρηση/Ανανέωση:
- `src/components/sharing/ShareDialog.tsx` - Απλοποίηση
- `src/components/sharing/ShareProfileDialog.tsx` - Απλοποίηση
- `src/components/sharing/ShareOfferDialog.tsx` - Απλοποίηση

### Δημιουργία:
- `src/components/sharing/SimpleShareSheet.tsx` - Νέο minimalist component

## Νέα Λειτουργία

### Mobile (iOS/Android):
1. Πατάς **Share** → Ανοίγει το **native share sheet** του κινητού
2. Επιλέγεις WhatsApp, iMessage, Instagram DM, οτιδήποτε
3. Το λειτουργικό κάνει τα υπόλοιπα

### Desktop:
1. Πατάς **Copy Link** → Αντιγράφεται το URL
2. Πατάς **Share** → Αν υποστηρίζεται, ανοίγει share options

### Τι περιλαμβάνει το share:
- **URL**: `https://fomo.cy/event/[id]` ή `/business/[id]` ή `/offer/[id]`
- **Title**: Όνομα event/business/offer
- **Text**: Σύντομο μήνυμα με λεπτομέρειες

## Technical Details

### SimpleShareSheet Component:
```typescript
// Minimal, focused, reliable
interface SimpleShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
  language: 'el' | 'en';
}
```

### Νέο useSimpleShare hook:
```typescript
const useSimpleShare = () => {
  const share = async (data: { title: string; text: string; url: string }) => {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(data.url);
    }
  };
  
  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };
  
  return { share, copyLink, hasNativeShare: 'share' in navigator };
};
```

## Αποτέλεσμα

| Πριν | Μετά |
|------|------|
| 8 αρχεία, 1500+ γραμμές | 4 αρχεία, ~200 γραμμές |
| 7 social platform buttons | 2 buttons (Copy + Share) |
| Deep links που αποτυγχάνουν | Native API που δουλεύει πάντα |
| html2canvas για stories | Καμία εξάρτηση εικόνων |
| Confusing UX | Απλό, ξεκάθαρο |

## Ροή Υλοποίησης

1. Δημιουργία `SimpleShareSheet` component
2. Δημιουργία `useSimpleShare` hook
3. Ενημέρωση `ShareDialog`, `ShareProfileDialog`, `ShareOfferDialog` να χρησιμοποιούν το νέο component
4. Αφαίρεση παλιών αρχείων
5. Καθαρισμός αχρησιμοποίητου κώδικα από `useShare.ts`
6. Testing σε iOS και Android
