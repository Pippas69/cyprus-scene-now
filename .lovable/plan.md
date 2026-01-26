
# Plan: Add Push Notifications to All Email Triggers

## Overview

Every email notification in the system will also send a push notification to the user's (or business owner's) device. This requires:

1. Creating a shared Web Push encryption module
2. Updating the two helper files to use proper encryption
3. Modifying all edge functions that send emails to also call push notifications

## Architecture Approach

```text
┌─────────────────────────────────────────────────────────────────┐
│                 New Shared Module                                │
│         _shared/web-push-crypto.ts                              │
│                                                                  │
│  - ECDH key exchange                                            │
│  - HKDF key derivation                                          │
│  - AES-128-GCM encryption                                       │
│  - VAPID JWT signing                                            │
│  - sendEncryptedPush() function                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────────────┐
│notification-  │   │business-       │   │ All individual        │
│helper.ts      │   │notification-   │   │ email functions       │
│               │   │helper.ts       │   │                       │
│ Uses new      │   │ Uses new       │   │ Can call the helpers  │
│ encryption    │   │ encryption     │   │ OR sendEncryptedPush  │
└───────────────┘   └────────────────┘   └───────────────────────┘
```

## Changes Required

### Phase 1: Create Shared Encryption Module

Create a new file `supabase/functions/_shared/web-push-crypto.ts` that extracts the encryption logic from `send-push-notification/index.ts`:

- `base64UrlEncode()` / `base64UrlDecode()` - URL-safe base64
- `hkdf()` - HMAC-based Key Derivation
- `createInfo()` - Web Push info structure
- `encryptPayload()` - Full AES-128-GCM encryption
- `createVapidJwt()` - ES256 VAPID signing
- `sendEncryptedPush()` - Main export that takes userId, title, body, data

### Phase 2: Update Shared Helpers

**File: `_shared/notification-helper.ts`**
- Import `sendEncryptedPush` from web-push-crypto
- Replace the broken `sendPushNotification()` function with proper encryption

**File: `_shared/business-notification-helper.ts`**
- Import `sendEncryptedPush` from web-push-crypto  
- Replace the broken `sendPushNotification()` function with proper encryption

### Phase 3: Update Individual Edge Functions

Each function that sends an email will also send a push notification:

| Function | Push Notification Content |
|----------|--------------------------|
| `send-ticket-email` | "🎟️ Your tickets are ready for [Event]" |
| `send-reservation-notification` | "✅ Reservation confirmed at [Business]" |
| `send-offer-email` | "🎁 Your offer from [Business] is ready" |
| `send-offer-claim-email` | "✓ Offer claimed: [Offer Title]" |
| `send-event-reminders` | "⏰ [Event] starts in X hours" |
| `send-reservation-reminders` | "⏰ Reservation at [Business] in 2 hours" |
| `send-offer-expiry-reminders` | "⚠️ Your offer expires in 2 hours" |
| `send-student-verification-email` | "🎓 Complete your student verification" |
| `handle-reservation-decline-refund` | "❌ Reservation declined - refund processed" |
| `send-offer-payment-link` | "💳 Complete payment for your reservation" |
| `send-personalized-notifications` | "🎯 New content matching your interests" |
| `send-offer-claim-business-notification` | "🎁 New claim: [X] people for [Offer]" |
| `send-daily-sales-summary` | "📊 Daily report: [X] tickets - [Revenue]" |
| `send-weekly-sales-summary` | "📊 Weekly summary for [Business]" |
| `expire-unpaid-reservations` | "⏰ Payment expired - reservation cancelled" |

### Phase 4: Update Unified Notification Hub

**File: `send-push-notification/index.ts`**
- Refactor to import from `_shared/web-push-crypto.ts`
- Remove duplicate crypto code

**File: `send-user-notification/index.ts`**
- Import and use the new encrypted push function

## Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/_shared/web-push-crypto.ts` | Shared encryption module |

## Files to Modify

| File | Change Summary |
|------|---------------|
| `supabase/functions/_shared/notification-helper.ts` | Use encrypted push |
| `supabase/functions/_shared/business-notification-helper.ts` | Use encrypted push |
| `supabase/functions/send-push-notification/index.ts` | Refactor to use shared module |
| `supabase/functions/send-user-notification/index.ts` | Use encrypted push |
| `supabase/functions/send-ticket-email/index.ts` | Add push notification |
| `supabase/functions/send-reservation-notification/index.ts` | Add push notification |
| `supabase/functions/send-offer-email/index.ts` | Add push notification |
| `supabase/functions/send-offer-claim-email/index.ts` | Add push notification |
| `supabase/functions/send-event-reminders/index.ts` | Add push notification |
| `supabase/functions/send-reservation-reminders/index.ts` | Add push notification |
| `supabase/functions/send-offer-expiry-reminders/index.ts` | Add push notification |
| `supabase/functions/send-student-verification-email/index.ts` | Add push notification |
| `supabase/functions/handle-reservation-decline-refund/index.ts` | Add push notification |
| `supabase/functions/send-offer-payment-link/index.ts` | Add push notification |
| `supabase/functions/send-personalized-notifications/index.ts` | Add push notification |
| `supabase/functions/send-offer-claim-business-notification/index.ts` | Add push notification |
| `supabase/functions/send-daily-sales-summary/index.ts` | Add push notification |
| `supabase/functions/send-weekly-sales-summary/index.ts` | Add push notification |
| `supabase/functions/expire-unpaid-reservations/index.ts` | Add push notification |

## Technical Details

### Push Notification Content Strategy

Each push will have:
- **Title**: Short, action-oriented (max ~40 chars)
- **Body**: Contextual detail with emoji
- **Icon**: `/fomo-logo-new.png`
- **Data**: Deep link URL for navigation when tapped

### User Preference Respect

The system already has `user_preferences` with:
- `notification_push_enabled` - Master push toggle
- `email_notifications_enabled` - Master email toggle

Push will only be sent if the user has enabled push notifications.

### Error Handling

- If push fails, email still sends (independent operations)
- Invalid subscriptions are auto-cleaned
- All errors are logged with function name prefix

## Implementation Order

Given the scope, I recommend implementing in this order:

1. Create `web-push-crypto.ts` shared module
2. Update `notification-helper.ts` and `business-notification-helper.ts`
3. Update `send-push-notification/index.ts` to use shared module
4. Update `send-user-notification/index.ts`
5. Add push to each email function (one at a time)

Each change will be deployed immediately after creation, allowing for testing between additions.
