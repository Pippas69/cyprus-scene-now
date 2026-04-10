

## Plan: Right-align seats in Section A

### Problem
Seats are currently left-aligned (`fullStartDeg + seatIdx * seatStepDeg`), so shorter rows leave gaps on the right. The real theatre layout shows gaps should be on the **left** — all rows share the same right edge.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change line 333** from left-aligned to right-aligned placement:

```tsx
// Before (left-aligned):
angle = rowSeats.length === 1
  ? zoneMidDeg
  : fullStartDeg + seatIdx * seatStepDeg;

// After (right-aligned):
angle = rowSeats.length === 1
  ? zoneMidDeg
  : fullEndDeg - (rowSeats.length - 1 - seatIdx) * seatStepDeg;
```

This places the last seat at `fullEndDeg` and works backwards. Rows with fewer seats will have empty space on the left while all sharing the same right boundary.

### What stays the same
- Fixed section-wide boundaries, short-row logic, smoothing, all geometry constants
- Section Δ behavior

