
# Plan: Fix Background Zoom/Cropping Issue

## The Problem
The background currently uses "cover" mode which forces the image to fill the entire 9:16 canvas. For horizontal images (16:9), this means:
- The image gets massively scaled up vertically
- Significant portions are cropped off the sides
- The result looks overly zoomed and loses important parts of the image

## The Solution
Switch from "cover" to **"contain"** mode for the background, then fill the remaining space with a solid color or extended edge colors.

---

## Visual Comparison

**Current (Cover Mode - Too Zoomed)**
```text
┌────────────────────┐
│      CROPPED       │  ← Left/right parts cut off
│   ╔════════════╗   │
│   ║            ║   │  ← Original image stretched
│   ║   IMAGE    ║   │     to fill height
│   ║            ║   │
│   ╚════════════╝   │
│      CROPPED       │
└────────────────────┘
```

**New (Contain Mode - Full Image Visible)**
```text
┌────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Dark fill or edge-extended
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ┌────────────────┐ │
│ │                │ │  ← Full image visible
│ │     IMAGE      │ │     (aspect ratio preserved)
│ │                │ │
│ └────────────────┘ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└────────────────────┘
```

---

## Technical Changes

### File: `src/lib/storyImageGenerator.ts`

**Update `drawClearBackground` function:**

1. **Fill canvas with dark base color first** (e.g., `#1a1a1a` or sampled from image edges)
2. **Calculate "contain" dimensions** instead of "cover":
   - Fit the entire image within the canvas
   - Maintain aspect ratio without cropping
3. **Center the contained image** on the canvas
4. **Keep the gradient overlays** for smooth transitions

**Logic change:**
```text
Before (Cover):
- Scale image to fill canvas height
- Crop sides that overflow

After (Contain):
- Scale image to fit within canvas width
- Center vertically with dark fill above/below
```

### Updated Dimension Calculation

Current logic scales to fill, new logic will scale to fit:
- For a 16:9 horizontal image on a 9:16 canvas:
  - **Cover**: Scales to canvas height (1920px) → width becomes ~3413px → crops ~1166px per side
  - **Contain**: Scales to canvas width (1080px) → height becomes ~607px → leaves ~656px above and below

The empty space above/below will be filled with a dark color that blends with the gradient overlays, creating a cohesive premium look.

---

## Expected Result

The background will show the **complete image without cropping**, centered on the canvas with dark fill areas above and below that blend seamlessly with the gradient overlays. The foreground image will still overlay on top as before.
