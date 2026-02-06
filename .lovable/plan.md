
## Fix Business Email Notification - Missing Await

### Problem
In `supabase/functions/process-ticket-payment/index.ts` (line 298), the business email notification fetch call is missing `await` and doesn't check the response. This causes a fire-and-forget scenario where:
1. The function doesn't wait for the response
2. Errors are silently ignored
3. The business never receives the email

### Root Cause
**Line 298** calls `fetch()` without `await` and without checking `emailResponse.ok`:

```typescript
await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-sale-notification`, {
  // ... request body
});  // ❌ Missing: proper await and response validation
```

Compare to **line 199** (user email), which correctly handles this:
```typescript
const emailResponse = await fetch(...);  // ✅ Awaited
if (!emailResponse.ok) {                 // ✅ Response checked
  const errorData = await emailResponse.text();
  logStep("User email send failed", { status: emailResponse.status, error: errorData });
}
```

### Solution
Update the business email notification call (lines 290-321) to:
1. **Add `await`** to wait for the fetch to complete
2. **Store the response** in a variable
3. **Check the response status** with `.ok`
4. **Log errors** if the request fails
5. **Match the pattern** used for user emails

### Code Change
**File**: `supabase/functions/process-ticket-payment/index.ts`

Replace lines 298-316:
```typescript
await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-sale-notification`, {
  // ... request
});
logStep("Business email notification sent");
```

With:
```typescript
const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-ticket-sale-notification`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
  },
  body: JSON.stringify({
    orderId,
    eventId: order.event_id,
    eventTitle,
    customerName: customerName || "",
    ticketCount,
    totalAmount: order.total_cents || 0,
    tierName,
    businessEmail: profile.email,
    businessName,
    businessUserId,
  }),
});

if (!emailResponse.ok) {
  const errorData = await emailResponse.text();
  logStep("Business email send failed", { status: emailResponse.status, error: errorData });
} else {
  logStep("Business email notification sent successfully");
}
```

### Result
- Business owners will now receive ticket sale confirmation emails
- Errors will be properly logged for debugging if the notification fails
- The flow matches the user email pattern (already working correctly)
- No other functionality is affected
