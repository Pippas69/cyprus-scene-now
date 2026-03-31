
Σωστό — δεν μοιάζουν. Το current layout είναι λάθος παρότι η βάση έχει 2007/9.

1) Reset σε καθαρή βάση
- Επαναφορά από History στο τελευταίο σταθερό checkpoint πριν τα seat-map πειράματα.
- Αφαίρεση των destructive data migrations που κάνουν μόνο `DELETE FROM venue_seats...` ώστε να μη ξανασπάει το layout.
- Καμία αλλαγή schema.

2) Rebuild συντεταγμένων από την αρχή (data operation, όχι migration)
- Κρατάμε ακριβώς τα ίδια zone_ids και seat counts ανά row/zone.
- Ξαναγεννάμε μόνο x,y με deterministic γεωμετρία:
  - κοινό κέντρο σκηνής (cx, cy),
  - outer horseshoe με σειρά ζωνών αριστερά→δεξιά: Α, Β, Γ, Δ, Ε, Ζ, Η, Θ,
  - radial gaps 3° ανά ζώνη + 2° εσωτερικό aisle,
  - Πλατεία ως ξεχωριστό εσωτερικό bowl.
- Εφόσον δεν υπάρχουν συνδεδεμένα sold/issued refs για αυτό το venue, γίνεται ασφαλές replace coordinates.

3) Απλοποίηση SeatMapViewer
- Αφαιρώ προσωρινά inline zone labels και boundary overlays που μπερδεύουν την εικόνα.
- Πραγματικό fit-all στην πρώτη φόρτωση βάσει bounds.
- Αυστηρό pan clamp για να μη “φεύγει” το μισό πλάνο.
- Σκηνή ως γεμισμένο ημικύκλιο, συμμετρικό στο ίδιο κέντρο με το bowl.
- High-density seat rendering χωρίς παραμορφώσεις.

4) QA πριν παράδοση
- Ορατές και οι 9 ζώνες χωρίς drag στο viewport 1062x722.
- SQL validation: 2007 σύνολο, ίδια counts ανά row/zone.
- Οπτική σύγκριση με το reference PDF πριν το κλείσω.

Τεχνικές λεπτομέρειες
- Μόνο data update (x,y) + frontend rendering fix.
- Καμία αλλαγή σε IDs/zones schema.
- Καθόλου migrations για data reshaping.

Πώς μπορείς να βοηθήσεις άμεσα για pixel-perfect αποτέλεσμα
- Επιβεβαίωσε: θες 1:1 με το ασπρόμαυρο PDF ακόμη κι αν σε mobile φαίνεται πιο “σφιχτό”;
- Στείλε 1 annotated εικόνα με 5 anchors:
  1) κέντρο σκηνής, 2) αριστερό άκρο outer τόξου, 3) δεξί άκρο, 4) κέντρο “ΚΥΡΙΑ ΕΙΣΟΔΟΣ”, 5) κέντρο “Β’ ΕΙΣΟΔΟΣ”.
- Επιβεβαίωσε τη σειρά ζωνών αριστερά→δεξιά όπως ακριβώς τη θες στο UI.
