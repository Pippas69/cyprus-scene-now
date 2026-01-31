
# Plan: Fix Instagram Story Animation on Mobile Devices

## Problem Diagnosis

After analyzing the codebase and the screenshot you provided, I identified the **root cause**:

**FFmpeg WASM requires `SharedArrayBuffer`** which is only available when the site has **Cross-Origin Isolation headers** configured. These headers are:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)

Without these headers, `SharedArrayBuffer` is undefined, and FFmpeg WASM cannot function. That's why you see "Animation not supported on this device. Will share as image."

---

## Solution Options

### Option A: Enable Cross-Origin Isolation Headers (Recommended for FFmpeg)

Add the required headers in Vite config for development, and configure the production server to send these headers.

**Pros:**
- FFmpeg WASM will work properly
- Video generation will be available on iOS Safari and all modern browsers

**Cons:**
- May cause issues with third-party resources (images, iframes) that are not CORS-configured
- Requires server configuration for production

### Option B: Alternative Animation Approach - Animated GIF (More Compatible)

Instead of relying on FFmpeg WASM, use a pure JavaScript GIF encoder (like `gif.js` or custom canvas-based encoding) that doesn't require `SharedArrayBuffer`.

**Pros:**
- Works on ALL devices including iOS Safari in-app browsers
- No cross-origin isolation requirements
- Instagram supports GIF in Stories

**Cons:**
- GIF has lower quality than MP4
- Larger file sizes for same quality
- Limited to 256 colors per frame

### Option C: Use FFmpeg Single-Threaded Mode (Workaround)

FFmpeg WASM can run in single-threaded mode without SharedArrayBuffer, though slower.

**Pros:**
- Keeps MP4 output
- Works without header changes

**Cons:**
- Significantly slower on mobile devices
- May timeout on older devices

---

## Recommended Solution: Option A + C Hybrid

1. **Add Cross-Origin Isolation headers** for browsers that support it
2. **Use single-threaded FFmpeg as fallback** for browsers where headers don't work
3. **Keep static image as final fallback** for very old browsers

---

## Implementation Plan

### Step 1: Update Vite Configuration for Development

Add headers to `vite.config.ts`:

```text
server: {
  host: "::",
  port: 8080,
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  },
}
```

### Step 2: Update `isVideoGenerationSupported()` Function

Improve detection to check for actual SharedArrayBuffer availability:

```text
- Check if crossOriginIsolated === true
- Check if SharedArrayBuffer is available
- Log detailed diagnostics for debugging
```

### Step 3: Add Single-Threaded FFmpeg Fallback

Modify `loadFFmpeg()` to try single-threaded mode when multi-threaded fails:

```text
- First try: Multi-threaded FFmpeg with SharedArrayBuffer
- Second try: Single-threaded FFmpeg without SharedArrayBuffer
- Final fallback: Static image
```

### Step 4: Production Headers (Supabase Edge Function or Service Worker)

For production, we have two options:
- **Option A**: Create an edge function proxy that adds the required headers
- **Option B**: Use a Service Worker to inject headers (more complex but works without server changes)

---

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Add COOP/COEP headers for development |
| `src/lib/storyVideoGenerator.ts` | Improve detection logic, add single-threaded fallback |
| `src/hooks/useSimpleShare.ts` | Better error messaging and diagnostics |

---

## Technical Notes

### Why FFmpeg WASM Needs SharedArrayBuffer

FFmpeg uses WebAssembly threads (multi-threading) for performance. These threads require shared memory (`SharedArrayBuffer`) to communicate. Without it, FFmpeg cannot spawn worker threads.

### Cross-Origin Isolation on iOS Safari

iOS Safari 15+ supports `SharedArrayBuffer` ONLY when:
1. The page is served with COOP/COEP headers
2. The page is NOT inside a webview or in-app browser
3. The device is not in a restrictive corporate MDM profile

This means even with correct headers, some users may still fall back to static images - but this should cover ~80% of iOS users.

---

## Expected Outcome

After this fix:
- **Most iOS Safari users** will get animated video Stories
- **All Android Chrome users** will get animated video Stories  
- **In-app browsers** will gracefully fallback to static image with clear messaging
- **Better debugging** through detailed console logs
