
# Διόρθωση Web Share API για Published/PWA

## Το πρόβλημα

Το Web Share API δεν δουλεύει **καθόλου** στο Lovable editor preview γιατί το iOS μπλοκάρει τα `navigator.share()` calls μέσα από third-party iframes. Αυτό **δεν είναι bug** - είναι iOS security restriction.

Στο published URL (fomocy.lovable.app) ή στο PWA, το Web Share API θα δουλέψει κανονικά.

---

## Αλλαγές που θα κάνω

### 1. Βελτίωση ροής για iOS (useShare.ts)

Θα κάνω τις εξής αλλαγές στο `instagram-story` και `facebook-story` case:

```text
ΤΩΡΑ:
1. Generate image
2. Try navigator.share({ files }) ❌ fails
3. Try navigator.share({ text, url }) ❌ fails (iframe block)
4. Fallback: download image + copy link + toast

ΜΕΤΑ:
1. Generate image
2. Copy link to clipboard FIRST
3. Try navigator.share({ files }) 
   - iOS Safari/PWA → Native share sheet opens with image
   - User selects Instagram Stories
   - Instagram Story editor opens with image attached
   - User pastes link from clipboard (already copied!)
4. If fails → download image + toast with instructions
```

### 2. Αλλαγή clipboard timing

```typescript
// Copy link BEFORE attempting share
await copyToClipboard(url);

const shareData = {
  files: [storyFile],
  title: options?.title || 'ΦΟΜΟ',
};

// Try sharing with files only (no text/url - causes issues)
await navigator.share(shareData);
toast.success('Η εικόνα κοινοποιήθηκε! Το link έχει αντιγραφεί - κάνε paste στο Story');
```

### 3. Αφαίρεση URL/text από share data

Το Instagram Stories **αγνοεί** το URL/text που περνάει το Web Share API. Θα το αφαιρέσω για να αποφύγω conflicts:

```typescript
const shareData: ShareData = {
  files: [storyFile],  // Μόνο το file
  // χωρίς title, text, url
};
```

### 4. Βελτιωμένο toast message

```typescript
toast.success(
  language === 'el' 
    ? 'Το link αντιγράφηκε! Επίλεξε Instagram Stories και κάνε paste το link' 
    : 'Link copied! Select Instagram Stories and paste the link',
  { duration: 5000 }
);
```

---

## Αρχεία που θα τροποποιηθούν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/hooks/useShare.ts` | Βελτιωμένη ροή story sharing με clipboard first |

---

## Τεχνικό context

Το Instagram (και Facebook) Stories δεν υποστηρίζουν URL/link embedding μέσω Web Share API. Ο μόνος τρόπος να προσθέσεις link σε Story είναι:
1. Να χρησιμοποιήσεις το Link Sticker μέσα στο Instagram Story editor
2. Να κάνεις paste το link (που θα έχουμε ήδη copied στο clipboard)

Αυτό **δεν είναι τεχνικός περιορισμός του κώδικα** - είναι πώς λειτουργεί το Instagram.

---

## Τι θα βλέπει ο χρήστης (Published/PWA)

```text
1. Πατάει "Instagram Story"
2. Toast: "Το link αντιγράφηκε!"
3. Ανοίγει το iOS share sheet με την εικόνα
4. Επιλέγει "Instagram Stories"  
5. Instagram ανοίγει με την εικόνα στον Story editor
6. Προσθέτει Link Sticker → paste (το link είναι ήδη στο clipboard)
7. Post Story!
```

---

## ΣΗΜΑΝΤΙΚΟ: Testing

Για να τεστάρεις σωστά, πρέπει να:
1. **Publish** την εφαρμογή (πατώντας "Publish" στο Lovable)
2. Ανοίξεις το **fomocy.lovable.app** σε Safari ή στο PWA
3. Τότε το Web Share API θα δουλέψει

Στο editor preview (lovable.dev) δεν θα δουλέψει ποτέ λόγω iOS iframe restrictions.
