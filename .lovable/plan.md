

## Plan: Fix short rows (Κ, Λ) seat positioning in Section Δ

### Problem
Rows Κ and Λ currently push seats to the left edge of the arc (`startDeg`), making them look lopsided. The user wants:
- Seats positioned starting where other rows start (same left edge) — ✅ already correct
- Seats stop early, leaving the **right side** blank
- Row labels (letters) still appear at both ends of the full arc, same as other rows — currently broken because labels follow the short arc

Looking at the screenshot again more carefully — the user said "start where the other rows start" meaning the left edge is correct. The issue is the row labels Κ and Λ on the right side should still be at the full arc width. Let me re-read the user's previous message: "I want the row to start where the other rows start from, just don't continue the seats to the end of the row keep the rest blank and at the end keep the letter of the row just like the other rows."

So the current `isShortRow` logic is actually doing the right thing for seat placement (left-aligned). The remaining issue is that **the row labels must appear at the full arc endpoints**, not at the shortened seat arc.

### What will change

**File: `src/components/theatre/ZoneSeatPicker.tsx`**

1. **Row labels (lines 547–585):** Currently labels use `startDeg` and `endDeg` from `rowLayouts`, which for short rows equals the neighbor-smoothed arc. This should already be correct. Let me verify — looking at the code, `startDeg`/`endDeg` for short rows uses `rowSpanDeg` which is the smoothed (full) arc. So labels should be at the right position.

The actual problem might be more subtle — the seats on the screenshot look like they're placed with incorrect spacing or the geometry doesn't look clean. Since I can't run the code, I'll focus on ensuring:

1. **Short row seats** are placed from `startDeg` with natural per-seat spacing (matching neighboring rows' seat density), stopping after the last seat
2. **Row labels** remain at the full `startDeg`/`endDeg` (the smoothed arc width) — this should already work
3. **Seat spacing** for short rows should use the same `seatAngleDeg` as would be used for a full row at that radius, so the 4 or 8 seats have the same density as neighboring rows

### Steps

1. In `seatPositions` calculation (~line 249–258), change short row logic: instead of distributing seats evenly across `seatSpanDeg`, space them using the same per-seat angle as neighboring full rows. This means each seat gets placed at `startDeg + seatIdx * seatAngleDeg` (where `seatAngleDeg` comes from the row's radius).

2. Store `seatAngleDeg` in each `rowLayout` entry so it's available in the position calculation.

3. Verify the wheelchair icon rendering still works correctly.

