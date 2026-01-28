
# Ενισχυμένο Share System με Εικόνα

## Πρόβλημα

Τώρα το share στέλνει **μόνο link και text**, ενώ εσύ θέλεις να στέλνει **και την εικόνα του event/offer/business** ώστε ο παραλήπτης να βλέπει αμέσως το preview.

## Λύση

Χρήση του `navigator.share({ files: [imageFile] })` για να συμπεριληφθεί η εικόνα στο share.

## Πώς θα λειτουργεί

```text
┌─────────────────────────────────────────┐
│           [Event Image]                 │
│      "Summer Party @ Club XYZ"          │
│                                         │
│  ┌────────────────┐ ┌────────────────┐  │
│  │   Copy Link    │ │     Share      │  │
│  └────────────────┘ └────────────────┘  │
│                                         │
│  Πατάς "Share" →                        │
│  ┌─────────────────────────────────┐    │
│  │ iOS/Android Native Share Sheet  │    │
│  │ ┌────────────────────────────┐  │    │
│  │ │     [Event Image.jpg]      │  │    │
│  │ │                            │  │    │
│  │ │  Summer Party @ Club XYZ   │  │    │
│  │ │  https://fomo.cy/e/xxx     │  │    │
│  │ └────────────────────────────┘  │    │
│  │                                 │    │
│  │ WhatsApp · iMessage · Instagram │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Τεχνικές Αλλαγές

### 1. `useSimpleShare.ts` - Νέα `shareWithImage` function

```typescript
interface ShareDataWithImage extends ShareData {
  imageUrl?: string | null;
}

const shareWithImage = async (data: ShareDataWithImage, options?: ShareOptions) => {
  setIsSharing(true);
  
  try {
    let files: File[] = [];
    
    // Fetch image and convert to File
    if (data.imageUrl) {
      const response = await fetch(data.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'share-image.jpg', { type: blob.type || 'image/jpeg' });
      files = [file];
    }
    
    const shareData: ShareDataWithFiles = {
      title: data.title,
      text: data.text,
      url: data.url,
      ...(files.length > 0 && { files })
    };
    
    // Check if device supports file sharing
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else if (navigator.share) {
      // Fallback: share without image
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url
      });
    } else {
      // Final fallback: copy link
      await copyToClipboard(data.url);
      toast.success(t.shareNotSupported);
    }
  } catch (error) {
    // ... existing error handling with fallback to copy
  }
};
```

### 2. `SimpleShareSheet.tsx` - Περνάει imageUrl στο share

```typescript
const handleShare = useCallback(async () => {
  await share({ title, text, url, imageUrl }, { objectType, objectId, businessId });
  onOpenChange(false);
}, [share, title, text, url, imageUrl, objectType, objectId, businessId, onOpenChange]);
```

### 3. CORS Handling για εικόνες

Οι εικόνες από Supabase Storage έχουν proper CORS headers, οπότε το `fetch()` θα δουλέψει.

## Flow Diagram

```text
User πατάει Share
        │
        ▼
┌───────────────────┐
│  Fetch image URL  │
│  → Convert to Blob│
│  → Create File    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ navigator.canShare│──No──┐
│   (with files)?   │      │
└─────────┬─────────┘      │
          │Yes             │
          ▼                ▼
┌───────────────────┐ ┌───────────────────┐
│ navigator.share() │ │ navigator.share() │
│   with image      │ │   text only       │
└─────────┬─────────┘ └─────────┬─────────┘
          │                     │
          └──────────┬──────────┘
                     ▼
             Native Share Sheet
            (WhatsApp, iMessage,
             Instagram, etc.)
```

## Αποτέλεσμα

| Πλατφόρμα | Πριν | Μετά |
|-----------|------|------|
| WhatsApp | Link μόνο | Εικόνα + Link |
| iMessage | Link μόνο | Εικόνα + Link |
| Instagram | Link μόνο | Εικόνα + Link |
| Messenger | Link μόνο | Εικόνα + Link |
| Email | Link μόνο | Εικόνα + Link |

## Σημαντικές Λεπτομέρειες

1. **`navigator.canShare()`**: Ελέγχει αν η συσκευή υποστηρίζει sharing αρχείων
2. **Fallback chain**: Image share → Text-only share → Copy link
3. **CORS**: Οι εικόνες από Supabase έχουν ήδη σωστά headers
4. **File type**: Δημιουργούμε `image/jpeg` ή χρησιμοποιούμε το blob type

## Αρχεία προς τροποποίηση

1. `src/hooks/useSimpleShare.ts` - Προσθήκη image fetching & file sharing logic
2. `src/components/sharing/SimpleShareSheet.tsx` - Περνάει imageUrl στη share function
