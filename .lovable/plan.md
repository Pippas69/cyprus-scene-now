
## Αφαίρεση του περιορισμού πλάτους στις Ρυθμίσεις Χρήστη

Το πρόβλημα είναι στο αρχείο `src/components/user/UserSettings.tsx`, γραμμή 353. Ο wrapper container έχει `max-w-2xl` (672px max), που δημιουργεί το κενό στα δεξιά. Οι ρυθμίσεις του business dashboard δεν έχουν αυτόν τον περιορισμό, γι' αυτό φαίνονται σωστά.

### Αλλαγή

**Αρχείο:** `src/components/user/UserSettings.tsx`

Αλλαγή της γραμμής 353 από:
```
<div className="space-y-6 max-w-2xl">
```
σε:
```
<div className="space-y-6">
```

Αυτό θα αφήσει τις κάρτες να απλωθούν σε όλο το διαθέσιμο πλάτος, όπως ακριβώς γίνεται στο business dashboard.
