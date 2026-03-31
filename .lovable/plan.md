

# Fix Παττίχειο Layout — Unified Arc Model

## The Core Problem

The current coordinates place wing sections as **diagonal straight lines extending BELOW the stage**. In the SVG, higher Y = lower on screen. The stage is at `y≈850`, but wing seats go to `y=1326`. This creates the broken, asymmetric shape you see.

**In a real amphitheatre, ALL seats are above (in front of) the stage — never behind it.**

## Root Cause

Previous scripts treated each wing as an independent geometric shape with its own center/angle range that went past 180°. The correct model: **every seat in the entire venue sits on a concentric arc sharing ONE center point (the stage), within a specific angular sector. No angles go below the horizontal.**

## The Fix: Unified Concentric Arc Model

**How it works:**
- Stage center at `(600, 850)`. ALL seats have `y < 850`.
- Each row label (Α, Β, Γ, ... Σ) maps to a specific radius from stage center.
- Each zone is defined by an angular range (sector of the semicircle).
- A seat at row X in zone Y = point on arc at `radius(X)` within `angle_range(Y)`.

```text
Angular sectors (0° = right, 180° = left, 90° = center top):

  Α   Β   Γ    Δ    Πλατεία    Ε    Ζ   Η   Θ
 180°←175°←168°←155°←← 90° →→25°→12°→5°→0°
  |    |    |    |      ↑       |    |   |   |
  far  far  left left  center  right right far far
  left left              right      right
```

- Πλατεία (center): ~155° to ~25° (wide central bowl)
- Δ (left outer rows): ~155° to ~90° (left half of outer ring)
- Ε (right outer rows): ~90° to ~25° (right half of outer ring)
- Γ: ~168° to ~155° | Ζ: ~25° to ~12°
- Β: ~175° to ~168° | Η: ~12° to ~5°
- Α: ~180° to ~175° | Θ: ~5° to ~0°

This naturally creates one continuous horseshoe shape because every seat shares the same center.

## Implementation Steps

### Step 1: Generate correct coordinates via Python script
- Define radius per row: `radius = BASE_R + row_index * ROW_STEP`
- Define angular range per zone (as above)
- For each zone+row combo, distribute `N` seats evenly along the arc within that sector
- Compute `x = cx + r * cos(θ)`, `y = cy - r * sin(θ)` (minus because SVG y-axis is inverted)
- Verify: ALL `y < 850`, total = 2007, per-zone counts match existing

### Step 2: SQL migration
- DELETE all existing seats for this venue
- INSERT the regenerated seats with correct (x, y) coordinates

### Step 3: Zone color update
- Match PDF palette (currently too many distinct colors — Δ and Ε should share a color, Γ and Ζ share a color, etc.)

### Step 4: SeatMapViewer already fixed
- The cluster-based label logic from the previous edit is fine — it only needs correct coordinate data to work properly.

## Files Changed

1. **Database migration**: DELETE + INSERT ~2007 seats with corrected coordinates; UPDATE zone colors
2. No viewer code changes needed — the rendering logic is correct, only the data was wrong

