

## Plan: Align Section A rows (same approach as Section Δ)

### Problem
In Section A, each row computes its own arc width from its smoothed seat count. With counts ranging 10–15 (outer) and 9–12 (inner), rows end up with different widths, creating jagged left/right edges instead of clean aligned boundaries.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Use a per-section maximum envelope width** so all rows in each section (inner/outer) share the same angular span:

1. After computing all `smoothedCount` values for a section, find the **maximum smoothed count** across that section
2. Use that maximum to compute a single `sectionEnvelopeSpanDeg` for the entire section
3. All rows in that section use the same `fullStartDeg` / `fullEndDeg` (centered on `zoneMidDeg`)
4. Seats within each row are still distributed according to their actual count within that shared envelope

This is the same principle we applied to Section Δ's short rows — decoupling the visual envelope from the seat placement — but applied uniformly to all rows in a section.

### What changes
- In the `rowLayouts` useMemo (~line 212), after computing all smoothed counts, derive a single envelope per section
- Each row's `fullStartDeg`/`fullEndDeg` comes from the section envelope, not from its individual smoothed count
- Seat positions still use their row's actual count for spacing within the shared envelope

### What stays the same
- Short-row logic for Section Δ (Κ/Λ) — untouched
- Smoothing function — untouched
- Seat radius, row spacing, all other geometry — untouched

### Expected result
- All rows in Section A's outer block share the same left and right boundaries
- All rows in Section A's inner block share the same left and right boundaries
- Creates a clean trapezoid/sector shape matching the real theatre layout

