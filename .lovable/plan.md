

# Fix Seat Map — Correct Angular Distribution + Stage Arc

## Root Cause

The coordinate-generation script used angular ranges roughly **half** the planned width. For example, Πλατεία spans 80°–103° (23°) instead of the planned 67°–113° (46°). This compresses all seats into the center, creating the clumped mess visible in the screenshot. The stage arc path also uses the wrong SVG arc flag, drawing a V-shape instead of a semicircle.

## Fix: Regenerate All 2,007 Coordinates

Re-run the Python script with **correct angular ranges** matching the plan:

```text
Zone           Planned Start°  Planned End°   Span
─────────────────────────────────────────────────
Τμήμα Θ         5              15             10°
Τμήμα Η        18              27              9°
Τμήμα Ζ        30              40             10°
Τμήμα Ε        43              64             21°
Πλατεία        67             113             46°
Τμήμα Δ       116             137             21°
Τμήμα Γ       140             153             13°
Τμήμα Β       156             168             12°
Τμήμα Α       171             176              5°
```

- 3° gap between each adjacent zone (for row labels)
- 2° internal gap splitting each zone into left/right halves
- Base radius 100px, row step 26px, min 8px seat spacing
- `x = 600 + r·cos(θ)`, `y = 870 - r·sin(θ)`

**Adjusted angular widths**: Πλατεία gets the largest span (46°) as the center section. Δ/Ε get 21° each as the next-largest flanking sections. Γ gets 13° (more than the broken 5.6° it currently has). Wing zones Α/Θ get smaller spans matching their fewer seats.

## Fix: Stage Semicircle Rendering

The SVG arc in `SeatMapViewer.tsx` line 571 uses `0 1 0` (large-arc, counter-clockwise) which draws the arc the wrong way. Fix: change the arc flag to `0 0 1` (small-arc, clockwise) to draw the **upper** semicircle that sits below the seats, curving downward.

Also move the stage label inside the semicircle (adjust y position).

## Steps

1. **Python script** — regenerate all 2,007 seat (x, y) coordinates with the correct angular distribution above
2. **Database update** — DELETE all seats for this venue, INSERT regenerated seats
3. **Fix stage arc** in `SeatMapViewer.tsx` — correct the SVG arc flag from `0 1 0` to `0 0 1` so the semicircle curves properly below the seats

## Files Changed
- **Database**: `venue_seats` table (DELETE + INSERT)
- **`src/components/theatre/SeatMapViewer.tsx`**: Fix stage arc path (line ~571)

