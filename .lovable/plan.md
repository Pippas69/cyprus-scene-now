
# Comprehensive Push Notification System Implementation

## Overview

This plan implements a complete notification system for FOMO covering both **Users** and **Business Owners** across all critical touchpoints. Based on the audit, some notifications already exist but are missing push/email, and several key notification types need to be created from scratch.

---

## Current State Summary

### What Already Works (Push + Email + In-App)

| Notification Type | User | Business |
|-------------------|------|----------|
| Reservation confirmed/declined | ✅ | ✅ |
| Reservation cancelled | ✅ | ✅ |
| Ticket purchase | ✅ | ✅ |
| Offer claimed (free) | ✅ | ✅ |
| Offer purchased (paid) | ✅ | N/A |
| Offer expiry (2h before) | ✅ | N/A |
| Event reminder (1d/2h) | ✅ | N/A |
| Reservation reminder (2h) | ✅ | N/A |
| Daily/Weekly sales summary | N/A | ✅ |
| Low inventory/Sold out | N/A | ✅ |
| Personalized suggestions | ✅ | N/A |

### What's Missing (Needs Implementation)

| Notification Type | For | Priority |
|-------------------|-----|----------|
| Followed business posts new event | User | HIGH |
| Followed business posts new offer | User | HIGH |
| Followed business's offer about to end | User | HIGH |
| Followed business's event tickets almost sold out | User | MEDIUM |
| Plan-based promotional notifications | User | LOW |
| Payment failed | User | HIGH |
| Refund issued | User | HIGH |
| Event cancelled/rescheduled | User | HIGH |
| QR check-in confirmation (ticket/reservation/offer) | User | MEDIUM |

---

## Implementation Plan

### Phase 1: New Edge Function - Follower Notifications

Create `supabase/functions/send-follower-notifications/index.ts` - runs on a cron schedule to notify followers when businesses they follow:
1. Post a new event
2. Post a new offer
3. Have an offer about to expire (24h before)
4. Have event tickets almost sold out (≤5 remaining)

