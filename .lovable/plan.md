
# Plan: Replace Blurry Background with Clear Fade Background

## The Problem
The current Story image generator uses heavy blur effects (scale to 10% + 20px blur filter) which makes the background image unrecognizable and visually poor quality.

## The Solution
Replace the blur approach with a **clear, sharp background image** that uses smooth gradient overlays (fades) to create visual separation without losing image clarity.

---

## Visual Comparison

**Before (Current - Blurry)**
```text
┌────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Very blurry, unrecognizable
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  ┌──────────────┐  │
│  │   Main Image │  │
│  └──────────────┘  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└────────────────────┘
```

**After (New - Clear with Fade)**
```text
┌────────────────────┐
│ ░░░░░░░░░░░░░░░░░░ │  ← Clear image with dark gradient overlay
│ ░░░ fade ░░░░░░░░░ │     at top and bottom for readability
│  ┌──────────────┐  │
│  │   Main Image │  │  ← Sharp foreground image
│  └──────────────┘  │
│ ░░░░░░░░ fade ░░░░ │
│ ░░░░░░░░░░░░░░░░░░ │
└────────────────────┘
```

---

## Technical Changes

### File: `src/lib/storyImageGenerator.ts`

**Replace `drawBlurredBackground` function with `drawClearBackground`:**

1. **Draw the image at full resolution** (no scaling down)
2. **Cover the entire canvas** while maintaining aspect ratio
3. **Apply smooth gradient overlays:**
   - Top gradient: Fade from semi-transparent dark to transparent
   - Bottom gradient: Fade from transparent to semi-transparent dark
4. **Optional slight darkening** (brightness 0.85-0.9) to make foreground pop

**New implementation approach:**

```text
Background Layer:
├── Full-resolution image (cover mode)
├── Overall slight darkening (brightness 0.85)
├── Top gradient overlay (dark → transparent)
└── Bottom gradient overlay (transparent → dark)
```

---

## Implementation Details

### Remove blur, keep image sharp:
- Remove the `scale = 0.1` downscaling
- Remove the `blur(20px)` filter
- Draw image directly at canvas resolution

### Add gradient fade overlays:
- **Top fade**: Dark gradient from top (for potential status bar area)
- **Center**: Clear/transparent to show the background image
- **Bottom fade**: Dark gradient toward bottom for text readability

### Keep slight darkening:
- Apply `brightness(0.85)` to slightly darken the background
- This ensures the centered foreground image stands out

---

## Expected Result

The background will show the **full, clear image** with elegant dark gradient fades at the top and bottom edges. The centered foreground image will pop against the slightly darkened but sharp background, creating a premium, Instagram-ready look.
