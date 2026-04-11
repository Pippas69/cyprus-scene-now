

## Plan: Zoom in the zone overview map on mobile fullscreen

### Problem
The zone overview SVG has a viewBox of `0 0 600 500` with significant empty space below the stage and entrance labels. On mobile fullscreen, this makes the theatre look distant and small.

### Fix (single file: `src/components/theatre/ZoneOverviewMap.tsx`)

**Crop the viewBox** to tighten around the actual content. The theatre arcs span roughly x:30–570, y:25–400. The "2nd entrance" and "canteen" labels sit at y:460/480 — move them up closer to the stage.

1. **Change viewBox** from `0 0 600 500` to `0 20 600 420` — this crops ~80px of dead space from the bottom and top, making the theatre fill more of the screen
2. **Move "2nd Entrance" label** from y=460 to y=390
3. **Move "Canteen" label** from y=480 to y=405

### What stays the same
- All zone arcs, stage, seat counts, click handlers — untouched
- FullscreenSeatSelector, SeatSelectionStep — no changes
- Desktop experience — the tighter viewBox benefits all screen sizes equally

### Result
The theatre map appears noticeably larger/closer on mobile, filling more of the available screen space.

