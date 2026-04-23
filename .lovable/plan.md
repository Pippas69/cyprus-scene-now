

# 🚀 Φάση 1Α — Database Migration για SMS Pending Bookings (Διορθωμένη)

## Σκοπός
Δημιουργία database scaffolding για τη λειτουργία "Προσθήκη Κράτησης / Εισιτηρίου μέσω Link". Καθαρά database work — δεν αλλάζει τίποτα στο υπάρχον UI ή στη λειτουργικότητα.

---

## 📊 Νέοι Πίνακες

### 1️⃣ `pending_bookings`
Προσωρινές κρατήσεις/εισιτήρια που ξεκινάει ο επιχειρηματίας και περιμένουν ολοκλήρωση από τον πελάτη μέσω SMS link.

**Πεδία:**
- `token` — **16 chars alphanumeric**, cryptographically secure (62^16 combinations)
- `business_id`, `event_id`, `created_by_user_id`
- `booking_type` — 'reservation' / 'ticket' / 'walk_in'
- `customer_phone` (E.164), `customer_name` (optional)
- `party_size`, `seating_preference`, `preferred_time`
- `tier_data` (jsonb) — για tickets: ποια κατηγορία/πόσα
- `notes` (free text από επιχειρηματία)
- `expires_at` — 48 ώρες από δημιουργία
- `status` — 'pending' / 'completed' / 'expired' / 'cancelled'
- `completed_reservation_id` / `completed_ticket_order_id`

### 2️⃣ `sms_charges`
Ledger για κάθε SMS που στέλνεται.

**Πεδία:**
- `business_id`, `pending_booking_id`
- `to_phone`, `message_body`
- `twilio_message_sid`
- `cost_cents` (όσο μας χρέωσε η Twilio)
- `status` — 'queued' / 'sent' / 'delivered' / 'failed' / 'undelivered'
- `is_billable` — true μόνο όταν status='delivered' ή 'sent'
- `charged_at` (timestamp όταν εισπράχθηκε)
- `stripe_charge_id`

### 3️⃣ `sms_rate_limits`
Anti-pumping protection.

**Πεδία:**
- `phone_number`, `business_id`, `sent_at`
- Indexes για γρήγορα window queries

### 4️⃣ `business_payment_methods`
**ZERO sensitive card data** — μόνο Stripe references + display metadata.

| Πεδίο | Περιεχόμενο |
|-------|-------------|
| `stripe_customer_id` | `cus_...` (Stripe ref) |
| `stripe_payment_method_id` | `pm_...` (Stripe ref) |
| `card_brand` | `'visa'` / `'mastercard'` |
| `card_last4` | `'4242'` (μόνο 4 ψηφία) |
| `card_exp_month`, `card_exp_year` | για display |
| `is_active` | boolean |

❌ **ΠΟΤΕ** δεν αποθηκεύεται: full PAN, CVV, raw card data. Card collection γίνεται μέσω Stripe Elements (PCI-DSS compliant pattern).

---

## 🔧 Helper Functions (SECURITY DEFINER)

- **`generate_booking_token()`** — δημιουργεί μοναδικό 16-char alphanumeric token με `gen_random_bytes`
- **`get_pending_booking_by_token(token)`** — public RPC για το `/r/{token}` page
- **`check_sms_rate_limit(phone, business_id)`** — επιστρέφει `{allowed, reason}`:
  - **Max 3 SMS/phone/hour** (resend protection)
  - **Max 10 SMS/phone/24h** (anti-pumping)
  - **Max 200 SMS/business/24h** (compromised account protection)
- **`consume_pending_booking(token)`** — atomic UPDATE για single-use enforcement
- **`expire_old_pending_bookings()`** — cron-callable cleanup μετά τις 48h

---

## 🔒 RLS Policies

| Πίνακας | Read | Write |
|---------|------|-------|
| `pending_bookings` | Owner business + public via token RPC | Owner business |
| `sms_charges` | Owner business (read-only) | Service role only |
| `sms_rate_limits` | Service role only | Service role only |
| `business_payment_methods` | Owner business | Owner business + service role |

---

## ⚡ Indexes για Performance

- `pending_bookings(token)` UNIQUE
- `pending_bookings(business_id, status, created_at DESC)`
- `pending_bookings(expires_at)` partial WHERE status='pending'
- `sms_charges(business_id, created_at DESC)`
- `sms_charges(business_id, is_billable, charged_at)` partial WHERE charged_at IS NULL
- `sms_rate_limits(phone_number, sent_at DESC)`
- `sms_rate_limits(phone_number, business_id, sent_at DESC)`

---

## 📋 Διορθωμένο Spec Recap (όλες οι αποφάσεις)

| # | Παράμετρος | Τιμή |
|---|------------|------|
| 1 | SMS template | `ΦΟΜΟ: Complete your booking at {business}: {link}` |
| 2 | Token length | **16 chars alphanumeric** (cryptographically secure) |
| 3 | Token URL | `fomo.com.cy/r/{16chars}` |
| 4 | Token expiry | 48 hours, single-use |
| 5 | Resend limit | **3 SMS/phone/hour** |
| 6 | Anti-pumping | **10 SMS/phone/24h** |
| 7 | Business cap | **200 SMS/business/24h** |
| 8 | Pricing model | Pass-through (όσο μας χρεώνει η Twilio) |
| 9 | Plan availability | Όλα τα πλάνα |
| 10 | Billing model | Pay-as-you-go |
| 11 | Failed SMS | Δεν χρεώνουμε (Twilio status callback verification) |
| 12 | Collection | Hybrid: €10 threshold + monthly fallback |
| 13 | Failed payment | 3 retries → pause SMS only |
| 14 | Card storage | Stripe tokens + last4 only (PCI compliant) |
| 15 | Account check | Phone-based identity (όχι forced match) |

---

## ⏭️ Τι ΔΕΝ κάνει αυτή η φάση

- ❌ Δεν στέλνει SMS (Φάση 1Β)
- ❌ Δεν χρεώνει κάρτες (Φάση 4)
- ❌ Δεν δημιουργεί edge functions (Φάση 2)
- ❌ Δεν αλλάζει υπάρχον UI (Φάση 3)

---

## 🔜 Roadmap Επόμενων Φάσεων

| Φάση | Τι κάνει | Προαπαιτούμενο |
|------|----------|----------------|
| **1Β** | Twilio connection + edge function `send-booking-sms` | Twilio account |
| **2** | Edge function `create-pending-booking` | 1Β |
| **3** | UI: Κουμπί "Προσθήκη μέσω Link" στο business dashboard | 2 |
| **4** | Public page `/r/{token}` + checkout integration | 3 |
| **5** | Twilio status webhook + billing logic | 4 |
| **6** | Stripe card setup UI + auto-charge cron | 5 |

---

## ✅ Next Step

Πες **"τρέξε το migration"** ή **"προχώρα"** για να εκτελεστεί το migration tool με όλο το παραπάνω SQL. Μετά την έγκρισή σου στο migration prompt, περνάμε στη **Φάση 1Β** (Twilio setup).

