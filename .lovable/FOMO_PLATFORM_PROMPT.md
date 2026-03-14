# FOMO.CY — Complete Platform Specification & System Prompt

> **Version**: 1.0 — March 2026  
> **Domain**: fomo.com.cy  
> **Market**: Cyprus (Nicosia, Limassol, Larnaca, Paphos, Ayia Napa)  
> **Comparable to**: OpenTable × SevenRooms × ResDiary × Eventbrite × Groupon  
> **Stack**: React + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)

---

## 1. VISION & POSITIONING

FOMO.CY is a **hospitality super-platform** for Cyprus that unifies nightlife, dining, events, and entertainment into a single ecosystem. It serves **two distinct user types**:

### 1.1 For Consumers (Visitors / End Users)
- Discover events, clubs, bars, restaurants, theatres, and performances across Cyprus
- Browse and RSVP to events (Going / Interested)
- Make reservations at venues with real-time availability
- Purchase tickets for events with multiple tiers (General, VIP, Early Bird, etc.)
- Claim and redeem offers/discounts via QR codes
- Follow businesses for personalized notifications
- View venues on an interactive map with subscription-tier visual hierarchy
- Receive AI-personalized event recommendations
- Student verification system for exclusive discounts
- Direct messaging with businesses
- Personal dashboard with upcoming events, reservations, tickets, and favorites

### 1.2 For Businesses (Venue Owners / Operators)
- Full CRM and reservation management system (comparable to SevenRooms/OpenTable)
- Interactive AI-powered floor plan management
- Event creation and ticketing with multiple ticket tiers
- Offer/discount creation and management with QR redemption
- Real-time analytics dashboard (views, interactions, visits, demographics)
- Boost/promotion system with paid advertising tiers
- Staff controls for live reservation and capacity management
- Direct messaging with customers
- Stripe Connect integration for payments and payouts
- Subscription-based plans (Free, Basic, Pro, Elite) with tiered features
- Blog and social feed posting system
- Student discount management

---

## 2. USER-FACING FEATURES (Consumer App)

### 2.1 Discovery & Browsing

**Feed** (`/feed`): A personalized content feed showing:
- Business directory with category filtering (Clubs, Bars, Restaurants, Cafés, Theatres, etc.)
- Active events with date/category filters
- Active offers/discounts
- Business posts (announcements, polls, media)
- Hierarchical category system with parent/child categories

**Map** (`/xartis`): Interactive Mapbox-powered map displaying:
- Business pins with **visual hierarchy based on subscription**:
  - Free: 16px ocean blue teardrop
  - Basic: 24px cyan teardrop
  - Pro: 32px coral diamond/shield with glow
  - Elite: 38px purple diamond with pulse animation
- Z-index layering ensures paid tiers are never obscured
- Click-to-zoom (flyTo zoom 15) with popup after 500ms
- Business list sheet with quick-action badges (Profile, Directions)

**Search**: Global search across events, businesses, and offers with tracking for analytics attribution.

**Events** (`/ekdiloseis`): Full event listing with:
- Category filters (Music, Sports, Theatre, Food, etc.)
- Date range filtering
- Price tier indicators (Free, €, €€, €€€)
- RSVP system (Going / Interested) with social proof counters
- Event detail pages with full descriptions, performers, gallery, accessibility info, dress code, parking

**Offers** (`/offers`): Discount and deal browsing with:
- Multiple offer types: percentage off, fixed price, bundle deals, store credit
- Time-limited validity windows (start/end dates, valid days, valid hours)
- Per-user redemption limits
- QR code-based redemption at venue
- Reservation-linked offers (requires booking to claim)

### 2.2 Reservations (Consumer Side)

The reservation system supports **three distinct event configurations**:

**A) Reservation-Only Events** (Dining, Bars):
- Time-slot based booking with real-time availability
- Party size selection with min/max constraints
- Seating preference (Indoor/Outdoor/Bar/VIP)
- Special requests / notes field
- Cyprus timezone-aware scheduling
- Overnight logic support (e.g., 22:00 → 03:00)
- Automatic capacity release on cancellation/no-show (15-min grace)

