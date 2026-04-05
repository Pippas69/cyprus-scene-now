# 🏗️ Infrastructure Operations Guide — ΦΟΜΟ Platform

## 1. Instance Sizing (Αναβάθμιση Server)

### Τι είναι
Το Lovable Cloud τρέχει σε compute instance με συγκεκριμένη ισχύ. Μπορείς να αλλάζεις μέγεθος ανάλογα τις ανάγκες.

### Πότε να κάνεις Upgrade

| Κατάσταση | Instance | Concurrent Users |
|-----------|----------|-----------------|
| Καθημερινή λειτουργία | **Small** | ~2.000 |
| Πριν μεγάλο event (24h πριν) | **Medium** | 2.000-5.000 |
| Πολύ μεγάλο event (festival κλπ) | **Large** | 5.000-10.000+ |

### Πώς να κάνεις Upgrade/Downgrade
1. Άνοιξε το project στο Lovable
2. Πήγαινε: **Backend** → **Advanced Settings** → **Upgrade Instance**
3. Επίλεξε μέγεθος
4. Περίμενε 2-3 λεπτά για το resize

### Στρατηγική κόστους
- Κράτα **Small** για καθημερινή χρήση (ελαχιστοποιεί κόστος)
- Upgrade σε **Medium** μόνο 24h πριν μεγάλο event
- **Downgrade πίσω σε Small** μετά το event (π.χ. την επόμενη μέρα)
- Πληρώνεις μόνο τις ώρες που είσαι σε μεγαλύτερο instance

### Σημάδια ότι χρειάζεσαι upgrade
- Αργά queries (>2 δευτερόλεπτα)
- Timeout errors κατά αγορά εισιτηρίων
- Dashboard φορτώνει αργά
- "Too many connections" errors

---

## 2. Data Archival Strategy (Μακροχρόνια Διαχείριση Δεδομένων)

### Τρέχουσα κατάσταση
- ✅ **Automated cleanup cron** (κάθε 6 ώρες):
  - Ακυρώνει abandoned orders (>2h χωρίς πληρωμή)
  - Απενεργοποιεί expired discounts
  - Διαγράφει read notifications (>90 ημερών)
  - Διαγράφει old notification logs (>90 ημερών)

- ✅ **Event archival system** (χειροκίνητο):
  - Κουμπί "Αρχειοθέτηση" εμφανίζεται 12h μετά τη λήξη event
  - Αρχειοθετημένα events κρύβονται από κύρια λίστα
  - Πλήρης επαναφορά δυνατή ανά πάσα στιγμή

### Μελλοντικό σχέδιο (όταν η βάση μεγαλώσει σημαντικά)

**Φάση Α — Μετά από 6-12 μήνες λειτουργίας:**
- Παρακολούθηση μεγέθους βάσης μέσω Lovable Cloud dashboard
- Αν ξεπεράσει τα 5GB: αξιολόγηση table sizes

**Φάση Β — Μετά από 1-2 χρόνια:**
- Table partitioning by year σε μεγάλα tables (engagement_events, discount_views, event_views)
- Αυτόματη μεταφορά παλιών partitions σε cold storage

**Φάση Γ — Μετά από 2+ χρόνια:**
- Read replicas για analytics queries (δεν επιβαρύνουν την κύρια βάση)
- Αρχειοθέτηση ολόκληρων χρονικών περιόδων σε external storage

### Tables που θα μεγαλώσουν πρώτα (παρακολούθηση)
1. `engagement_events` — Ήδη 33K rows, αυξάνεται γρήγορα
2. `discount_views` — Κάθε view = 1 row
3. `event_views` — Κάθε view = 1 row
4. `ticket_orders` — Κάθε αγορά εισιτηρίου
5. `notifications` — Πολλαπλές ανά χρήστη/ημέρα

### Πότε να ανησυχήσεις
- Database size > 10GB → Σκέψου partitioning
- Queries > 5 δευτερόλεπτα → Σκέψου read replicas
- Dashboard analytics αργά → Σκέψου materialized views

---

## 3. Connection Pooling (Ήδη ρυθμισμένο ✅)

Το Lovable Cloud παρέχει ενσωματωμένο connection pooler (PgBouncer). Όλα τα Edge Functions και ο frontend client χρησιμοποιούν ήδη τη σωστή σύνδεση. **Δεν χρειάζεται καμία ενέργεια.**

---

## 4. PWA / Add to Home Screen (Ήδη ρυθμισμένο ✅)

- Manifest.webmanifest με proper icons (192x192, 512x512)
- Offline fallback page (offline.html)
- Service Worker με push notifications + offline support
- Iframe guard: SW δεν ενεργοποιείται στο Lovable preview

### Πώς χρησιμοποιείται
- Οι χρήστες σε mobile Chrome/Safari θα δουν prompt "Add to Home Screen"
- Η εφαρμογή ανοίγει σαν native app (χωρίς address bar)
- Αν χαθεί η σύνδεση, εμφανίζεται φιλικό offline page
