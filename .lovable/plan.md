

# Plan: Fix Push Notifications for iOS Safari/PWA

## Problem Identified
The Edge Function is failing with **"Failed to decode base64"** when processing VAPID keys, and more critically, **Apple's push service requires encrypted payloads** using the Web Push encryption standard.

## Root Causes

1. **VAPID Key Decoding**: The Edge Function's `base64UrlDecode` doesn't clean the keys (trim, remove quotes) like the client-side fix
2. **Missing Encryption**: iOS/Apple Push requires proper Web Push encryption using:
   - The subscription's `p256dh_key` (ECDH public key)
   - The subscription's `auth_key` (shared authentication secret)
   - ECDH key exchange + HKDF + AES-GCM encryption

## Solution

### Option A: Use web-push Library (Recommended)
Use a proper Web Push library that handles all the encryption complexity:

**File**: `supabase/functions/send-push-notification/index.ts`

```typescript
import webpush from "npm:web-push@3.6.7";

// Configure VAPID
webpush.setVapidDetails(
  'mailto:notifications@fomo.cy',
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

// For each subscription, send with proper encryption
await webpush.sendNotification(
  {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh_key,
      auth: sub.auth_key,
    }
  },
  JSON.stringify(payload)
);
```

### Option B: Manual Encryption (Complex)
Implement Web Push encryption manually using:
- ECDH for key agreement
- HKDF for key derivation  
- AES-128-GCM for payload encryption
- Add Content-Encoding: aes128gcm header

This is ~200 lines of complex crypto code and error-prone.

## Recommended Approach: Option A

Rewrite the Edge Function to use the `web-push` npm package which handles:
- VAPID JWT signing
- Payload encryption (ECDH + AES-GCM)
- Proper headers (Content-Encoding, Crypto-Key, etc.)
- All push service compatibility (Apple, Google, Mozilla)

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Replace manual implementation with web-push library |

## Technical Details

The web-push library will:
1. Generate ephemeral ECDH key pair
2. Derive shared secret with subscription's p256dh key
3. Use HKDF to derive encryption key and nonce
4. Encrypt payload with AES-128-GCM
5. Add required headers (Content-Encoding: aes128gcm, etc.)
6. Sign request with VAPID JWT

## After Fix
1. Redeploy Edge Function
2. Go to Settings on your PWA
3. Click Test button
4. You should receive the push notification on your iOS device