**B) Ticket-Only Events** (Concerts, Performances):
- Multiple ticket tiers with independent pricing and quantities
- Per-tier dress codes
- Max per order limits
- Individual guest names required per ticket (for personalized QR codes)
- Stripe checkout with guest name metadata persistence

**C) Hybrid Events** (Clubs with table service + general admission):
- Combined ticket purchase + table reservation
- Seating tiers with minimum charge (e.g., VIP Table: €200 min)
- Ticket credit applied toward minimum charge
- Pre-payment via Stripe with remaining balance settled at venue

### 2.3 Ticketing & QR System

Every guest receives a **unique, personalized QR code**:
- Event tickets → `tickets` table (via `ticket_orders`)
- Direct reservations → `reservation_guests` table
- Walk-in offer claims → `offer_purchase_guests` table

**QR Code Features**:
- Individual QR per guest (not per booking)
- Guest name embedded in QR
- Carousel navigation on success screens and user dashboard
- Real-time check-in validation: `UPDATE ... WHERE status = 'valid'` (prevents double-scan)
- Offline scanning support via IndexedDB

### 2.4 Offers & Redemption

**Offer Types**:
1. **Percentage Discount**: X% off selected items
2. **Fixed Price Bundle**: Set menu at fixed price
3. **Store Credit**: Buy €X credit, get Y% bonus
4. **Special Deal**: Custom text-based offer

**Redemption Flow**:
1. User claims offer (with or without reservation)
2. Receives unique QR code
3. Shows QR at venue
4. Staff scans → validates → marks redeemed
5. Commission tracked in `commission_ledger`

**Offer Purchases**: Paid offers go through Stripe checkout. Free offers are claimed directly. Commission-free offers available for subscribed businesses.

### 2.5 Student Verification

- University email verification system
- Token-based email verification flow
- Verified students unlock exclusive discounts at participating venues
- Student discount scanner at venues validates student status
- Configurable per-business: enable/disable, discount percentage, discount mode

### 2.6 User Dashboard (`/dashboard-user`)

- Upcoming reservations with QR codes
- Purchased tickets with guest QR carousel
- Claimed offers with redemption status
- Favorite events and businesses
- Personal profile management

### 2.7 Messaging (`/messages`)

Real-time direct messaging between users:
- Conversation list with last message preview
- Chat window with message bubbles
- Read status tracking (`last_read_at`)
- Real-time updates via Supabase Realtime

---

## 3. BUSINESS DASHBOARD (`/dashboard-business`)

### 3.1 Overview & Quick Stats

- Total followers
- Active events count
- Active offers count
- Pending reservations
- Recent activity feed

### 3.2 Event Management

**Event Creation Form**:
- Title, description, location, venue name
- Date/time range (start_at, end_at)
- Category selection (multi-select)
- Cover image upload with crop dialog
- Gallery images
- Event type: `free`, `free_entry`, `ticket`, `reservation`, `hybrid`
- Performers list
- Dress code, minimum age hint, accessibility info, parking info
- Terms and conditions
- Appearance mode: `always`, `scheduled` (with appearance_start_at/end_at)
- Reservation settings: accepts_reservations, seating_options, min/max party size, max_reservations, requires_approval, reservation_hours

**Ticket Tier Editor** (for ticketed events):
- Multiple tiers with name, description, price, quantity, max_per_order, dress_code
- Sort order management
- Real-time inventory tracking

**Event List**:
- Active/Past filtering
- Quick stats per event (RSVPs, ticket sales, reservations)
- Edit dialog with full form
- Boost creation from event card

### 3.3 Reservation Management System

This is the **core CRM component**, comparable to SevenRooms/OpenTable/ResDiary.

#### 3.3.1 Reservation Dashboard (`/dashboard-business/reservations`)

**Dynamic Configuration**:
- Adapts UI based on event type (Hybrid, Ticket-only, Reservation-only)
- Free events excluded from dropdown and badge counts
- Dropdown shows event dates concisely ("5 Μαρτίου") with reservation count badges

**Unified Table View**:
- Horizontally-scrollable table (`min-w-[600px]`) for all devices
- Stacked vertical layout for maximum space efficiency
- Columns: Name/Phone (stacked), Party Size/Details, Price/Tier, Status, Staff Memo
- Identical layout across all event types (Hybrid, Ticket-only, Reservation-only)

