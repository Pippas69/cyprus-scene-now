

## Plan: Fix short rows Κ & Λ seat spacing in Section Δ

### Problem
The `seatAngleDeg` used for short rows is the minimum circle-packing angle (~1.5°), but normal rows distribute seats across the full arc width giving ~3-4° per seat. This makes the 4/8 seats in Κ/Λ cluster tightly at the left edge instead of matching the spacing of neighboring rows.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**1. Calculate the proper per-seat angle for short rows (lines 229-242)**

For short rows, compute `shortRowSeatAngle` from the neighboring rows' actual spacing:
- Take `(endDeg - startDeg) / (smoothedCount - 1)` — this is the angle each seat would get if the row were full
- Use this wider angle instead of the tight `seatAngleDeg` when placing short row seats

**2. Update seat positioning (lines 253-255)**

Change the short row branch to use the new wider angle:
```
angle = startDeg + seatIdx * neighborSeatAngle;
```
where `neighborSeatAngle = rowSpanDeg / (smoothedCount - 1)` — the per-seat spacing of a full row at this arc width.

This ensures Κ's 4 seats and Λ's 8 seats are spaced identically to how they'd be spaced in a full row, starting from the left edge, with the rest of the row left blank. Labels already use the full arc endpoints so they'll remain correct.

