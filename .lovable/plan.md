

# Plan: Background with Extended Edges + Centered Card + Medium Fade

## The Goal
Create a Story where:
- The **background** fills the entire 9:16 canvas by extending the image edges (no cropping, no blur)
- A **centered card** with rounded corners shows the crisp main image
- **Medium fading** at top and bottom for text readability

---

## Visual Layout

```text
┌────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Extended top edge pixels
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   + medium dark fade
│ ┌──────────────────┐   │
│ │                  │   │
│ │   MAIN IMAGE     │   │ ← Sharp card with
│ │    (card)        │   │   rounded corners
│ │                  │   │
│ └──────────────────┘   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Extended bottom edge pixels
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   + medium dark fade
│     Event Title        │
│     📍 Location        │
│       ΦΟΜΟ             │
└────────────────────────┘
```

---

## Technical Changes

### File: `src/lib/storyImageGenerator.ts`

**Rewrite `drawClearBackground` to extend edges:**

1. **Draw the full image centered** (contained, no crop)
2. **Extend top edge pixels** - Sample the topmost row of the image and stretch it upward to fill the gap
3. **Extend bottom edge pixels** - Sample the bottommost row and stretch it downward
4. **Apply medium gradient fades** - Semi-transparent dark overlays at top and bottom

**New edge-extension technique:**
```text
For a horizontal image on vertical canvas:
┌────────────────┐
│  ▓ TOP EDGE ▓  │ ← Sample 1px row, stretch upward
│ ┌────────────┐ │
│ │   IMAGE    │ │ ← Original image (no crop)
│ └────────────┘ │
│ ▓ BOTTOM EDGE ▓│ ← Sample 1px row, stretch downward
└────────────────┘
```

**Steps in code:**

1. Calculate "contain" dimensions (fit full image without cropping)
2. If there's empty space above/below:
   - Get the top row of pixels from the image
   - Draw it stretched from canvas top to image top
   - Get the bottom row of pixels from the image
   - Draw it stretched from image bottom to canvas bottom
3. Draw the main image in its contained position
4. Apply medium gradient fades (darker than "light", lighter than "strong")

**Keep `drawCenteredImage`** - This draws the crisp foreground card with rounded corners and shadow

---

## Implementation Details

### Edge Extension Logic
```text
1. Create a 1px-tall temporary canvas
2. Draw just the top row of the source image
3. Stretch that 1px row to fill the gap above the main image
4. Repeat for bottom row
```

### Medium Fade Gradient
```text
Top fade (0 to 300px):
  - 0%: rgba(0, 0, 0, 0.5)
  - 50%: rgba(0, 0, 0, 0.15)
  - 100%: rgba(0, 0, 0, 0)

Bottom fade (canvasHeight - 450px to canvasHeight):
  - 0%: rgba(0, 0, 0, 0)
  - 30%: rgba(0, 0, 0, 0.25)
  - 100%: rgba(0, 0, 0, 0.6)
```

### Brightness Adjustment
Apply `brightness(0.8)` to background only (slightly darker than foreground card)

---

## Expected Result

- **Background**: Full image visible with extended edges filling the 9:16 canvas, medium fade overlays
- **Foreground**: Crisp card image with rounded corners and shadow, standing out from the background
- **No duplication feel**: Background is subtly darkened and faded, card is bright and prominent
- **Text readable**: Medium gradient ensures text is legible without overpowering the image