**Management Features**:
- Inline editing for Name, Party Size, Date/Time (datetime-local picker)
- Real-time background refresh every 5 seconds (no loading spinners)
- Status management: pending → accepted → checked_in / declined / no_show / cancelled
- Staff Memo: inline-editable internal notes column with auto-save on Enter
- Customer Comments: green 💬 icon for special requests (filtered to exclude system messages)

**Ticket-Only Mode**:
- Displays "Παραγγελίες Εισιτηρίων" (Ticket Orders) view
- Shows: Buyer Name, Phone, Tickets count, Age, Price, Status
- Status shows "Επιβεβαιωμένη" (Confirmed)
- After scan: "check in" (single) or "X/Y check ins" (multiple)

**Hybrid Mode**:
- Main price from seating tiers (minimum charge)
- Parenthetical price shows ticket credit (prepayment)
- Combined view of table reservations and general admission tickets

**Translations**: Dynamic seating type translation (table→Τραπέζι, sofa→Καναπές, vip→VIP, bar→Bar)

#### 3.3.2 Staff Controls

Premium UI with glassmorphism design:
- Toggle switches for opening/closing time slots
- Inline capacity editing per slot
- Auto-hide empty sections (e.g., TABLES section hidden if no tables exist)
- Real-time slot availability display

**Slot Management**:
- Time-slot based with configurable start/end times
- Capacity per slot
- Day-of-week restrictions
- Overnight logic support
- Atomic booking via `book_slot_atomically` PostgreSQL function
- Advisory locks (`pg_advisory_xact_lock`) with 5-second timeout to prevent overselling
- Automatic capacity release on cancellation/no-show

#### 3.3.3 Direct Reservation Settings

"Διαχείριση Κρατήσεων" (Reservation Management):
- Collapsible slot managers
- Unified primary-colored badges
- Responsive seating option buttons (Indoor/Outdoor)
- Daily reservation limits
- Reservation approval requirements
- Reservation time windows

### 3.4 Interactive Floor Plan System

**AI-Powered Floor Plan Analysis**:
- Upload venue blueprint/floor plan image
- Edge Function `analyze-floor-plan` uses **Gemini 2.5 Pro** for extraction
- Object-first approach: detects every table (P1, 101, etc.) and fixture (Bar, DJ, Stage) individually
- Precise bounding boxes with width/height percentages
- OCR correction (n→P for labels like n1→P1)

