
# Plan: Fix Instagram Story Animation Not Appearing

## Problem Analysis

The Instagram Story share system has a video generation pipeline that should produce an animated MP4 with a "Spotify-like floating" effect. The animation appears in the **preview modal** (via framer-motion) but does **NOT** appear in the actual shared file to Instagram.

### Root Cause Investigation

After analyzing the codebase, I identified several potential issues:

1. **FFmpeg WASM Loading Failure**: The video generator relies on FFmpeg WASM which may fail to load on certain devices/browsers, causing a silent fallback to static PNG
2. **Frame Validation Logic**: There's frame validation code that checks if frames are different, but if this fails, it throws an error and falls back to image
3. **iOS Safari Limitations**: WebAssembly and FFmpeg have known limitations on iOS Safari
4. **Video Not Recognized**: The generated video file might not be recognized as animated by Instagram

---

## Technical Solution

### Phase 1: Add Robust Logging & Error Visibility

**File: `src/lib/storyVideoGenerator.ts`**
- Add detailed console logging at each step of video generation
- Surface errors to the user instead of silent fallbacks
- Track success/failure metrics

### Phase 2: Improve Video Generation Fallback Visibility

**File: `src/hooks/useSimpleShare.ts`**
- When video generation fails, show a toast notification explaining the fallback
- Track whether the final shared file is video or image
- Add a flag in the preview modal to indicate if animation is preserved

### Phase 3: Fix the Animation Encoding

**File: `src/lib/storyVideoGenerator.ts`**
- Ensure the `renderFrame()` function actually produces different output per frame
- Increase animation amplitude for more noticeable movement
- Verify that the canvas context is not being reused incorrectly

### Phase 4: Add GIF Fallback for Wider Compatibility

Since FFmpeg WASM may fail on mobile Safari, I will:
- Create a fallback mechanism that generates an animated GIF instead of MP4
- Use canvas-based GIF encoding (no external dependencies)
- This provides animation support even when video encoding fails

---

## Implementation Details

### 1. Enhanced Error Tracking in Video Generator
```text
Add try/catch with detailed error messages at:
- FFmpeg loading
- Frame generation  
- Video encoding
- File output

Show user-friendly toast when falling back to static image
```

### 2. Preview Modal Indicator
```text
Add visual indicator showing:
- "Video" badge when animation is preserved
- "Image" badge when fallback to static
```

### 3. Fix Frame Generation Timing
```text
Current issue: Animation values are calculated correctly,
but the canvas may not be clearing properly between frames.

Fix:
- Explicitly clear canvas before each frame
- Verify ctx state is not carried over
- Add debugging canvas output for first/middle/last frames
```

### 4. Improve FFmpeg Compatibility
```text
- Use more compatible FFmpeg parameters
- Test with lower resolution for faster processing
- Add timeout handling for slow devices
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/storyVideoGenerator.ts` | Add logging, fix frame clearing, improve error handling |
| `src/hooks/useSimpleShare.ts` | Add fallback notifications, track media type |
| `src/components/sharing/StoryPreviewModal.tsx` | Add video/image indicator badge |
| `src/components/sharing/SimpleShareSheet.tsx` | Pass media type info to preview |

---

## Testing Plan

1. Test on iOS Safari (most problematic browser)
2. Test on Android Chrome
3. Test on Desktop (for download functionality)
4. Verify the shared file contains animation when opened independently
5. Verify fallback to static image works gracefully with notification

---

## Expected Outcome

After this fix:
- Users will see clear feedback when animation generation fails
- Animation will work more reliably across browsers
- When animation fails, users understand they're sharing a static image
- Downloaded files will clearly indicate if they're animated or static
