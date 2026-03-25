
Σού έπιασα ακριβώς το requirement: **ένα πραγματικό άτομο = μία επίσκεψη ανά έξοδο**, ανεξάρτητα από το από ποιο flow πέρασε το QR (κρατήσεις, προσφορές, events, tickets, student), και αυτό να φαίνεται ίδιο σε **CRM + Πελάτες + Επαναλαμβανόμενους + Overview + Performance + Audience + Boost**.

## Τι βρήκα από τον κώδικα (ρίζα προβλήματος)
1. Η μέτρηση επισκέψεων γίνεται σε πολλά διαφορετικά σημεία (hooks + SQL function) με διαφορετικούς κανόνες.
2. Το `get_crm_guest_stats` κάνει `UNION ALL` πηγές επισκέψεων χωρίς καθολικό deduplication.
3. Στο `ticket_visits` του `get_crm_guest_stats` γίνεται `COALESCE(name_match, user_match)` (name-first), που μπορεί να ρίξει registered user σε ghost ταυτοποίηση.
4. Υπάρχουν **2 overloaded** versions της `sync_crm_guest_from_ticket_data(...)`, που αυξάνει την πιθανότητα ασυνέπειας ταυτοποίησης.
5. `usePerformanceMetrics`, `useBoostValueMetrics`, `get_audience_demographics`, `useOverviewMetrics` δεν μοιράζονται ένα κοινό “visit identity” μοντέλο.

## Σχέδιο υλοποίησης

### 1) Ορισμός ενός ενιαίου κανόνα “Visit Identity” (backend source of truth)
- Θα φτιάξω ενιαία SQL λογική που παράγει canonical visit records από όλες τις QR πηγές:
  - ticket check-ins
  - reservation check-ins (direct + event)
  - offer redemptions (including walk-in)
  - student redemptions
- Για registered χρήστες: ταυτοποίηση **πρώτα με `user_id`**.
- Για ghost: fallback με normalized name (+ phone όταν υπάρχει).
- Θα παραχθεί σταθερό `visit_dedupe_key` ώστε μία έξοδος να μετράει μία φορά, όχι πολλαπλά από διαφορετικά flows.

### 2) CRM stats function refactor
- Refactor `get_crm_guest_stats(p_business_id)` ώστε:
  - να διαβάζει από το νέο canonical visit set,
  - να εφαρμόζει dedup πριν το aggregation,
  - να κάνει **user-first mapping** (όχι name-first) όπου υπάρχει account.
- Έτσι τα `total_visits`, `first_visit`, `last_visit`, loyalty segments κ.λπ. θα είναι σωστά και σταθερά.

### 3) Ενοποίηση Analytics με το ίδιο dedup model
- `useOverviewMetrics`:
  - `visitsViaQR`, `customersThruFomo`, `repeatCustomers` να βασίζονται στον ίδιο dedup κανόνα (όχι ανεξάρτητη ad-hoc μέτρηση).
- `usePerformanceMetrics`:
  - Profile/Offers/Events visits να προκύπτουν από το ίδιο canonical set (με σωστό attribution ανά section).
- `get_audience_demographics`:
  - να μετρά weighted demographics από deduped visits.
- `useBoostValueMetrics`:
  - visits boosted/non-boosted να βασίζονται σε deduped visits και μετά να γίνεται attribution.

### 4) Σταθεροποίηση identity merge στο CRM ingestion
- Καθαρισμός/ενοποίηση της `sync_crm_guest_from_ticket_data` (μία canonical υπογραφή).
- Trigger/functions να ακολουθούν σταθερά τον κανόνα:
  - αν το άτομο είναι account holder και το όνομα που μπήκε ταιριάζει με profile name (ή είναι κενό), merge στο registered profile.
  - party guests που δεν είναι account holder να παραμένουν ghost.
- Αυτό καλύπτει ακριβώς το case που ανέφερες (π.χ. “Μαρίνος” από account “Μαρίνος Κούμη”).

### 5) Data correction για υπάρχοντα ήδη διπλά CRM records
- Migration για safe merge υπάρχοντων ghost εγγραφών που είναι προφανές match registered user (normalized name + business scope), ώστε να καθαρίσουν ιστορικά duplicates.
- Διατήρηση ακεραιότητας σε notes/tags/relations.

### 6) End-to-end validation matrix (υποχρεωτικό)
Θα γίνει έλεγχος με πραγματικά δεδομένα για:
- κράτηση από προφίλ
- προσφορά με κράτηση
- walk-in προσφορά
- event reservation
- event ticket
- hybrid (reservation + ticket)
- student redemption

Και θα επιβεβαιωθεί ότι ο ίδιος άνθρωπος γράφεται ως **1 επίσκεψη** παντού (CRM/Overview/Performance/Audience/Boost), με ίδια νούμερα σε όλα τα tabs.

## Τεχνικές λεπτομέρειες (συνοπτικά)
- Αρχεία που θα αγγίξω:
  - `supabase/migrations/*` (functions + dedup logic + cleanup)
  - `src/hooks/useOverviewMetrics.ts`
  - `src/hooks/usePerformanceMetrics.ts`
  - `src/hooks/useBoostValueMetrics.ts`
  - (μέσω migration) `get_crm_guest_stats`, `get_audience_demographics`, sync/trigger CRM identity functions
- Κεντρική αρχή: **ένα shared dedup backend model** και όλα τα UI hooks να διαβάζουν από αυτό, ώστε να μην ξανασπάσει σε διαφορετικές μετρήσεις.

