
# Animated Video Story for Instagram (Spotify-like Effect)

## The Problem

Currently, when you share to Instagram Stories:
1. The **in-app preview** is animated (floating/rotating) ✓
2. The **actual file shared** is a static PNG image ✗

Instagram Stories display exactly what you send — a PNG = still image, no animation.

## The Solution

Generate a **short looping video (MP4)** instead of a PNG image. This video will contain the Spotify-like animation (floating card, gradient background, subtle movement) that plays when viewed in Instagram Stories.

---

## Technical Approach

### 1. Video Generation Using Canvas + MediaRecorder

We'll use the browser's Canvas API + MediaRecorder to create a short video:

```text
┌──────────────────────────────────────┐
│  Canvas (1080x1920, 9:16)            │
│  ┌────────────────────────────────┐  │
│  │   Animated gradient background │  │
│  │                                │  │
│  │      ╭────────────────╮        │  │
│  │      │   Event Image  │ ←──────│──│── Floating + rotating
│  │      ╰────────────────╯        │  │
│  │                                │  │
│  │     Event Title                │  │
│  │     📍 Location  🗓️ Date       │  │
│  │                                │  │
│  │          ΦΟΜΟ                  │  │
│  └────────────────────────────────┘  │
│                                      │
│  → Record 3 seconds at 30fps         │
│  → Output: MP4 video file            │
└──────────────────────────────────────┘
```

### 2. Animation Elements (Spotify-like)

| Element | Animation | Duration |
|---------|-----------|----------|
| Background gradient | Slow color shift | 6s cycle |
| Card position | Float up/down ±15px | 3s cycle |
| Card rotation | Gentle sway ±3° | 4s cycle |
| Card scale | Breathing 0.98-1.02 | 5s cycle |
| Shadow | Depth variation | 3.5s cycle |

### 3. Video Duration & Loop

- **3 seconds** of video (enough for smooth loop)
- 30fps = 90 frames total
- Instagram auto-loops videos in Stories
- File size: ~1-2MB (acceptable for mobile share)

---

## Implementation Plan

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/storyVideoGenerator.ts` | Create | New video generation logic with canvas animation |
| `src/hooks/useSimpleShare.ts` | Modify | Use video generator instead of image generator for Stories |
| `src/lib/storyImageGenerator.ts` | Keep | Still used for static image download fallback |

### New: storyVideoGenerator.ts

Core functionality:
1. **Setup canvas** (1080x1920)
2. **Animation loop** that draws each frame:
   - Animated gradient background
   - Floating/rotating card with event image
   - Text overlay (title, location, date)
   - ΦΟΜΟ branding
3. **Capture frames** using MediaRecorder
4. **Output MP4** as File object for native share

### Browser Compatibility

| Browser | Video Format | Notes |
|---------|--------------|-------|
| iOS Safari | WebM → MP4 (needs conversion) | MediaRecorder outputs WebM; may need ffmpeg.wasm |
| Android Chrome | WebM or MP4 | Native support |
| Desktop | WebM | For download/testing |

**iOS Challenge**: Safari's MediaRecorder outputs WebM which Instagram may not accept. We have two options:
- **Option A**: Use WebM (works on Android, may not work on iOS Safari)
- **Option B**: Use ffmpeg.wasm to convert WebM → MP4 (adds ~1MB to bundle but ensures iOS compatibility)

I recommend **Option B** for full cross-platform support since you selected iOS, Android, and Desktop.

---

## User Flow (After Implementation)

```text
User taps "Share to Instagram Story"
          ↓
   Preview modal opens
   (shows animated preview)
          ↓
   User taps "Share"
          ↓
   [Generating video... 3-5 seconds]
          ↓
   Native share menu opens with MP4 file
          ↓
   User selects Instagram Stories
          ↓
   Instagram shows ANIMATED story! 🎉
```

---

## Dependencies Required

```json
{
  "@ffmpeg/ffmpeg": "^0.12.15",
  "@ffmpeg/util": "^0.12.1"
}
```

These enable WebM → MP4 conversion for iOS Safari compatibility.

---

## Performance Considerations

1. **Video generation time**: 3-5 seconds on modern devices
2. **Show loading indicator** during generation
3. **Cache generated videos** (5-minute TTL, same as current image cache)
4. **Fallback to PNG** if video generation fails

---

## Summary

This implementation will create a **true animated video** for Instagram Stories — the Spotify-like floating/swaying effect will appear directly in Instagram, not just in the preview. The video will work on iOS, Android, and Desktop, with proper format conversion for maximum compatibility.
