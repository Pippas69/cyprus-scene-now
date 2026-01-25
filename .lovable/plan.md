
# Διόρθωση Story Sharing για iOS/iPad/PWA

## Τι συμβαίνει τώρα (λάθος)

```
1. Πατάς "Instagram Story"
2. canShareFiles() επιστρέφει false ή navigator.share αποτυγχάνει
3. Fallback: Download εικόνα + Toast οδηγίες
4. Ανοίγει instagram://story-camera → Άνοιγμα κάμερας, ΟΧΙ Story editor
5. Χρήστης πρέπει χειροκίνητα να βρει την εικόνα και να την ανεβάσει
```

## Τι θα συμβαίνει μετά (σωστό)

```
1. Πατάς "Instagram Story"
2. Δημιουργία εικόνας (1080x1920)
3. navigator.share({ files: [image], title, url }) → Native share sheet iOS
4. Επιλέγεις Instagram/Facebook → Ανοίγει απευθείας στο Story section με την εικόνα
```

---

## Αλλαγές στο `useShare.ts`

### 1. Fix `canShareFiles()` - Πιο αξιόπιστος έλεγχος

```typescript
// ΠΡΙΝ:
export const canShareFiles = (): boolean => {
  if (typeof navigator === 'undefined' || !('share' in navigator)) return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
};

// ΜΕΤΑ:
export const canShareFiles = (): boolean => {
  // Check basic requirements
  if (typeof navigator === 'undefined') return false;
  if (!('share' in navigator)) return false;
  
  // On iOS Safari 15+, canShare may not exist but share with files works
  // On Android Chrome 76+, both work
  // Skip the test if canShare doesn't exist - just try sharing
  if (typeof navigator.canShare !== 'function') {
    // iOS Safari may not have canShare but still supports file sharing
    // Return true and let the actual share call handle errors
    return 'share' in navigator && isMobile();
  }
  
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    // Some browsers throw on canShare - still try sharing
    return isMobile();
  }
};
```

### 2. Αλλαγή ροής Story sharing - Πάντα δημιούργησε εικόνα πρώτα

```typescript
// ΠΡΙΝ (γραμμές 411-455):
case 'instagram-story':
case 'facebook-story':
  if (options?.onGenerateImage && canShareFiles()) { // Εδώ είναι το πρόβλημα
    // ... προσπάθεια share
  }
  // Fallback - download + deep link

// ΜΕΤΑ:
case 'instagram-story':
case 'facebook-story':
  // ΠΑΝΤΑ δημιούργησε την εικόνα πρώτα
  let storyImageDataUrl: string | null = null;
  if (options?.onGenerateImage) {
    storyImageDataUrl = await options.onGenerateImage();
  }
  
  if (!storyImageDataUrl) {
    toast.error(t.shareFailed);
    break;
  }
  
  // Attempt 1: Web Share API with files (works on iOS Safari 15+, Chrome Android 76+)
  const file = dataURLtoFile(storyImageDataUrl, 'fomo-story.png');
  
  try {
    // Check if browser can share files
    const shareData: ShareData = {
      files: [file],
      title: options?.title || 'ΦΟΜΟ',
      text: text,
      url: url,
    };
    
    // Validate share capability
    if (navigator.canShare && !navigator.canShare(shareData)) {
      throw new Error('Cannot share files');
    }
    
    await navigator.share(shareData);
    toast.success(t.storyShared);
    break;
  } catch (e) {
    const error = e as Error;
    
    // User cancelled - stop here
    if (error?.name === 'AbortError') break;
    
    console.log('Web Share API with files failed:', error.message);
    
    // Attempt 2: Try sharing without files (just URL/text) - still opens share sheet
    try {
      await navigator.share({
        title: options?.title || 'ΦΟΜΟ',
        text: text,
        url: url,
      });
      toast.success(t.nativeShareSuccess);
      break;
    } catch (e2) {
      if ((e2 as Error)?.name === 'AbortError') break;
      console.log('Web Share API without files also failed:', e2);
    }
    
    // Attempt 3: Fallback - Save image and copy link
    downloadImage(storyImageDataUrl, 'fomo-story.png');
    await copyToClipboard(url);
    toast.info(language === 'el' 
      ? 'Η εικόνα αποθηκεύτηκε και το link αντιγράφηκε! Άνοιξε το Instagram > Stories > Επίλεξε την εικόνα > Πρόσθεσε link sticker'
      : 'Image saved and link copied! Open Instagram > Stories > Select the image > Add link sticker',
      { duration: 6000 }
    );
  }
  break;
```

### 3. Αφαίρεση παλιών deep links που δεν δουλεύουν

Τα deep links `instagram://story-camera` και `fb://story` **δεν λειτουργούν σωστά** γιατί:
- Δεν περνάνε την εικόνα
- Δεν ανοίγουν το Story editor με περιεχόμενο

Αντί να προσπαθούμε να ανοίξουμε την app χωρίς εικόνα, θα χρησιμοποιήσουμε **μόνο το Web Share API** που:
- Λειτουργεί σε iOS Safari 15+ (iPhone/iPad)
- Λειτουργεί σε Chrome Android 76+
- Επιτρέπει στον χρήστη να επιλέξει Instagram/Facebook Stories απευθείας

---

## Αλλαγές στο `PremiumShareSheet.tsx`

### 1. Νέο toast μήνυμα για επιτυχία

Προσθήκη νέου μηνύματος `storyShared` που ήδη υπάρχει στο useShare.ts αλλά δεν χρησιμοποιείται σωστά.

---

## Συνοπτικά

| Τι αλλάζει | Αρχείο |
|------------|--------|
| Fix `canShareFiles()` για iOS/iPad | `useShare.ts` |
| Νέα ροή Story sharing χωρίς παλιά deep links | `useShare.ts` |
| Πάντα δημιούργησε εικόνα πριν το share | `useShare.ts` |
| Καλύτερα error messages | `useShare.ts` |

---

## Τεχνική εξήγηση

Το **Web Share API Level 2** (με files) υποστηρίζεται:
- iOS Safari 15+ ✅
- Chrome Android 76+ ✅
- Chrome Desktop ❌
- Firefox ❌

Στο **PWA** λειτουργεί όπως ακριβώς στο Safari, εφόσον είναι iOS Safari engine.

Η διαφορά με την τρέχουσα υλοποίηση:
1. **Πριν**: Αν `canShareFiles()` αποτύχει → download + ανοίγει instagram://story-camera (δεν δουλεύει)
2. **Μετά**: Πάντα δημιούργησε εικόνα → δοκίμασε share με files → αν αποτύχει, δοκίμασε share χωρίς files → αν αποτύχει, download + copy link + καλύτερες οδηγίες
