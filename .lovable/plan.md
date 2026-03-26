
Συμφωνώ απόλυτα — αυτό που βλέπεις τώρα είναι regression και όχι η τελική λογική που ζήτησες.  
Έκανα έλεγχο και βρήκα 3 συγκεκριμένες ρίζες προβλήματος:

1) Το `get_crm_guest_stats` έχει ξαναγραφτεί σε «κομμένη» έκδοση και δεν εφαρμόζει τη λογική Φάση 1/2/3 όπως την όρισες.  
2) Το `favorite_table` υπολογίζεται με λάθος αντιστοίχιση (main reservation identity), άρα σε ghosts που όντως έκαναν visit βγαίνει `null`.  
3) Το `brought_by_name` διαβάζεται από `profiles` στο client, αλλά λόγω RLS συχνά επιστρέφει κενό, οπότε στις λεπτομέρειες του ghost δεν φαίνεται ο booker.

Παράδειγμα που επιβεβαίωσα: reservation `560f8760...` / ticket order `1ee72e0c...`  
- 5 άτομα, prepayment 5000c, min charge tier 10000c, 2 check-ins  
- Σωστό αποτέλεσμα πρέπει να είναι 3500c στους 2 checked-in και 1000c στους 3 non-checked-in  
- Αυτή τη στιγμή το σύστημα δεν το αποδίδει έτσι.

---

## Πλάνο υλοποίησης (διορθωτικό, καθαρό, χωρίς άλλα patches τύπου string-replace)

### 1) Νέο καθαρό migration για πλήρη επαναορισμό `public.get_crm_guest_stats(uuid)`
Θα δημιουργήσω **ένα νέο migration** που θα κάνει `CREATE OR REPLACE FUNCTION` από την αρχή (όχι dynamic replace πάνω σε παλιό SQL text), ώστε να κλειδώσει η σωστή συμπεριφορά.

Θα περιλαμβάνει:

- **Participants per reservation** (main + reservation guests + ticket participants), με:
  - dedup ανά `(reservation_id, g_id)`
  - `is_checked_in` μέσω `BOOL_OR`
  - εξαίρεση main participant σε hybrid όταν υπάρχει linked ticket order (για να μην διπλομετράται ο booker)

- **Spend logic ακριβώς όπως το έθεσες**
  - `prepay_per_person = prepayment_cents / party_size`
  - `target = actual_spend_cents` αν υπάρχει, αλλιώς min charge (tier / fallback)
  - ανά participant:
    - αν δεν έχει check-in -> `prepay_per_person` (κλειδωμένο)
    - αν έχει check-in -> `(target - (no_show_count * prepay_per_person)) / checked_in_count`
  - πάντα με guard `GREATEST(0, ...)` για ασφάλεια
  - άθροισμα όλων = target

- **Favorite table σωστά για όσους έχουν όντως visit**
  - source: checked-in participants + `reservation_table_assignments` + `floor_plan_tables.label`
  - mode/most-frequent label per guest
  - έτσι θα εμφανίζονται labels τύπου `101`, `24`, `BAR 1`, `Π1` σε ghosts και registered, μόνο αν έχουν επισκέψεις

- **Συνέχιση υφιστάμενων μετρικών**
  - visits / no-shows / cancellations / reservation count / avg party size
  - χωρίς να χαθεί dedup λογική επισκέψεων

---

### 2) Διόρθωση `useCrmGuests.ts` για booker name στα ghosts
Θα αλλάξω το source του `brought_by_name`:

- Από query σε `profiles` (που σπάει από RLS)
- Σε query μέσα από `crm_guests` του ίδιου business με `user_id in broughtByIds`, και χαρτογράφηση `user_id -> guest_name` (registered row του booker)

Έτσι ο ghost θα δείχνει σταθερά ποιος τον έφερε, χωρίς κενά από permission blocks.

---

### 3) Μικρό UI polishing στο details panel του ghost
Στο `CrmGuestProfile.tsx` θα κρατήσω το υπάρχον card “Προέλευση / Brought by”, αλλά:
- θα εμφανίζεται σταθερά όταν υπάρχει `brought_by_user_id`
- θα έχει καθαρό fallback κείμενο όταν λείπει προσωρινά το display name (ώστε να μην εξαφανίζεται τελείως το block)

---

### 4) Verification plan (end-to-end)
Μετά την υλοποίηση θα γίνει έλεγχος σε πραγματικά records:

- **CRM spend check** στο συγκεκριμένο σενάριο 5 ατόμων:
  - πριν check-in: 1000c/άτομο
  - με 2 check-ins: 3500c στους checked-in, 1000c στους υπόλοιπους
  - με actual spend override: νέα κατανομή με ίδιο κανόνα
- **Favorite table check**:
  - για checked-in guests της κράτησης με assignment `24`, να εμφανίζεται `24` στο CRM table/profile
  - για guests με 0 visits να μην εμφανίζεται τραπέζι
- **Ghost details check**:
  - να φαίνεται σωστά ο booker στο details tab για ghost profiles

---

## Τεχνικές λεπτομέρειες (συνοπτικά)
- Αρχεία που θα αγγίξω:
  - `supabase/migrations/<new_timestamp>_fix_crm_spend_table_and_ghost_origin.sql`
  - `src/hooks/useCrmGuests.ts`
  - (μικρό) `src/components/business/crm/CrmGuestProfile.tsx`
- Δεν θα πειράξω auto-generated Supabase client/types αρχεία.
- Δεν θα κάνω άλλα «patch πάνω σε patch» migrations· μόνο καθαρό redefine της function για σταθερότητα.

