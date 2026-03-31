

# Fix Seat Map — Proportional Angular Distribution, Stage, and Seat Rotation

## Root Cause Analysis

Three issues visible in the screenshot:

### 1. Seats overlapping — angular spans are disproportionate
The angular widths assigned to each zone don't match their seat counts. For example, Τμήμα Α has 171 seats crammed into just 5° (seats ~1.9px apart), while Πλατεία has 336 seats across 46° (plenty of room). This makes some zones invisible — seats stack on top of each other.

**Current vs needed (approximate):**
```text
Zone        Seats  Current°  Needed° (proportional)
────────────────────────────────────────────────────
Τμήμα Α      171     5°        12°
Τμήμα Β      204    12°        15°
Τμήμα Γ      109    13°         8°
Τμήμα Δ      327    21°        24°
Πλατεία      336    46°        24°
Τμήμα Ε      327    21°        24°
Τμήμα Ζ      204    10°        15°
Τμήμα Η      216     9°        16°
Τμήμα Θ      113    10°         8°
                   ────        ────
Available:         146°        146° (170° total - 8×3° gaps)
```

### 2. Stage renders as a V-shape
The SVG path draws an arc with radius 542 (same as outermost row). The actual arc goes far below the viewport, leaving only the two straight lines visible as a "V". The stage should be a **small decorative arc** near the bottom center — not a full-radius shape.

### 3. Seats all face the same direction
Every seat shape points straight up. In a semicircular layout, seats should **rotate to face the stage** — the chair back should point away from center. This requires adding a `transform="rotate(angle)"` to each seat based on its angle from the stage center.

## Fix Steps

### Step 1: Regenerate all 2,007 seat coordinates
Run a Python script that distributes angular spans **proportional to each zone's seat count**:
- Total available: 170° (5°–175°) minus 8 × 3° gaps = 146°
- Each zone gets: `(zone_seats / total_seats) × 146°`
- Same geometry: center (600, 870), base radius 100px, row step 26px
- Minimum 8px seat spacing enforced; if arc is too short for a row, slightly expand
- 2° internal gap per zone for radial aisle

### Step 2: Fix stage rendering in SeatMapViewer.tsx
Replace the full-radius semicircle with a **small flat arc** at the bottom:
- Radius = ~70px (just a visual indicator, not matching seat radius)
- Simple SVG arc centered at (scx, scy) with "ΣΚΗΝΗ" label inside
- No lines to center, no filled wedge — just a curved bar

### Step 3: Rotate seats to face the stage
In the `renderSeat` function, compute each seat's angle from center:
```
angle = atan2(stageCY - seat.y, seat.x - stageCX)
rotation = 90° - angle_in_degrees
```
Apply `transform="rotate(rotation, cx, cy)"` to each seat `<g>` so the chair back faces outward.

### Step 4: Database update
- DELETE all existing seats for venue `b3c3805f-6fb6-4c0e-a6a5-907dfe43b6b7`
- INSERT 2,007 regenerated seats with new coordinates

## Files Changed
- **Database**: `venue_seats` table (DELETE + INSERT via data tool)
- **`src/components/theatre/SeatMapViewer.tsx`**: Stage rendering (small arc) + seat rotation

