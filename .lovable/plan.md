

## Plan: Evenly distribute inner Section A seats (no gaps)

### What I understood
- **Outer rows**: Right-aligned, shorter rows leave gaps on the left — current behavior is correct
- **Inner rows**: Seats spread evenly from edge to edge across the full envelope — no gaps on either side. Each row fills its entire arc regardless of seat count.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change the seat placement logic (line 331-333)** to use different distribution based on outer vs inner:

```tsx
// Before (all rows right-aligned):
angle = rowSeats.length === 1
  ? zoneMidDeg
  : fullEndDeg - (rowSeats.length - 1 - seatIdx) * seatStepDeg;

// After:
if (rowSeats.length === 1) {
  angle = zoneMidDeg;
} else if (isOuter) {
  // Outer: right-aligned (gaps on left)
  angle = fullEndDeg - (rowSeats.length - 1 - seatIdx) * seatStepDeg;
} else {
  // Inner: evenly distributed edge-to-edge (no gaps)
  angle = fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
}
```

This requires adding `isOuter` to the destructured values in the `seatPositions` memo (line 328).

### What stays the same
- Fixed section-wide boundaries, uniform step for outer rows, smoothing, Section Δ

