# 🔒 Platform Verification Suite

Αυτοματοποιημένα tests που αποδεικνύουν ότι η πλατφόρμα είναι **operationally safe** για πραγματικά events και χρήματα.

---

## 📋 Test Suites

### Unit / Integration Tests (Deno)

| Suite | Αρχείο | Τι ελέγχει |
|-------|--------|------------|
| 01 | `01-ticket-atomicity.test.ts` | Ατομικότητα κρατήσεων εισιτηρίων, αποτροπή overselling, concurrent access |
| 02 | `02-qr-checkin-integrity.test.ts` | QR check-in ακεραιότητα, μοναδικότητα εισόδου, απόρριψη ακυρωμένων |
| 03 | `03-offer-atomicity.test.ts` | Ατομικότητα claims προσφορών, αρνητικό capacity prevention |
| 04 | `04-payment-idempotency.test.ts` | Webhook idempotency, duplicate rejection, grace window, health check |
| 05 | `05-tenant-isolation.test.ts` | RLS verification, cross-business data isolation |
| 06 | `06-reconciliation-validation.test.ts` | Amount/currency/metadata validation, timing logic |

### Load Tests (k6)

| Suite | Αρχείο | Τι ελέγχει |
|-------|--------|------------|
| L1 | `../load/k6-concurrent-checkout.js` | 200 concurrent checkouts → ≤50 successes, 0 overselling |
| L2 | `../load/k6-scanner-stress.js` | 5 scanners, 500 scans, 3min → 0 duplicate entries |

---

## 🚀 Εκτέλεση Tests

### Deno Tests (Integration)

Εκτελούνται μέσω του Lovable test runner ή χειροκίνητα:

```bash
# Τρέξε όλα τα verification tests
deno test tests/verification/ --allow-net --allow-env --allow-read

# Τρέξε ένα συγκεκριμένο suite
deno test tests/verification/01-ticket-atomicity.test.ts --allow-net --allow-env --allow-read
```

### Load Tests (k6)

```bash
# Concurrent Checkout Test
k6 run --vus 200 --duration 30s tests/load/k6-concurrent-checkout.js

# Scanner Stress Test  
k6 run --duration 3m tests/load/k6-scanner-stress.js
```

---

## ✅ Pass/Fail Criteria

### MUST PASS (Critical — αποτυχία = production blocker)

| Criterion | Test | Threshold |
|-----------|------|-----------|
| **Zero overselling** | 01.5, L1 | `successes ≤ capacity` |
| **Zero duplicate check-ins** | 02.3, L2 | `duplicate_entries == 0` |
| **Zero negative capacity** | 03.3 | `people_remaining ≥ 0` |
| **Webhook idempotency** | 04.1, 04.2 | Duplicate events rejected |
| **Tenant isolation** | 05.1, 05.2 | No cross-business data leakage |

### SHOULD PASS (Important — αποτυχία = degraded experience)

| Criterion | Test | Threshold |
|-----------|------|-----------|
| **Checkout p95 latency** | L1 | `< 10s` |
| **Scan p95 latency** | L2 | `< 3s` |
| **Error rate** | L2 | `< 1%` |
| **Health check** | 04.5 | All systems healthy |

### INFORMATIONAL (Monitored — no hard threshold)

| Metric | Source | Description |
|--------|--------|-------------|
| Lock timeout frequency | L1 | Advisory lock wait > 5s |
| Reconciliation count | 06.1 | Orders needing auto-recovery |
| Grace window edge cases | 06.4, 06.5 | Timing boundary accuracy |

---

## 🏗 Αρχιτεκτονική Ασφαλείας

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  sessionStorage idempotency + circuit breaker        │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              EDGE FUNCTIONS                          │
│  • Auth check (JWT + business ownership)             │
│  • Stripe signature verification                     │
│  • INSERT ON CONFLICT (webhook idempotency)          │
│  • order.status === "completed" guard                │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              DATABASE (PostgreSQL)                    │
│  • pg_advisory_xact_lock per tier/discount/slot      │
│  • SET lock_timeout = '5s'                           │
│  • UPDATE WHERE status='valid' (atomic check-in)     │
│  • RLS on all business/financial tables              │
│  • Audit trail triggers on critical tables           │
│  • webhook_events_processed UNIQUE constraint        │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              RECOVERY SYSTEMS                        │
│  • reconcile-payments cron (15 min)                  │
│  • 45-min grace window                               │
│  • charge.refunded → auto-invalidate tickets         │
│  • charge.dispute.created → auto-block + alert       │
│  • Offline QR scan queue (IndexedDB + sync)          │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Αναμενόμενα Αποτελέσματα

### Concurrent Checkout (200 users / 50 tickets)
```json
{
  "test": "Concurrent Ticket Checkout",
  "totalRequests": 200,
  "successful": 50,
  "failed": 150,
  "verdict": "✅ PASS - No overselling"
}
```

### Scanner Stress (5 scanners / 500 scans / 3 min)
```json
{
  "test": "Multi-Scanner Stress Test",
  "totalScans": 500,
  "duplicateEntries": 0,
  "verdict": "✅ PASS - Zero duplicate entries"
}
```

---

## 🔄 Επαναληψιμότητα

Τα tests είναι σχεδιασμένα να τρέχουν **οποιαδήποτε στιγμή**:
- Δημιουργούν δικά τους test data (prefixed με `[TEST]`)
- Καθαρίζουν μετά την εκτέλεση
- Δεν εξαρτώνται από εξωτερικό state
- Μπορούν να τρέχουν παράλληλα χωρίς conflicts

---

## ⚠️ Σημειώσεις

1. **Load tests (k6)**: Απαιτούν k6 CLI εγκατεστημένο τοπικά + env vars
2. **Stripe tests**: Ορισμένα tests (04.3) δεν μπορούν να καλέσουν πραγματικό Stripe API χωρίς test session
3. **RLS tests**: Χρησιμοποιούν service_role — σε production, authenticated users περιορίζονται αυτόματα από RLS
