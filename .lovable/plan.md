

## Plan: Fix Section A alignment — use fixed angular boundaries

### Problem
Currently, `fullSpanDeg` is computed per-row as `(sectionMaxSmoothed - 1) * seatAngleDeg + paddingDeg`. Since `seatAngleDeg` depends on `radius` (which varies per row), each row ends up with a **different angular span** — outer rows (larger radius) get a narrower arc, inner rows (smaller radius) get a wider arc. This creates misaligned edges.

In Section Δ, the short-row logic works because those rows explicitly copy their neighbor's geometry. But Section A needs the same approach applied to **all** rows: a single, shared angular boundary.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Compute `fullStartDeg` / `fullEndDeg` once per section block** using a reference row, then apply those exact angles to every row in the block:

1. After computing all radii for outer/inner rows, pick a **reference radius** (the row with the maximum smoothed seat count)
2. Compute `seatAngleDeg` at that reference radius
3. Derive `fullSpanDeg` from `sectionMaxSmoothed` and that single `seatAngleDeg`
4. All rows in the section share the same `fullStartDeg` and `fullEndDeg`
5. Each row still distributes its own seats evenly within those shared boundaries

### Technical detail
```
// Before (per-row span — causes misalignment):
const seatAngleDeg = ((seatRadius * 2.4) / radius) * (180 / Math.PI);
const fullSpanDeg = (sectionMaxSmoothed - 1) * seatAngleDeg + paddingDeg;

// After (section-wide span from reference radius):
// Computed once per section block:
const refSeatAngleDeg = ((seatRadius * 2.4) / refRadius) * (180 / Math.PI);
const sectionSpanDeg = (sectionMaxSmoothed - 1) * refSeatAngleDeg + paddingDeg;
// Applied to every row:
const fullStartDeg = zoneMidDeg - sectionSpanDeg / 2;
const fullEndDeg = zoneMidDeg + sectionSpanDeg / 2;
```

### What stays the same
- Short-row logic for Section Δ (Κ/Λ)
- Smoothing, seat radius, row spacing
- Per-row seat distribution within the shared envelope

### Expected result
All rows in each section block share identical left and right boundaries, creating a clean sector shape matching Section Δ's alignment quality.

