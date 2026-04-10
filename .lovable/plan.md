

## Plan: Align Section A seats using uniform angular step

### Problem
On line 335-337, non-short rows distribute seats **evenly across the full envelope** (`fullStartDeg` to `fullEndDeg`). But rows with fewer seats spread them wider, while rows with more seats pack them tighter. This means seat columns don't line up vertically between rows — unlike Section Δ where short rows use a fixed `seatStepDeg`.

The fix is simple: **all rows should place seats from the left edge using the same angular step**, just like short rows already do.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change the seat placement logic** (lines 331-338) so ALL rows use left-aligned placement with `seatStepDeg`:

```tsx
// Before (line 331-338):
if (isShortRow) {
  angle = fullStartDeg + seatIdx * seatStepDeg;
} else {
  angle = rowSeats.length === 1
    ? zoneMidDeg
    : fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
}

// After:
angle = rowSeats.length === 1
  ? zoneMidDeg
  : fullStartDeg + seatIdx * seatStepDeg;
```

**Also update `seatStepDeg` computation** (lines 304-306) so non-short rows also get a proper step value based on the section envelope:

```tsx
// Before:
const seatStepDeg = isShortRow && fullEnvelopeCount > 1
  ? fullSpanDeg / (fullEnvelopeCount - 1)
  : seatAngleDeg;

// After:
const seatStepDeg = sectionMaxSmoothed > 1
  ? fullSpanDeg / (sectionMaxSmoothed - 1)
  : seatAngleDeg;
```

This gives every row the same angular step derived from the section's max count and the fixed envelope width. Seats start from the left edge and step at the same interval, so columns align perfectly — exactly how Section Δ already works.

### What stays the same
- Fixed section-wide boundaries (`outerFixedStart/End`, `innerFixedStart/End`)
- Short-row detection, smoothing, all geometry constants
- Section Δ behavior (already uses this pattern)

### Expected result
All seat columns in Section A align vertically, matching Section Δ's quality.