**Shape-Aware Rendering**:
- Dark-themed SVG canvas (#0a1628) with primary-colored strokes
- No background image — clean, styled layout for premium aesthetics
- Shape inference: round tables → ellipses, booths → sharp rectangles
- Geometry harmonization for table families (consistent sizes within groups)
- Strict deduplication for overlapping detections

**Floor Plan Editor**:
- Manual drag-and-drop after AI analysis
- Resize elements
- Add/delete tables and fixtures
- Zone management with capacity tracking

**Reservation Assignment**:
- Click table → assign reservation
- Real-time occupancy display (Available/Occupied)
- Status labels on tables
- Increased hit area (TABLE_HIT_RADIUS) for easy mobile interaction

### 3.5 Offer Management

**Offer Creation Form**:
- Title, description, terms
- Offer type selection (percentage, bundle, credit, special deal)
- Pricing configuration (original price, discount amount, bundle price)
- Validity period (start/end dates, valid days, valid hours)
- Capacity limits (total people, per-user limits)
- Item list (discount_items table)
- Offer image upload
- Reservation linking option
- Student discount compatibility

**QR Scanning**:
- `UnifiedQRScanner`: Camera-based QR scanning for offer redemption
- `OfferQRScanner`: Dedicated scanner for offer codes
- `CreditBalanceScanner`: Scanner for store credit balance checking
- Validation via `validate-qr` and `validate-offer` edge functions
- Real-time commission tracking

### 3.6 Analytics Dashboard

**Four Analytics Tabs**:

1. **Overview**: Aggregate metrics across all content
   - Total views, interactions, visits
   - Follower growth trends
   - Revenue summary

2. **Performance** (Απόδοση):
   - Profile: Views → Interactions → Visits conversion funnel
   - Events: Views → RSVPs → Check-ins
   - Offers: Views → Redeem Clicks → QR Scans
   - Time-series charts

3. **Promotion Value** (Αξία Προώθησης):
   - Split by subscription status:
     - "Επιλεγμένο" (Featured): Metrics during PAID plan
     - "Μη Επιλεγμένο" (Non-Featured): Metrics during FREE plan
   - Attribution via `business_subscription_plan_history` table
   - Exact-moment categorization (plan active at time of interaction)

4. **Guidance** (Καθοδήγηση):
   - Best times to post
   - Best days for events
   - Audience behavior patterns

**Audience Demographics** (via secure RPC `get_audience_demographics`):
- Gender distribution (male/female/unknown)
- Age buckets (18-24, 25-34, 35-44, 45-54, 55+)
- Region/city distribution
- Weighted by visit count (3 visits = 3× demographic weight)
- Data sources: ticket check-ins, offer redemptions, reservation check-ins

**View Tracking Architecture**:
| Metric | Definition | Source |
|--------|-----------|--------|
| Views | User SEES content (passive impression) | `engagement_events`, `event_views`, `discount_views` |
| Interactions | User CLICKS/ENGAGES actively | RSVPs, profile clicks, redeem clicks |
| Visits | User PHYSICALLY VISITS venue | QR check-in, ticket scan, offer redemption |

### 3.7 Boost / Promotion System

Paid advertising to increase visibility:

**Boost Tiers**:
- Standard (targeting_quality: 4)
- Premium (targeting_quality: 5)

**Boost Sources**:
- `subscription`: Deducted from monthly budget (for paid plan subscribers)
- `purchase`: One-time Stripe payment (for free plan or additional budget)

**Boost Lifecycle**:
1. Created with `status: "pending"` (Stripe) or `status: "active"` (subscription)
2. Fallback activation: `activate-pending-boost` edge function triggered on dashboard return
3. Active → can be Paused (frozen time saved) or Deactivated (pro-rata refund)
4. Expired → auto-deactivated via `expire-completed-boosts` cron

**Boost Management Dashboard**:
- Shows ONLY boosted content (not all events/offers)
- Performance metrics per boost: Impressions, Interactions, Visits
- Revenue section for paid events only
- Pause button: saves remaining time as frozen_hours/frozen_days
- Deactivate button: policy-based refund (Free=no refund, Paid=pro-rata credits)
- Metric tooltips explaining each KPI

**Boost Analytics** (`boost_analytics` table):
- Daily tracking: impressions, clicks, unique_viewers, rsvps_going, rsvps_interested

### 3.8 Business Social Feed / Posts

**Post Types** (`business_post_type` enum):
- `update`: Text/image announcements
- `event_share`: Linked event promotion
- `poll`: Interactive polls with options
- `offer_share`: Linked offer promotion

**Features**:
- Media uploads (multiple images)
- Hashtag and mention support
- Pin important posts
- Scheduled posting
- Post expiration
- View tracking per post
- Like system
- Poll voting with multiple choice option
- Visibility controls (public/followers)

### 3.9 Subscription Plans

**Four Tiers**:

| Feature | Free | Basic | Pro | Elite |
|---------|------|-------|-----|-------|
| Event creation | ✅ | ✅ | ✅ | ✅ |
| Offer creation | ✅ | ✅ | ✅ | ✅ |
| Reservations | ✅ | ✅ | ✅ | ✅ |
| Map pin size | 16px | 24px | 32px | 38px |
| Map pin style | Teardrop | Teardrop | Diamond+glow | Diamond+pulse |
| Analytics | Basic | Full | Full | Full |
| Boost budget | — | Included | Included | Included |
| Commission on offers | Standard | Reduced | Reduced | Lowest |
| Priority support | — | — | ✅ | ✅ |

**Billing**: Monthly/Annual cycles via Stripe. Plan history tracked for analytics attribution.

**Downgrade Logic**: When subscription canceled:
1. `canceled_at` set → triggers `trg_sync_downgraded_to_free_at`
2. Plan history interval closed at that timestamp
3. Analytics immediately reflect "Non-Featured" status
4. Reactivation clears `canceled_at` and resumes "Featured" attribution

### 3.10 Stripe Connect Integration

- Onboarding flow for business payouts
- Connected accounts for direct payments
- Webhook processing with idempotency (`webhook_events_processed` table)
- Automatic refund handling for disputes
- Connect login link generation
- Payout status tracking

---

## 4. ADMIN DASHBOARD (`/admin`)

### 4.1 Business Verification
- Review and approve/reject business registrations
- Verification notes and timestamps

### 4.2 User Management
- View all users and businesses
- Role management via `user_roles` table (admin/moderator/user)
- `has_role()` SECURITY DEFINER function for RLS

### 4.3 Beta Management
- Invite code generation and tracking
- Multi-use codes with expiration
- Business-linked codes

### 4.4 Analytics (Admin-Level)
- Platform-wide metrics
- Database performance monitoring (`monitor-database-performance`)
- Health checks (`health-check`)

### 4.5 Content Management
- Featured content scheduling (`featured_content` table)
- Blog post management (bilingual: EN/EL)
- App settings (key-value store)

### 4.6 Student Verification Management
- Review student verification requests
- Partner university management
- Subsidy tracking

### 4.7 Geocoding
- Batch geocoding for business addresses
- Map data management

### 4.8 Reports
- Financial reports
- Commission reports
- Subscription reports

---

## 5. TRANSACTIONAL EMAIL SYSTEM

**Provider**: Resend (resend.com)  
**Domain**: fomo.com.cy  
**From Address**: support@fomo.com.cy (unified — only verified address)

**Email Types**:
- Reservation confirmations and reminders
- Ticket purchase confirmations
- Offer claim confirmations
- Event update notifications
- Business sale notifications
- Daily/weekly sales summaries
- Student verification emails
- Payment link emails
- Event reminder crons
- Offer expiry reminders
- Follower notifications
- Personalized recommendation emails

---

## 6. NOTIFICATION SYSTEM

### 6.1 Push Notifications
- VAPID key-based web push
- Edge functions: `send-push-notification`, `get-vapid-key`, `test-push-notification`

### 6.2 Business Notifications
- New reservation alerts
- New sale alerts
- Inventory alerts (low stock)
- Operations notifications

### 6.3 Scheduled Notifications (Cron Jobs)
- `send-event-reminders-cron`: Pre-event reminders
- `send-reservation-reminders-cron`: Pre-reservation reminders
- `send-offer-reminders-cron`: Offer expiry warnings
- `send-personalized-notifications-cron`: AI-curated recommendations
- `send-weekly-summary-cron`: Business performance summaries
- `send-daily-sales-summary`: Daily revenue reports
- `send-weekly-sales-summary`: Weekly revenue reports

---

## 7. PAYMENT & FINANCIAL SYSTEM

### 7.1 Payment Flows

**Ticket Purchases**:
1. `create-ticket-checkout` → Stripe Checkout Session
2. Stripe webhook → `process-ticket-payment` → creates tickets with guest names
3. Confirmation email sent
4. Self-healing: `reconcile-payments` cron (every 15 min) catches missed webhooks

**Reservation Payments** (Prepaid/Minimum charge):
1. `create-reservation-event-checkout` → Stripe Checkout
2. Webhook → `process-reservation-event-payment` → auto-accepts reservation
3. `ensureReservationEventGuestTickets`: Recovers guest names from Stripe metadata (up to 30 days back)

**Offer Purchases**:
1. `create-offer-checkout` or `create-offer-checkout-with-reservation`
2. Webhook → `process-offer-payment`
3. Commission tracked in `commission_ledger`

**Free Tickets**: `process-free-ticket` → direct creation without Stripe

### 7.2 Commission System

- `commission_ledger` table tracks all commission-generating transactions
- Source types: ticket sales, offer redemptions, reservations
- Commission percentage varies by subscription plan
- Monthly commission calculation via `calculate-monthly-commission`
- Invoice generation

### 7.3 Credit System

- Store credit via `credit_transactions` table
- Balance tracking per business
- Credit purchase via offer system
- Bonus percentages on credit purchases

### 7.4 Financial Safety

- **Concurrency**: `pg_advisory_xact_lock` with granular locking per tier/slot/discount
- **Lock timeout**: 5 seconds to prevent deadlocks
- **Idempotency**: `webhook_events_processed` table prevents duplicate processing
- **Reconciliation**: Automated cron every 15 minutes
- **Refund handling**: Automatic ticket cancellation and capacity release on refunds/disputes
- **Circuit breakers**: Exponential backoff for network failures

---

## 8. TECHNICAL ARCHITECTURE

### 8.1 Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS with semantic design tokens (HSL-based)
- **UI Components**: shadcn/ui with custom variants
- **Animations**: Framer Motion
- **Maps**: Mapbox GL JS
- **QR Codes**: qrcode.react for generation, html5-qrcode for scanning
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router v6

### 8.2 Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL with Row-Level Security
- **Auth**: Supabase Auth with email verification (no auto-confirm)
- **Edge Functions**: Deno-based serverless functions (80+ functions)
- **Realtime**: Supabase Realtime for live updates
- **Storage**: Supabase Storage for images and media
- **Cron Jobs**: Supabase pg_cron for scheduled tasks

### 8.3 External Integrations
- **Stripe**: Payments, Connect, Webhooks, Customer Portal
- **Resend**: Transactional emails via fomo.com.cy domain
- **Mapbox**: Interactive maps with custom styling
- **Lovable AI Gateway**: AI-powered floor plan analysis (Gemini 2.5 Pro)

### 8.4 Security
- RLS policies on all tables
- `user_roles` table with `has_role()` SECURITY DEFINER function
- No client-side admin checks (always server-validated)
- Advisory locks for financial transactions
- Webhook idempotency
- CORS headers on all edge functions

### 8.5 Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (public schema mirror of auth.users) |
| `businesses` | Venue/business profiles |
| `events` | Event listings |
| `reservations` | All reservation records |
| `reservation_guests` | Individual guest QR codes for reservations |
| `tickets` | Individual event tickets with QR codes |
| `ticket_orders` | Ticket purchase orders |
| `ticket_tiers` | Ticket pricing categories |
| `discounts` | Offers and promotions |
| `offer_purchases` | Offer purchase/claim records |
| `offer_purchase_guests` | Individual guest QR for walk-in offers |
| `floor_plan_tables` | Floor plan elements (tables + fixtures) |
| `floor_plan_zones` | Floor plan zones/areas |
| `business_subscriptions` | Active subscription data |
| `subscription_plans` | Available plan definitions |
| `business_subscription_plan_history` | Plan change history for analytics |
| `event_boosts` | Event promotion campaigns |
| `boost_analytics` | Daily boost performance metrics |
| `commission_ledger` | Financial commission tracking |
| `credit_transactions` | Store credit ledger |
| `engagement_events` | All user engagement tracking |
| `event_views` | Event page view tracking |
| `discount_views` | Offer page view tracking |
| `daily_analytics` | Pre-aggregated daily metrics |
| `business_followers` | Follow relationships |
| `business_posts` | Social feed posts |
| `business_post_likes` | Post engagement |
| `conversations` / `direct_messages` | Messaging system |
| `rsvps` | Event RSVP tracking |
| `discount_scans` | QR scan logs |
| `user_roles` | Role-based access control |
| `admin_audit_log` / `audit_trail` | Admin action logging |
| `beta_invite_codes` | Beta access management |
| `blog_posts` | Bilingual blog content |
| `app_settings` | Platform configuration |
| `webhook_events_processed` | Payment webhook idempotency |

---

## 9. LOCALIZATION

- **Primary Languages**: Greek (EL) and English (EN)
- **Blog**: Bilingual content (title_el/title_en, content_el/content_en)
- **UI**: Greek-first with English toggle
- **Timezone**: Cyprus (Europe/Nicosia, UTC+2/+3)
- **Currency**: EUR (€)
- **Date Format**: European (DD/MM/YYYY)

---

## 10. CRON JOBS & AUTOMATED PROCESSES

| Job | Frequency | Function |
|-----|-----------|----------|
| Payment reconciliation | Every 15 min | `reconcile-payments` |
| Expire unpaid reservations | Every 15 min | `expire-unpaid-reservations` |
| Event reminders | Daily | `send-event-reminders-cron` |
| Reservation reminders | Daily | `send-reservation-reminders-cron` |
| Offer expiry reminders | Daily | `send-offer-reminders-cron` |
| Personalized notifications | Daily | `send-personalized-notifications-cron` |
| Daily sales summary | Daily | `send-daily-sales-summary` |
| Weekly sales summary | Weekly | `send-weekly-sales-summary` |
| Weekly performance summary | Weekly | `send-weekly-summary-cron` |
| Expire completed boosts | Hourly | `expire-completed-boosts` |
| Check expiring offers | Daily | `check-expiring-offers` |
| Monthly commission calc | Monthly | `calculate-monthly-commission` |
| Database monitoring | Periodic | `monitor-database-performance` |
| Subscription checks | Periodic | `check-subscription` |
| Stripe health check | Periodic | `stripe-healthcheck` |
| Geocode businesses | On-demand | `geocode-existing-businesses` |

---

## 11. KEY BUSINESS RULES

1. **No anonymous signups** — all users must verify email
2. **One business per user** (businesses.user_id is one-to-one)
3. **Free entry events** are excluded from reservation management dropdown
4. **Advisory locks** on all financial transactions (5s timeout)
5. **Commission-free offers** available only for subscribed businesses
6. **Student discounts** require verified student status
7. **Boost creation** only from Events/Offers sections (not from Boost Management)
8. **Paused boosts** cannot be resumed — must recreate and apply frozen time
9. **Offer redemption** tracks commission automatically in `commission_ledger`
10. **No-show detection** releases capacity after 15-minute grace period
11. **Overnight reservations** supported (e.g., 22:00 → 03:00 next day)
12. **QR check-in** is atomic: `UPDATE WHERE status = 'valid'` prevents double-scan
13. **Offline QR scanning** supported via IndexedDB fallback
14. **Webhook idempotency** via `webhook_events_processed` table
15. **Plan history** tracked at exact timestamps for analytics attribution accuracy

---

## 12. COMPETITIVE COMPARISON

| Feature | FOMO.CY | OpenTable | SevenRooms | ResDiary | Eventbrite |
|---------|---------|-----------|------------|----------|------------|
| Reservations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ticketing | ✅ | ❌ | ✅ | ❌ | ✅ |
| Floor Plans | ✅ (AI) | ❌ | ✅ | ✅ | ❌ |
| Offers/Deals | ✅ | ❌ | ✅ | ❌ | ❌ |
| Interactive Map | ✅ | ✅ | ❌ | ❌ | ❌ |
| Social Feed | ✅ | ❌ | ❌ | ❌ | ❌ |
| Boost/Ads | ✅ | ❌ | ❌ | ❌ | ✅ |
| Consumer App | ✅ | ✅ | ❌ | ❌ | ✅ |
| Student Discounts | ✅ | ❌ | ❌ | ❌ | ❌ |
| QR Check-in | ✅ | ❌ | ✅ | ❌ | ✅ |
| Hybrid Events | ✅ | ❌ | ✅ | ❌ | ❌ |
| Commission Tracking | ✅ | ❌ | ✅ | ❌ | ✅ |
| Real-time Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Direct Messaging | ✅ | ❌ | ✅ | ❌ | ❌ |
| Multi-language | ✅ (EL/EN) | ✅ | ✅ | ✅ | ✅ |

**FOMO.CY's Unique Value**: The only platform that combines consumer-facing discovery (events + offers + map) with full-stack hospitality management (reservations + floor plans + ticketing + CRM) in a single product, specifically tailored for the Cyprus market.

---

## 13. FUTURE ROADMAP (Planned)

- [ ] AI-powered table assignment suggestions based on party size and preferences
- [ ] Waitlist management with estimated wait times
- [ ] Multi-venue support for business chains
- [ ] Advanced CRM with guest profiles, visit history, and preferences
- [ ] Table-side ordering integration
- [ ] Loyalty/rewards program
- [ ] API for third-party integrations
- [ ] Native mobile app (iOS/Android)
- [ ] Multi-currency support for tourist venues
- [ ] AI chatbot for reservation assistance

---

*This document serves as the single source of truth for the FOMO.CY platform architecture, features, and business logic. Updated March 2026.*
