
# Fix: Missing userId/businessUserId in Multiple Edge Functions

## Problem Summary

After auditing all edge functions that trigger notifications, I found **3 functions** with missing user IDs that prevent push notifications from being sent:

| Function | Issue | Impact |
|----------|-------|--------|
| `process-ticket-payment/index.ts` | Missing `userId` when calling `send-ticket-email` | User doesn't receive push for ticket purchase |
| `process-ticket-payment/index.ts` | Missing `businessUserId` when calling `send-ticket-sale-notification` | Business owner doesn't receive push for ticket sale |
| `process-ticket-payment/index.ts` | Uses legacy manual push call instead of shared helper | Redundant code, potential encryption issues |
| `send-ticket-sale-notification/index.ts` | No push notification support at all | Business never gets push for ticket sales |
| `process-offer-payment/index.ts` | Missing `userId` when calling `send-offer-email` | User doesn't receive push for offer purchase |

## Solution

### File 1: `supabase/functions/process-ticket-payment/index.ts`

**Changes:**
1. Add `userId: order.user_id` to the payload when calling `send-ticket-email` (line 163-174)
2. Add `eventId: order.event_id` to the payload for deep linking
3. Add `businessUserId` to the payload when calling `send-ticket-sale-notification` (line 237-248)
4. Remove the legacy manual push notification call (lines 256-282) since `send-ticket-sale-notification` will handle it

### File 2: `supabase/functions/send-ticket-sale-notification/index.ts`

**Changes:**
1. Add `businessUserId?: string` to the `TicketSaleNotificationRequest` interface
2. Import `sendPushIfEnabled` from the shared crypto module
3. Add Supabase client initialization
4. Add push notification call after sending the email

### File 3: `supabase/functions/process-offer-payment/index.ts`

**Changes:**
1. Add `userId: user.id` to the payload when calling `send-offer-email` (line 194-218)

## Code Changes

### process-ticket-payment/index.ts

**Add userId and eventId to send-ticket-email call (around line 163):**
```typescript
body: JSON.stringify({
  orderId,
  userId: order.user_id,  // ADD THIS
  eventId: order.event_id,  // ADD THIS
  userEmail: orderDetails.customer_email,
  eventTitle,
  // ... rest of payload
}),
```

**Add businessUserId to send-ticket-sale-notification call (around line 237):**
```typescript
body: JSON.stringify({
  orderId,
  eventId: order.event_id,
  eventTitle: eventData.title,
  customerName: orderDetails?.customer_name || "",
  ticketCount: ticketsToCreate.length,
  totalAmount: order.total_cents || 0,
  tierName: tierData?.name || "General",
  businessEmail: profile.email,
  businessName,
  businessUserId,  // ADD THIS
}),
```

**Remove legacy push call (lines 255-282):**
Remove the entire block starting with `// Send push notification if enabled` since the notification function will handle this.

### send-ticket-sale-notification/index.ts

**Add push notification support:**
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPushIfEnabled } from "../_shared/web-push-crypto.ts";

interface TicketSaleNotificationRequest {
  // ... existing fields
  businessUserId?: string;  // ADD THIS
}

// Inside Deno.serve, after email send:
if (businessUserId) {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  
  const pushResult = await sendPushIfEnabled(businessUserId, {
    title: '🎟️ Νέα Πώληση Εισιτηρίων!',
    body: `${customerName || 'Κάποιος'} αγόρασε ${ticketCount} εισιτήρι${ticketCount > 1 ? 'α' : 'ο'} για ${eventTitle}`,
    tag: `ticket-sale-${orderId}`,
    data: {
      url: '/dashboard-business/ticket-sales',
      type: 'ticket_sale',
      orderId,
      eventId,
    },
  }, supabaseClient);
  logStep("Push notification sent", pushResult);
}
```

### process-offer-payment/index.ts

**Add userId to send-offer-email call (around line 194):**
```typescript
const emailPayload = {
  purchaseId: purchase.id,
  userId: user.id,  // ADD THIS
  userEmail: user.email,
  // ... rest of payload
};
```

## Expected Results

After these fixes:
- Users will receive push notifications when they purchase tickets
- Business owners will receive push notifications when tickets are sold
- Users will receive push notifications when they purchase offers
- Redundant legacy push code is removed for cleaner maintenance
