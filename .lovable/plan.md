

# Redesign Zone Overview to Match PDF Layout

## Problem
The current `ZoneOverviewMap.tsx` uses small rotated rectangles positioned roughly in a horseshoe. It looks nothing like the actual Pattihio floor plan from the PDF.

## Goal
Replace the SVG with a proper horseshoe diagram using shaped polygon/path regions for each zone, matching the reference image layout. Zones are clickable but show NO individual seats — just colored regions with zone labels and availability counts.

## Zone Layout (from reference image, left to right)

Based on the uploaded image, the horseshoe has:
- **Stage** (ΣΚΗΝΗ) at the bottom center
- **ΚΥΡΙΑ ΕΙΣΟΔΟΣ** (main entrance) at the top center
- **Β' ΕΙΣΟΔΟΣ** (second entrance) at the bottom left
- **ΚΑΝΤΙΝΑ** at the far bottom left

Zone positions (clockwise from bottom-left):
1. **Α** — bottom-left wing (magenta in image)
2. **Β** — left side (red)
3. **Γ** — upper-left (green)
4. **Δ** — upper center-left (orange)
5. **Πλατεία** — inner center bowl (teal, not a separate wing)
6. **Ε** — upper center-right (blue)
7. **Ζ** — right side (brown)
8. **Η** — right wing (light blue)
9. **Θ** — bottom-right wing (purple)

## Implementation

### File: `src/components/theatre/ZoneOverviewMap.tsx` — Full rewrite

1. **SVG horseshoe using annular sector paths**: Each zone rendered as an SVG `<path>` shaped like an arc segment (annular sector / "pie slice" between inner and outer radii). This creates the horseshoe look naturally.

2. **Geometry approach**:
   - Center point at top of viewBox (stage is at the bottom, seats curve away from stage upward)
   - Inner radius ~100, outer radius ~280
   - Total arc spans roughly 170° (from ~185° to ~355° if stage at bottom, or equivalently stage at 270° with seats spanning above)
   - Each zone gets an angular slice proportional to its seat count
   - Πλατεία gets an inner band (smaller radii) spanning the center portion

3. **Each zone path**:
   - Filled with zone color at ~30% opacity
   - Thick colored border on hover
   - Zone letter label centered in the region
   - Small text showing "X διαθέσιμες" below the label
   - Selection badge if seats are selected in that zone
   - `cursor-pointer` + click handler → `onZoneClick(zone)`

4. **Fixed elements**:
   - Stage semicircle at the bottom
   - "ΚΥΡΙΑ ΕΙΣΟΔΟΣ" label at top
   - "Β' ΕΙΣΟΔΟΣ" label at bottom-left
   - Outer theatre boundary arc (thin line)

5. **Zone-to-angle mapping** (hardcoded for Pattihio):
   ```
   Zone layout around the horseshoe (angles in degrees, 0° = right):
   Stage is at ~270° (bottom). Seats curve from ~190° to ~350°.
   
   Α: 190°–210° (bottom-left wing)
   Β: 212°–238° (left)
   Γ: 240°–258° (upper-left)
   Δ: 260°–282° (upper center-left)
   Ε: 284°–306° (upper center-right)
   Ζ: 308°–324° (right)
   Η: 326°–342° (right wing)
   Θ: 344°–358° (bottom-right wing)
   Πλατεία: inner band spanning ~240°–320°
   ```

6. **Zone colors**: Use the colors already stored in `venue_zones` table (the DB colors), with the option to update them later to match the PDF exactly.

### No other files changed
- `SeatSelectionStep.tsx` — no changes needed, already coordinates overview ↔ detail
- `ZoneSeatPicker.tsx` — no changes needed, already works for per-zone seat selection
- Database — no changes needed

### Rendering details
- ViewBox: `0 0 600 500`
- Helper function `annularSectorPath(cx, cy, innerR, outerR, startAngle, endAngle)` generates SVG path `d` attribute
- Hover effect: increase opacity + thicker stroke
- Mobile-friendly: SVG scales naturally via `viewBox`

