

# Plan: Enhanced Instagram Story Share Feature

## Overview
Enhance the existing Instagram Story share feature to match the new design specifications: **blurred background + dark overlay**, add a **preview modal** before sharing, and implement **image caching** for instant repeated shares.

---

## Current State

The app already has:
- Story image generator (`storyImageGenerator.ts`) - 1080x1920 output
- Share hook with `shareToInstagramStories()` 
- Share sheet with Instagram Stories button
- Event detail page with share functionality

**What needs changing:**
1. Background effect: Currently uses "edge extension" - needs **Gaussian blur + dark overlay**
2. No preview modal - shares directly
3. No image download option for web users
4. No caching of generated images

---

## Visual Design: New Story Layout

```text
┌────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░│  ← Blurred background
│░░ BLURRED + DARKENED ░░│    (Gaussian blur + 25-30% dark overlay)
│░░░░░░░░░░░░░░░░░░░░░░░░│
│   ┌──────────────┐     │
│   │              │     │  ← Sharp centered card
│   │    EVENT     │     │    (rounded corners, shadow)
│   │    IMAGE     │     │
│   │              │     │
│   └──────────────┘     │
│                        │
│     Event Name         │  ← Text (bold, center-aligned)
│     Sat 21:00          │  ← Time (smaller)
│       ΦΟΜΟ             │  ← Branding (stylized)
│                        │
└────────────────────────┘
        1080x1920
```

---

## Technical Changes

### 1. Update Story Image Generator

**File: `src/lib/storyImageGenerator.ts`**

Replace the "edge extension" background with a proper blur effect:

- **Step 1**: Draw the source image scaled to cover the entire 1080x1920 canvas (may crop edges for aspect ratio fill)
- **Step 2**: Apply CSS `filter: blur(30px)` to the background
- **Step 3**: Add dark overlay (25-30% opacity black rectangle)
- **Step 4**: Keep the centered sharp card with rounded corners and shadow
- **Step 5**: Keep text overlays and branding

**Blur technique:**
Since HTML Canvas doesn't have native Gaussian blur, we'll use a two-pass approach:
1. Draw background image at full size (cover mode)
2. Apply `ctx.filter = 'blur(30px)'` before drawing
3. Draw dark semi-transparent overlay on top

### 2. Add Story Preview Modal

**New file: `src/components/sharing/StoryPreviewModal.tsx`**

A modal that:
- Shows the generated Story image as a preview
- Displays two action buttons:
  - **"Share to Instagram"** (mobile only) - triggers native share
  - **"Download Image"** (always available) - saves PNG to device
- Loading state while image generates
- Clear instruction text for web users

### 3. Update Share Hook

**File: `src/hooks/useSimpleShare.ts`**

Add new functions:
- `generateStoryPreview()` - generates image and returns blob URL for preview
- Keep existing `shareToInstagramStories()` for actual sharing

### 4. Add Image Caching

**File: `src/lib/storyImageCache.ts`** (new)

Simple in-memory cache:
- Key: `${objectType}-${objectId}`
- Value: Generated File object
- Expiry: 5 minutes (or until page reload)
- Benefits: Instant re-share without regenerating

### 5. Update Share Sheet Integration

**File: `src/components/sharing/SimpleShareSheet.tsx`**

When Instagram Stories button is tapped:
1. Generate image (or retrieve from cache)
2. Open preview modal
3. User chooses to share or download

---

## Implementation Details

### Background Blur Implementation

```text
Canvas drawing order:
1. ctx.filter = 'blur(30px)'
2. Draw source image (cover mode - fills canvas)
3. ctx.filter = 'none'
4. Draw dark overlay: fillRect with rgba(0, 0, 0, 0.28)
5. Draw gradient fades at top/bottom
6. Draw centered sharp image card
7. Draw text overlays
8. Draw ΦΟΜΟ branding
```

### Preview Modal UX

```text
┌─────────────────────────────────┐
│              ✕                  │  ← Close button
│                                 │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │   [Story Preview]     │     │  ← Generated image
│   │    (scaled to fit)    │     │
│   │                       │     │
│   └───────────────────────┘     │
│                                 │
│   [📱 Share to Instagram]       │  ← Primary (mobile only)
│   [⬇️ Download Image]           │  ← Secondary (always)
│                                 │
│   "Open Instagram and share     │  ← Web instruction text
│    to your Story"               │
│                                 │
└─────────────────────────────────┘
```

### Cache Structure

```text
storyImageCache = Map<string, {
  file: File,
  blobUrl: string,
  timestamp: number
}>

// Key format: "event-{eventId}" or "offer-{offerId}"
// Auto-cleanup: entries older than 5 minutes
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/storyImageGenerator.ts` | Modify | Replace edge extension with blur + dark overlay |
| `src/lib/storyImageCache.ts` | Create | In-memory cache for generated images |
| `src/components/sharing/StoryPreviewModal.tsx` | Create | Preview modal with share/download options |
| `src/hooks/useSimpleShare.ts` | Modify | Add preview generation, integrate cache |
| `src/components/sharing/SimpleShareSheet.tsx` | Modify | Open preview modal instead of direct share |

---

## Acceptance Criteria

- Generated image is exactly 1080x1920 PNG
- Background is blurred event image with dark overlay
- Sharp centered card with rounded corners and shadow
- Text includes: event name (bold, max 2 lines), time, and "ΦΟΜΟ"
- Preview modal shows image before sharing
- Mobile: "Share to Instagram" triggers native share sheet
- Web: "Download Image" saves file locally
- Cached images provide instant preview on repeated shares

