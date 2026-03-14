
Συμφωνώ 100% με αυτό που λες και έκανα διάγνωση πάνω στα πραγματικά δεδομένα του account σου (Blue Martini). Το πρόβλημα δεν είναι “το styling”, είναι κυρίως ο τρόπος ανάλυσης.

## Τι βρήκα (ρίζα προβλήματος)

1) Η AI σήμερα επιστρέφει **ομαδοποιημένες ζώνες** (π.χ. “Outer Ring Tables”, “P-Tables”) αντί για καθαρά αντικείμενα venue.  
2) Μετά γίνεται **επιθετικό clamp** (“βάλε τα τραπέζια μέσα στη ζώνη”) και έτσι πολλά labels καταλήγουν στο ίδιο σημείο (γι’ αυτό βλέπεις πράγματα να λείπουν/να πέφτουν όλα χαμηλά).  
3) Το μοντέλο ζητά “zones + tables”, ενώ εσύ θέλεις “**πιστή αναδημιουργία blueprint χωρίς screenshot**” με συγκεκριμένα labels (Bar 1, Bar 2, DJ, 1-10, 20-29, P1-P9, 101-110).  
4) Η ανάθεση κρατήσεων είναι ουσιαστικά zone-based, ενώ εσύ θες πρακτικά table-point precision.

Αυτός είναι και ο λόγος που ResDiary/SevenRooms/OpenTable φαίνονται “σωστά”: δουλεύουν object-first + deterministic validation, όχι ελεύθερη ζωγραφική ζωνών.

---

## Σχέδιο υλοποίησης (για να βγει όπως το θες)

### Φάση 1 — “Strict Blueprint Extraction” (AI pipeline)
- Αλλάζω το edge function `analyze-floor-plan` από **zone-first** σε **object-first**:
  - `fixtures`: Bar 1, Bar 2, DJ, δομικά blocks
  - `tables`: κάθε τραπέζι ως ξεχωριστό object με label + bbox/position
- Αφαιρώ κανόνες που προκαλούν παραμόρφωση:
  - τέλος το “tables must be inside zone bounds” clamp
  - τέλος το δεύτερο re-normalization που αλλάζει γεωμετρία
- Βάζω 2-pass verification:
  1. extraction pass
  2. validation pass για ελλείψεις/διπλοτοποθετήσεις labels
- Αν confidence χαμηλό (πολλά labels στο ίδιο x/y), γίνεται auto re-run με stricter prompt.

### Φάση 2 — Δομή δεδομένων για πραγματικά clickable σημεία
- Κρατάμε bars/dj ως non-seating fixtures.
- Κάθε τραπέζι γίνεται **assignable seat point** (όχι “θολή ζώνη”).
- Αναβαθμίζω assignment model ώστε η τοποθέτηση να είναι table-accurate (όχι να “κλειδώνει” ολόκληρη ομάδα).

### Φάση 3 — Renderer που μοιάζει με premium venue map (χωρίς screenshot)
- Καθαρό SVG blueprint στα app colors (μονοχρωματικό, όχι πολύχρωμο).
- Μεγαλύτερα labels, μεγαλύτερα hit areas, καλύτερη αντίθεση.
- Κλίμακα στοιχείων από πραγματικά bboxes (όχι ίδιο circle παντού).
- Pan/zoom για να διαβάζονται καθαρά όλα τα labels σε desktop.

### Φάση 4 — Manual correction flow (γρήγορο, όχι κουραστικό)
- “Detected labels panel” με λίστα (1,2,3...,P1...,101...).
- Missing/duplicate indicators.
- 1-click add/move/fix label πάνω στο canvas.
- Save only when validation passes.

---

## Τεχνικές αλλαγές (αρχεία/DB)

1) `supabase/functions/analyze-floor-plan/index.ts`
- νέο schema εργαλείου AI (fixtures + tables)
- αφαίρεση προβληματικού clamping logic
- προσθήκη quality checks + δεύτερο validation pass
- deterministic output ordering

2) `src/components/business/floorplan/FloorPlanEditor.tsx`
- consume νέο payload object-first
- αφαίρεση δεύτερου normalize που αλλοιώνει layout
- νέο render layer: fixtures + tables (χωρίς screenshot bg)
- label QA panel + manual quick-fix interactions

3) `src/components/business/floorplan/FloorPlanAssignmentDialog.tsx`
- πραγματικό table-point assignment
- non-seating fixtures μη assignable
- καθαρό occupancy status ανά τραπέζι

4) DB migration
- προσθήκη πεδίων/σχέσης για table-level assignment (με ασφαλή RLS update)
- backward compatibility για υπάρχοντα assignments

---

## Definition of Done (για να θεωρηθεί “fixed”)
- Με την ίδια κάτοψη, το αποτέλεσμα είναι σταθερό και πιστό.
- Εμφανίζονται τα labels που ζήτησες: Bar 1, Bar 2, DJ, 1-10, 20-29, P1-P9, 101-110.
- Δεν υπάρχει screenshot background.
- Όλα τα seating σημεία είναι εύκολα clickable.
- Η ανάθεση κράτησης γίνεται ανά πραγματικό τραπέζι (όχι κατά προσέγγιση περιοχή).
