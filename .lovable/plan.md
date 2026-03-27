

## Αναβάθμιση CRM: Ταξινόμηση Στηλών + Φίλτρα & Segments

### Περίληψη
Δύο βασικές αλλαγές: (1) Sortable headers στον πίνακα CRM, (2) Αναδιάρθρωση του segment dropdown σε Popover με segments + data filters.

---

### 1. Ταξινόμηση Στηλών (CrmGuestTable.tsx)

Μικρά βελάκια (ChevronUp/ChevronDown) δίπλα σε κάθε header:
- **Πελάτης** — Αλφαβητική (Α→Ω / Ω→Α)
- **Επισκέψεις** — Περισσότερες → Λιγότερες (και αντίστροφα)
- **Τελευταία** — Πρόσφατη → Παλιά (και αντίστροφα)
- **Έξοδα** — Υψηλά → Χαμηλά (και αντίστροφα)
- **No-shows** — Περισσότερα → Λιγότερα (και αντίστροφα)

Κλικ σε header → ενεργοποίηση sort σε αυτή τη στήλη. Δεύτερο κλικ → αντιστροφή κατεύθυνσης. Το ενεργό βελάκι γίνεται highlighted (primary color).

---

### 2. Αναδιάρθρωση Segments (CrmSegmentDropdown.tsx → Popover)

Αντικατάσταση του Select με Popover που έχει δύο ενότητες:

**Segments (radio — μόνο ένα ενεργό):**
- Όλοι οι πελάτες
- Τακτικοί (≥3 επισκέψεις)
- Νέοι (≤1 επίσκεψη)
- Σε κίνδυνο (30+ μέρες ανενεργοί — ενοποίηση at_risk + churned)
- No-show risk (≥2 no-shows)
- Υψηλή δαπάνη (≥€100)

**Αφαιρούνται:** VIP, Γενέθλια

**Φίλτρα δεδομένων (checkboxes — πολλαπλά ενεργά):**
- Έχει Τραπέζι
- Έχει Σημειώσεις
- Έχει Tags
- Έχει Email
- Έχει Τηλέφωνο

Εμφανίζεται ένα badge/counter στο trigger button όταν υπάρχουν ενεργά φίλτρα.

---

### 3. Σύνδεση Λογικής (CrmDashboard.tsx)

- Νέο state: `sortConfig: { column, direction }` + `filters: Set<string>`
- Ο Segment type γίνεται: `"all" | "regulars" | "new" | "at_risk" | "no_show_risk" | "high_spenders"`
- Τα φίλτρα εφαρμόζονται μετά το segment filter και πριν το sort
- Η ταξινόμηση γίνεται δυναμική αντί για hardcoded multi-criteria
- Props `sortConfig` + `onSort` περνάνε στο CrmGuestTable

---

### 4. Ενημέρωση CrmSegmentSidebar

Ίδιες αλλαγές segments (αφαίρεση VIP/Birthday, ενοποίηση at_risk+churned) για συνέπεια.

---

### Αρχεία που αλλάζουν
| Αρχείο | Αλλαγή |
|--------|--------|
| `CrmGuestTable.tsx` | Sortable headers με βελάκια |
| `CrmSegmentDropdown.tsx` | Μετατροπή σε Popover με segments + filters |
| `CrmSegmentSidebar.tsx` | Αφαίρεση VIP/Birthday, ενοποίηση at_risk |
| `CrmDashboard.tsx` | Νέα sort/filter state, δυναμική ταξινόμηση, εφαρμογή φίλτρων |

