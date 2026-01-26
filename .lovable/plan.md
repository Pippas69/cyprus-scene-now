
# Plan: Add Push Notification Toggle & Test Button

## Overview
Add a Push Notifications toggle in User Settings so you can enable notifications on your device, plus a "Send Test" button to verify they work.

## Changes

### 1. Update UserSettings.tsx
**Location**: Notifications card (after the mandatory section, before "Suggestions for You")

**Add**:
- Import `usePushNotifications` hook and `Smartphone` icon
- Push Notifications toggle with:
  - Label: "Push Notifications" / "Push Ειδοποιήσεις"
  - Description: "Receive instant notifications on your device"
  - Toggle using `subscribe()` / `unsubscribe()` from the hook
- "Test" button (visible when enabled) that calls the test edge function
- Permission state indicator (if denied, show helper text)

### 2. Create Test Edge Function
**File**: `supabase/functions/test-push-notification/index.ts`

Simple authenticated function that:
1. Validates user JWT
2. Calls existing `send-push-notification` function with test payload:
   - Title: "🔔 Test Notification"
   - Body: "Push notifications are working! / Οι push ειδοποιήσεις λειτουργούν!"

### 3. Update config.toml
Add the new function with `verify_jwt = false` (validate in code)

## Testing Flow
1. Go to Settings → Notifications
2. Enable "Push Notifications" toggle → browser asks for permission → Allow
3. Click "Test" button
4. ✅ You should receive a push notification on your device

## Files to Modify/Create
| File | Action |
|------|--------|
| `src/components/user/UserSettings.tsx` | Add push toggle + test button |
| `supabase/functions/test-push-notification/index.ts` | Create |
| `supabase/config.toml` | Add function config |