```text
Architecture Flow:

┌─────────────────────────────────────────────────────────────────┐
│                    CRON SCHEDULER (every 30 min)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│             send-follower-notifications Edge Function           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Query business_followers table                               │
│ 2. For each followed business, check:                           │
│    a. New events created in last 2 hours                        │
│    b. New offers created in last 2 hours                        │
│    c. Offers ending within 24 hours                             │
│    d. Events with tickets ≤ 5 remaining                         │
│ 3. Check notification_log to prevent duplicates                 │
│ 4. Send push + in-app to each follower                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   In-App     │  │    Push      │  │    Email     │
│ Notification │  │ Notification │  │   (Daily     │
│              │  │              │  │   Digest)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Database Queries Required:**
- `business_followers` - get user→business follow relationships
- `events` + `discounts` - check for new content created in last 2h
- `events` with `ticket_tiers` - check remaining tickets
- `notification_log` - idempotency check

**User Preferences Respected:**
- `notification_new_events` - for followed business events
- `notification_business_updates` - for followed business offers
- `notification_expiring_offers` - for expiring offer alerts
- `notification_push_enabled` - master push toggle

---

### Phase 2: Fix Missing Push in Payment Flow Functions

#### 2.1 Fix `process-free-ticket/index.ts`
Add `userId: order.user_id` when calling `send-ticket-email`

#### 2.2 Fix `process-offer-payment/index.ts`
Add `userId: user.id` when calling `send-offer-email`

#### 2.3 Fix `process-ticket-payment/index.ts`
Add `userId: order.user_id` when calling `send-ticket-email`

---

### Phase 3: QR Validation User Confirmations

Update `validate-qr/index.ts` to send push notifications to users when:
1. **Offer Redeemed** - "Η προσφορά σου εξαργυρώθηκε επιτυχώς!"
2. **Ticket Checked-in** - "Καλωσήρθες στο [Event]!"
3. **Reservation Checked-in** - "Check-in επιτυχές!"

---

### Phase 4: Event Cancellation/Rescheduling Notifications

Create `supabase/functions/send-event-update-notification/index.ts`

Called when a business cancels or reschedules an event. Notifies:
- All ticket holders
- All RSVP users (going + interested)
- All reservation holders

**Trigger:** Called from frontend when business updates event status

---

### Phase 5: Refund Notification

Update `handle-reservation-decline-refund/index.ts` to include user push notification (already sends email).

---

### Phase 6: Plan-Based Promotional Notifications (Low Priority)

Create frequency-limited promotional notifications based on business plan tier:
- **Elite:** Can trigger up to 2 notifications/week to users who interacted
- **Pro:** Up to 1 notification/week
- **Basic:** Up to 1 notification/month
- **Free:** No promotional notifications

This requires a new preference column `notification_promotional` and a tracking table.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-follower-notifications/index.ts` | Notify followers of new content |
| `supabase/functions/send-event-update-notification/index.ts` | Event cancelled/rescheduled |

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/process-free-ticket/index.ts` | Add `userId` to payload |
| `supabase/functions/process-offer-payment/index.ts` | Add `userId` to payload |
| `supabase/functions/process-ticket-payment/index.ts` | Add `userId` to payload |
| `supabase/functions/validate-qr/index.ts` | Add user push for redemptions/check-ins |
| `supabase/functions/handle-reservation-decline-refund/index.ts` | Add user push for refunds |
| `supabase/functions/check-expiring-offers/index.ts` | Add push notifications (currently only in-app) |

### Database Changes

Add columns to `user_preferences`:
```sql
-- New preference for followed business notifications
notification_followed_business_events BOOLEAN DEFAULT true,
notification_followed_business_offers BOOLEAN DEFAULT true,
notification_tickets_selling_out BOOLEAN DEFAULT true
```

### Cron Jobs to Add

```sql
-- Follower notifications (every 30 minutes)
SELECT cron.schedule(
  'send-follower-notifications',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/send-follower-notifications',
    headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb
  );
  $$
);
```

---

## Complete Notification Matrix (After Implementation)

### User Notifications

| Trigger | In-App | Push | Email |
|---------|--------|------|-------|
| Reservation confirmed | ✅ | ✅ | ✅ |
| Reservation declined | ✅ | ✅ | ✅ |
| Reservation cancelled | ✅ | ✅ | ✅ |
| Reservation reminder (2h) | ✅ | ✅ | ✅ |
| Ticket purchased | ✅ | ✅ | ✅ |
| Ticket check-in | ✅ | ✅ | ❌ |
| Event reminder (1d/2h) | ✅ | ✅ | ✅ |
| Event cancelled | ✅ | ✅ | ✅ |
| Event rescheduled | ✅ | ✅ | ✅ |
| Offer claimed | ✅ | ✅ | ✅ |
| Offer purchased | ✅ | ✅ | ✅ |
| Offer redeemed | ✅ | ✅ | ❌ |
| Offer expiring (2h) | ✅ | ✅ | ✅ |
| Refund issued | ✅ | ✅ | ✅ |
| Followed business new event | ✅ | ✅ | Digest |
| Followed business new offer | ✅ | ✅ | Digest |
| Followed offer ending soon | ✅ | ✅ | ❌ |
| Tickets almost sold out | ✅ | ✅ | ❌ |
| Personalized suggestions | ✅ | ✅ | Daily |

### Business Notifications

| Trigger | In-App | Push | Email |
|---------|--------|------|-------|
| New reservation | ✅ | ✅ | ✅ |
| Reservation cancelled | ✅ | ✅ | ✅ |
| Ticket sold | ✅ | ✅ | ✅ |
| Offer claimed | ✅ | ✅ | ✅ |
| Offer redeemed | ✅ | ✅ | ✅ |
| Low inventory (≤2) | ✅ | ✅ | ✅ |
| Sold out | ✅ | ✅ | ✅ |
| Daily sales summary | ✅ | ✅ | ✅ |
| Weekly sales summary | ✅ | ✅ | ✅ |
| New follower | ✅ | ✅ | ❌ |

---

## Implementation Order

1. **Immediate** (Phase 2 & 3): Fix `userId` passing and add QR confirmation pushes
2. **High Priority** (Phase 1): Create follower notifications edge function
3. **Medium Priority** (Phase 4 & 5): Event cancellation and refund notifications
4. **Low Priority** (Phase 6): Plan-based promotional system

---

## Success Metrics

After implementation:
- All transactional actions trigger appropriate push notifications
- Users receive timely alerts about businesses they follow
- No duplicate notifications (idempotency keys)
- User preferences are always respected
- Business owners receive all necessary operational alerts
