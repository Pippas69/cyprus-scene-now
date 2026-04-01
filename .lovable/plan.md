

# Fix Zone Detail View: No Cutoff, More Spacing, Two Sections

## Problems
1. **Zones cut off**: SVG container has `maxHeight: '55vh'` and `overflow-hidden` -- larger zones get clipped
2. **Seats too cramped**: `ROW_SPACING = 22` and `SEAT_RADIUS = 8` make it impossible to tap individual seats on mobile
3. **Missing two-section layout**: Each zone's seats are split into two groups (left/right halves) with an aisle gap between them, but currently all seats render as one continuous arc

## Solution

### File: `src/components/theatre/ZoneSeatPicker.tsx`

**1. Make scrollable instead of clipped**
- Remove `maxHeight: '55vh'` and `overflow-hidden`
- Replace with `overflow-auto` so users can scroll/drag to see the full zone
- Add touch-friendly scrolling with `-webkit-overflow-scrolling: touch`

**2. Increase spacing**
- `ROW_SPACING`: 22 -> 32 (more gap between rows)
- `SEAT_RADIUS`: 8 -> 10 (bigger tap targets)
- Increase `padDeg` from 0.8 to 1.5 so seats don't bunch at arc edges

**3. Two-section split with aisle gap**
- For each row, sort seats by `seat_number` and split into two halves (first half and second half)
- Render the first half across the first portion of the arc (startDeg to midDeg - gapDeg)
- Render the second half across the second portion (midDeg + gapDeg to endDeg)
- This creates a visible aisle/gap in the middle of each row, matching the PDF layout
- The gap width will be ~3-4 degrees

**4. Adjust viewBox padding**
- Increase `padX` and `padBottom` to ensure the boundary arc and labels aren't clipped
- The viewBox auto-calculates from seat positions, so larger spacing will naturally expand it

No other files need changes -- this is all within ZoneSeatPicker.

