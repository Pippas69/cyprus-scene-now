

# Plan: Add Παττίχειο Δημοτικό Αμφιθέατρο as a New Venue

## Overview

Add the **Παττίχειο Δημοτικό Αμφιθέατρο Λάρνακας** (Pattihio Municipal Amphitheatre) as a second venue option. This is a large outdoor amphitheatre with **2007 seats** arranged in a **semicircular / half-circle layout** with curved rows radiating outward from the stage.

The venue has **10 distinct seating sections** and rows labeled with Greek letters, with numbered seats in each row. The stage sits at the bottom-center and the main entrance is at the top.

---

## What the PDF Shows

The seating plan is a classic amphitheatre layout:
- **Central bowl**: Sections Δ and Ε at the top/back, narrowing down through sections with rows labeled Α through Σ (Greek alphabet), each row curving in a semicircle
- **Side wings**: Section Β (left wing), Section Ζ (right wing) — these curve around the sides
- **Far sides**: Section Α (far left, vertical), Sections Η and Θ (far right, vertical)  
- **Front section Γ**: left-center area
- **Stage (ΣΚΗΝΗ)**: bottom center
- **Facilities**: ΚΑΝΤΙΝΑ + Β' ΕΙΣΟΔΟΣ (bottom-left), ΚΥΡΙΑ ΕΙΣΟΔΟΣ (top center)
- **4 wheelchair positions**

Each section has rows (Greek letters Α-Σ) with sequential seat numbers. Seat counts per row vary (wider rows at the back have more seats).

---

## Implementation Steps

### Step 1: Database Migration — Insert Venue Record

Insert a new row into `venues`:
- **name**: Παττίχειο Δημοτικό Αμφιθέατρο
- **city**: Λάρνακα (Larnaca)
- **capacity**: 2007
- **is_active**: true

### Step 2: Database Migration — Create Venue Zones

Insert zones into `venue_zones` for each section visible in the plan. Based on the PDF, approximately **10 zones**:

| Zone | Name | Color | Approx Capacity |
|------|------|-------|-----------------|
| 1 | Πλατεία Α-Β (Stalls Front) | Deep teal | ~120 |
| 2 | Πλατεία Γ-Ε (Stalls Mid) | Teal | ~200 |
| 3 | Πλατεία Ζ-Θ (Stalls Back) | Sea green | ~250 |
| 4 | Section Γ (Left-center) | Amber | ~180 |
| 5 | Section Δ (Upper-center left) | Coral | ~200 |
| 6 | Section Ε (Upper-center right) | Purple | ~200 |
| 7 | Section Β (Left wing) | Blue | ~250 |
| 8 | Section Ζ (Right wing) | Indigo | ~200 |
| 9 | Section Α (Far left) | Slate | ~170 |
| 10 | Sections Η-Θ (Far right) | Rose | ~237 |

*Exact capacities will be calculated from the seat data.*

### Step 3: Database Migration — Create All Venue Seats

Insert ~2007 rows into `venue_seats`. Each seat needs:
- `venue_id` → the new venue
- `zone_id` → matching zone
- `row_label` → Greek letter (Α, Β, Γ, etc.)
- `seat_number` → sequential number
- `seat_label` → e.g. "Α12"
- `x, y` → coordinates arranged in **semicircular arcs**
- `seat_type` → "standard" or "wheelchair" (4 wheelchair seats)

**Critical geometry**: Seats must be positioned along concentric semicircular arcs (not straight rows). Each row radius increases outward from the stage. The x,y coordinates will be computed using trigonometric functions to create the half-circle shape, matching the PDF layout.

The coordinate generation will:
1. Place the stage center at the bottom of the coordinate space
2. For each row (inner to outer), compute a radius
3. Distribute seats along the arc using angular positions
4. Side sections (Α, Β, Ζ, Η, Θ) get their own curved/straight segments matching the PDF

### Step 4: Update SeatMapViewer (if needed)

The existing `SeatMapViewer.tsx` already renders seats from `x,y` coordinates and draws a curved stage line. The semicircular layout should render correctly as-is, since the component uses the raw coordinates. However, minor adjustments may be needed:
- The stage indicator curve may need to be more pronounced for this amphitheatre shape
- Ensure the viewBox accommodates the wider semicircular spread

### Step 5: No UI Changes Needed for VenueSelector

The `VenueSelector` component already queries all active venues and displays them in a dropdown. The new venue will automatically appear once inserted.

---

## Technical Details

### Seat Coordinate Computation

A script will generate the ~2007 seat coordinates using this approach:

```text
Stage center: (500, 950)
Row A radius: 100  (closest to stage)
Row Σ radius: 800  (farthest from stage)
Arc span: ~180° (semicircle)

For each seat in a row:
  angle = start_angle + (seat_index / total_seats_in_row) * arc_span
  x = center_x + radius * cos(angle)
  y = center_y - radius * sin(angle)
```

Side wing sections will use adjusted angles and positions to match the PDF's wing sections that extend beyond the main semicircle.

### Migration Size

This will be a large migration (~2007 INSERT statements for seats + ~10 for zones + 1 for the venue). It will be structured as a single transaction.

---

## Files Changed

1. **New migration SQL** — via migration tool: INSERT venue, zones, and all ~2007 seats with semicircular coordinates
2. **src/components/theatre/SeatMapViewer.tsx** — minor tweaks if the amphitheatre shape needs stage/viewBox adjustments (likely minimal)

