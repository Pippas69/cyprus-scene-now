

## Fix Zone Seat Picker — Positioning, Sizing & Visuals

### Problems Identified

1. **Seat overlap**: Zones like Τμήμα Δ and Ε have up to 51 seats per row. With `SEAT_RADIUS = 12` and the current arc spread formula (`maxSeats * 4.8°`, capped at 176°), seats overlap when rows are dense.
2. **Oversized SVG**: `ROW_SPACING = 44`, `BASE_RADIUS = 180`, and `SECTION_GAP = 92` create a massive SVG requiring excessive scrolling. The `minWidth` calculation (`maxSeatsInRow * 30`) forces horizontal scroll too.
3. **ViewBox issues**: The complex viewBox computation based on boundary arcs, title radius, and stage radius often produces too much whitespace or clips content.
4. **Visual clutter**: Red boundary arc, dashed section gap lines, and the large zone letter title add noise. The stage indicator (`↓ ΣΚΗΝΗ`) placed via trigonometry often lands in odd positions.

### Plan

**File: `src/components/theatre/ZoneSeatPicker.tsx`**

1. **Dynamic seat radius & spacing** — Calculate `SEAT_RADIUS` and `ROW_SPACING` based on `maxSeatsInRow`:
   - ≤20 seats/row: radius 12, spacing 40
   - 21–35: radius 9, spacing 32
   - 36–51: radius 7, spacing 26
   - This prevents overlap in dense zones (Δ, Ε) while keeping small zones (Α, Θ) readable.

2. **Wider arc spread for dense zones** — Change the `detailSpanDeg` formula to account for seat radius, ensuring minimum angular separation between adjacent seats. Use `clamp(maxSeatsInRow * 3.2, 90, 176)` and verify no overlap.

3. **Reduce section gap & base radius** — Lower `SECTION_GAP` from 92→50 and `BASE_RADIUS` from 180→140 to make the overall diagram more compact.

4. **Simplify viewBox** — Replace the complex boundary-scanning viewBox with a straightforward calculation based on the actual seat positions bounding box + fixed padding. Remove the title/stage radius from the viewBox computation.

5. **Remove `minWidth` forced scroll** — Remove `style={{ minWidth }}` so the SVG fits naturally in the container width. Let `preserveAspectRatio="xMidYMid meet"` handle scaling.

6. **Clean up visuals**:
   - Remove the red boundary arc (it's decorative noise)
   - Simplify section gap lines to a single subtle divider
   - Move the stage label to a fixed position below the inner arc, not computed via trigonometry
   - Reduce zone letter title size from 34→22

7. **Add pinch-to-zoom & pan** — Wrap the SVG in a container with the same zoom/pan logic used in `SeatMapViewer` (scroll wheel, pinch, drag) so users can zoom into specific rows on mobile.

### Files Changed
| File | Change |
|---|---|
| `ZoneSeatPicker.tsx` | All 7 changes above |

No database changes. No other files affected.

