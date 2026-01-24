
# Σχέδιο: Διόρθωση Κεφαλαίων στο Hero Section (Αγγλικά)

## Πρόβλημα
Στην αγγλική έκδοση, το κείμενο "Options exist," και οι φράσεις του typewriter εμφανίζονται με ΟΛΑ τα γράμματα κεφαλαία. Αυτό συμβαίνει επειδή η γραμματοσειρά **Cinzel** είναι σχεδιασμένη να εμφανίζει τα πεζά γράμματα ως "small caps" (μικρά κεφαλαία).

## Λύση
Αλλαγή της γραμματοσειράς **μόνο για την αγγλική έκδοση** από `font-cinzel` σε μια κανονική γραμματοσειρά που εμφανίζει σωστά τα πεζά γράμματα (π.χ. `font-urbanist` ή `font-poppins`).

## Αλλαγές

### Αρχείο: `src/components/home/HeroSection.tsx`

1. **Γραμμή 96-98 (Κύριος τίτλος)**
   - Αλλαγή από `font-cinzel` σε conditional font class
   - Ελληνικά: παραμένει `font-cinzel`
   - Αγγλικά: αλλάζει σε `font-urbanist` ή `font-poppins`

2. **Γραμμή 100 (Typewriter heading)**
   - Ίδια αλλαγή για τις φράσεις που εμφανίζονται με typewriter effect

## Τεχνικές Λεπτομέρειες

```tsx
// Πριν:
<h1 className="font-cinzel text-3xl ... ">
  {t.heroMain}
</h1>

// Μετά:
<h1 className={`${language === 'el' ? 'font-cinzel' : 'font-urbanist'} text-3xl ... `}>
  {t.heroMain}
</h1>
```

Η ίδια λογική θα εφαρμοστεί και στο h2 με το Typewriter component.

## Σημείωση
Τα ελληνικά ("Επιλογές υπάρχουν,") θα παραμείνουν ακριβώς όπως είναι - με τη γραμματοσειρά Cinzel.
