

## Plan: Fix Row M alignment by excluding short rows from smoothing

### Problem
Row M (18 seats) is being pulled inward because `getSmoothedCount` averages it with Row Λ (8 seats), producing a smoothed count of ~15.75 instead of ~18-19. This makes M's arc narrower than its full-row neighbors.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Modify `getSmoothedCount` (lines 193-199)** to skip neighbors that are short rows when computing the average. Specifically:
- When looking at `prev` and `next` counts, if a neighbor has < 60% of the current row's count, substitute the current row's own count instead
- This prevents Λ(8) and Κ(4) from dragging down M's arc width
- Result: M's smoothed count becomes ~(18 + 18*2 + 19)/4 ≈ 18.25, matching the alignment of rows above it

No other rows or logic will be touched.

