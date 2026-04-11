

## Plan: Make theatre map fill the mobile screen

### Problem
The SVG viewBox has a landscape aspect ratio (~1.4:1), but the mobile screen is portrait. With `preserveAspectRatio="xMidYMid meet"`, the SVG scales to fit the width (390px), becoming only ~278px tall — leaving ~50% of the vertical space empty.

### Fix (2 files)

**1. `src/components/theatre/ZoneOverviewMap.tsx`**
- Remove `maxWidth: 600` from the container div
- Add `h-full` to both the wrapper div and the SVG element so they stretch to fill available height

**2. `src/components/theatre/FullscreenSeatSelector.tsx`**
- Change the seat map container from `overflow-y-auto` to `flex items-center justify-center` with a defined height, so the ZoneOverviewMap can expand vertically to fill the space
- Alternatively, set a `min-height` style on the SeatSelectionStep wrapper (e.g., `calc(100dvh - 120px)`) so the SVG parent has height to fill

### What stays the same
- viewBox values, zone arcs, stage, labels — all untouched
- Desktop rendering unaffected (maxWidth only removed inside mobile fullscreen context, or made conditional)

### Result
The theatre map scales up to fill the majority of the phone screen instead of sitting small at the top with empty space below.

