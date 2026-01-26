
# Plan: Fix VAPID Key Decoding Error

## Problem
The error "The string contains invalid characters" occurs when enabling push notifications because the VAPID public key fails to decode properly in the `urlBase64ToUint8Array` function.

## Root Cause
The `window.atob()` function at line 30 of `usePushNotifications.ts` throws this error when the base64 string contains invalid characters. This usually means the `VAPID_PUBLIC_KEY` secret has formatting issues (extra whitespace, quotes, or line breaks).

## Solution

### 1. Add Robust Key Cleaning
Update `usePushNotifications.ts` to clean the VAPID key before decoding:

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Clean the key: remove whitespace, quotes, and normalize
  const cleanedKey = base64String
    .trim()
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes
    .replace(/\s/g, '');          // Remove any whitespace
  
  const padding = '='.repeat((4 - (cleanedKey.length % 4)) % 4);
  const base64 = (cleanedKey + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  // ... rest of function
}
```

### 2. Add Better Error Logging
Log the key format for debugging without exposing the full key:

```typescript
console.log('[Push] VAPID key length:', vapidKey?.length);
console.log('[Push] VAPID key starts with:', vapidKey?.substring(0, 10) + '...');
```

### 3. Add Try-Catch Around Decoding
Wrap the decode in try-catch with a helpful error message:

```typescript
try {
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
} catch (decodeError) {
  console.error('[Push] Failed to decode VAPID key:', decodeError);
  throw new Error('Invalid VAPID key format. Please check the server configuration.');
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePushNotifications.ts` | Add key cleaning, better error handling, and logging |

## Alternative Fix (If Code Fix Doesn't Work)
If the code fix doesn't resolve the issue, the VAPID_PUBLIC_KEY secret may need to be re-entered. Valid VAPID public keys:
- Are ~87 characters long
- Use URL-safe base64 (`-` and `_` instead of `+` and `/`)
- Have no whitespace or quotes

## Testing
1. Deploy the fix
2. Go to Settings → Notifications on your PWA
3. Enable Push Notifications toggle
4. Should successfully subscribe without the "invalid characters" error
