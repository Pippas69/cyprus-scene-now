
# Fix Share Fallback for Preview & Restricted Contexts

## Πρόβλημα

Το native share αποτυγχάνει στο Lovable preview iframe με:
```
NotAllowedError: Third-party iframes are not allowed to call share()
```

Ο τρέχων κώδικας κάνει log το error αλλά **δεν κάνει fallback** στο copy link, με αποτέλεσμα να μην γίνεται τίποτα visible για τον χρήστη.

## Λύση

Θα ενημερώσω τη `share` function στο `useSimpleShare.ts` ώστε:
1. Όταν αποτυγχάνει με `NotAllowedError`, να κάνει **αυτόματο fallback** στο copy link
2. Να δείχνει toast "Το link αντιγράφηκε!" 
3. Να διατηρεί την ίδια συμπεριφορά για `AbortError` (user cancelled - no toast)

## Αλλαγή Κώδικα

**Αρχείο:** `src/hooks/useSimpleShare.ts`

**Πριν (γραμμές 166-171):**
```typescript
} catch (error) {
  // User cancelled the share - don't show error toast
  const err = error as Error;
  if (err?.name !== 'AbortError') {
    console.error('Share failed:', error);
  }
}
```

**Μετά:**
```typescript
} catch (error) {
  const err = error as Error;
  
  // User cancelled the share - no action needed
  if (err?.name === 'AbortError') {
    return;
  }
  
  // NotAllowedError: iframe restrictions or permissions denied
  // Fall back to copy link
  if (err?.name === 'NotAllowedError') {
    const success = await copyToClipboard(data.url);
    if (success) {
      toast.success(t.shareNotSupported);
    }
    return;
  }
  
  // Other errors - log and fallback to copy
  console.error('Share failed:', error);
  const success = await copyToClipboard(data.url);
  if (success) {
    toast.success(t.shareNotSupported);
  }
}
```

## Αποτέλεσμα

| Περίπτωση | Πριν | Μετά |
|-----------|------|------|
| Preview iframe | Τίποτα | Αντιγράφει link + toast |
| User cancels | Τίποτα ✓ | Τίποτα ✓ |
| Production (iOS/Android) | Native share ✓ | Native share ✓ |
| Desktop no support | Αντιγράφει ✓ | Αντιγράφει ✓ |

## Testing

Μετά την αλλαγή:
1. **Στο preview**: Πάτα Share → Toast "Το link αντιγράφηκε στο clipboard"
2. **Στο fomocy.lovable.app**: Πάτα Share → Native share sheet ανοίγει κανονικά
