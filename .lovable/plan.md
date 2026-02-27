

## Σχέδιο: "Trusted By" Partner Logo Marquee

### Τι υπάρχει ήδη
Υπάρχει έτοιμο component `PartnerLogoMarquee` που φέρνει verified businesses από τη βάση δεδομένων. Αυτή τη στιγμή δεν χρησιμοποιείται πουθενά στην αρχική σελίδα (`Index.tsx`).

### Πρόταση σχεδιασμού

Αντί να χρησιμοποιήσουμε placeholder icons, θα βάλουμε τα **πραγματικά λογότυπα** των επιχειρήσεων (Kaliva, Blue Martini, Crosta Nostra, Sugar Wave, Eterna, Amnesia) σε ένα smooth infinite scrolling marquee.

**Στυλ:**
- Φόντο: διαφανές/subtle, ταιριαστό με το Aegean Navy theme
- Λογότυπα σε **grayscale** που γίνονται **έγχρωμα στο hover**
- Απαλό gradient fade στα άκρα (αριστερά/δεξιά) για ομαλή εμφάνιση
- Τίτλος πάνω: "Μας εμπιστεύονται" (ελ) / "Trusted By" (en) — μικρό, uppercase, tracking-widest
- Κίνηση με framer-motion (αντί CSS animation) για consistency με τα υπόλοιπα components

**Τοποθέτηση:** Μετά το HeroSection και πριν το FeaturesSection — κλασική θέση που ενισχύει την αξιοπιστία αμέσως μετά το πρώτο impression.

### Βήματα υλοποίησης

1. **Ανανέωση `PartnerLogoMarquee`**: Αλλαγή animation σε framer-motion, χρήση των πραγματικών logos από τη βάση (ή hardcoded fallback με τα ονόματα που ανέφερες), grayscale → color hover effect
2. **Ένταξη στο `Index.tsx`**: Προσθήκη του component μεταξύ `HeroSection` και `FeaturesSection`

### Σημείωση
Τα λογότυπα θα έρχονται από τη βάση (verified businesses). Αν κάποια επιχείρηση δεν έχει `logo_url`, θα εμφανίζεται το όνομά της σε minimal style. Αν θέλεις να βάλεις συγκεκριμένα logos hardcoded (π.χ. εικόνες), θα χρειαστεί να τα ανεβάσεις ή να έχουν ήδη `logo_url` στη βάση.

