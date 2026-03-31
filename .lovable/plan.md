

# Fix Παττίχειο Seat Map — Semicircle with Stage Inside + Proper Spacing and Labels

## What's Changing

The stage sits **at the center of the semicircle** — its curved edge aligns with the outermost row. All seats radiate inward from the stage center on concentric arcs forming a true semicircle. Row labels must appear in the inter-zone gaps at the correct radial position.

## Geometry Model

```text
        ·  ·  ·  ·  ·  ·  ·       ← outermost row (Σ) — largest radius
       ·  ·  ·  ·  ·  ·  ·  ·
      ·  ·  ·  ·  ·  ·  ·  ·  ·
     ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ← inner rows
      ·  ·  ·  ·  ·  ·  ·  ·  ·
        ╭━━━━━━━━━━━━━━━━━╮        ← STAGE (semicircle, radius = outermost row radius)
        ┃     ΣΚΗΝΗ       ┃
        ╰━━━━━━━━━━━━━━━━━╯
```

- **Stage center**: `(600, 870)` — this is the geometric center shared by all arcs AND the stage semicircle
- **Stage radius** = same as outermost row radius (so the stage's curved top edge meets the last row)
- All seats have `y < 870` (above the stage center line)
- Semicircle angular range: **5° to 175°** (0°=right, 180°=left)

### Parameters
- **Base radius**: 100px (innermost row Α)
- **Row step**: 26px per row outward (18 rows Α–Σ → max radius = 100 + 17×26 = 542px)
- **Minimum seat spacing**: 8px between adjacent seats on same arc
- **Inter-zone gaps**: 3° (where row labels are placed)
- **Intra-zone aisle**: 2° gap splitting each zone into left/right halves

### Angular Sectors
```text
Left ←————————————————————————→ Right
 Α      Β      Γ      Δ    Πλατεία    Ε      Ζ      Η      Θ
175°   165°   153°   140°    113°     67°    40°    27°    15°
 ↕      ↕      ↕      ↕      ↕        ↕      ↕      ↕      ↕
170°   158°   146°   116°    67°     40°    30°    18°     5°
```

## Implementation Steps

### Step 1: Python script to generate coordinates
- For each zone → each row → split seats into two halves
- Left half: `[zone_start, zone_mid - 1°]`, Right half: `[zone_mid + 1°, zone_end]`
- `x = 600 + r × cos(θ)`, `y = 870 - r × sin(θ)`
- Enforce minimum 8px spacing; if arc too short, log warning
- Output SQL INSERT statements
- Verify: all y < 870, total = 2,007

### Step 2: Database data update
- DELETE all existing seats for venue `b3c3805f-6fb6-4c0e-a6a5-907dfe43b6b7`
- INSERT 2,007 regenerated seats with correct coordinates

### Step 3: Update stage rendering in SeatMapViewer.tsx
- Replace the current straight-line stage indicator with a **filled semicircle arc** whose radius matches the outermost seat row
- The stage semicircle sits below all seats, curving from the leftmost to rightmost seat positions
- Stage label ("ΣΚΗΝΗ") centered inside

### Step 4: Fix row label placement in SeatMapViewer.tsx
- Replace current cluster-based label logic (lines 220-279)
- New approach: For each inter-zone gap (8 gaps between 9 zones), compute the angular midpoint of the gap
- For each row that exists in both adjacent zones, place the label at `(cx + r·cos(gap_mid_angle), cy - r·sin(gap_mid_angle))`
- This places row letters on the radial dividing lines between sections, matching the PDF

## Files Changed
- **Database**: `venue_seats` table — DELETE + INSERT via data tool
- **`src/components/theatre/SeatMapViewer.tsx`**: Stage shape rendering (semicircle) + row label logic (inter-zone gap placement)

