

# Plan: Fix Παττίχειο Seating Layout to Match PDF

## Problems Identified

1. **Sections placed wrong**: Wing sections (Γ, Β, Α, Ζ, Η, Θ) are generated with incorrect coordinates, placing them as disconnected blobs instead of continuous curved extensions
2. **Gap in center**: The Δ/Ε split creates a visual gap rather than a smooth continuation of the semicircle
3. **Orphan row labels**: The SeatMapViewer renders row labels for every zone+row combination, including positions where coordinates land far from the main seating area
4. **Seats too close**: The seat spacing (radius step, angular distribution) is too tight

## What the PDF Actually Shows

```text
                    ΚΥΡΙΑ ΕΙΣΟΔΟΣ
                         ↓
          ┌──── Δ (left outer) ──── Ε (right outer) ────┐
        Γ │                                               │ Ζ
       ┌──┤      Rows Κ-Σ (outer semicircle)             ├──┐
      Β│  │                                               │  │Η
      ┌┤  │      Πλατεία: Rows Α-Ι (inner semicircle)   │  ├┐
     Α││  │                                               │  ││Θ
      │└──┴───────────── ΣΚΗΝΗ ──────────────────────────┘──┘│
      └──────────────────────────────────────────────────────┘
```

- ALL sections form one continuous amphitheatre shape
- Πλατεία = center bowl (rows Α-Ι), ~336 seats
- Δ = left half of outer rows (Κ-Σ), Ε = right half of outer rows (Κ-Σ)
- Γ = left-center wing, Β = left wing extension
- Ζ = right wing, Η = right wing extension
- Α = far-left vertical column, Θ = far-right vertical column

## Implementation

### Step 1: Delete all existing seats for this venue

Single SQL migration to wipe `venue_seats` for this venue ID.

### Step 2: Regenerate all ~2007 seats with correct coordinates

Run a Python script to compute proper coordinates:

- **Stage center**: bottom-center of coordinate space
- **Πλατεία (rows Α-Ι)**: concentric arcs spanning ~140 degrees, centered on stage. Base radius 200, row spacing 28 (wider than before)
- **Δ (rows Κ-Σ, left half)**: continue the same concentric arcs but only the LEFT portion (90-180 degrees)
- **Ε (rows Κ-Σ, right half)**: continue the same arcs but only the RIGHT portion (0-90 degrees)
- **Γ (left-center wing)**: rows curving from where Δ ends, wrapping further left
- **Β (left wing)**: extends further left with continuing curved rows
- **Ζ (right wing)**: mirror of Γ on the right side
- **Η (right wing extension)**: mirror of Β
- **Α (far-left column)**: nearly vertical column of seats along the far-left edge
- **Θ (far-right column)**: nearly vertical column along the far-right edge
- **Seat spacing**: angular gap between seats large enough that they don't overlap (min ~22px between seat centers)
- **4 wheelchair seats**: near front center

The key geometric insight: ALL seats in the main bowl (Πλατεία + Δ + Ε) share the SAME center point and radius progression. The only difference is the angular range each section covers. Wing sections (Β, Γ, Ζ, Η) extend the arc beyond 180 degrees. Α and Θ are nearly vertical extensions at the far edges.

### Step 3: Fix row label rendering in SeatMapViewer

Update the row label logic to only render labels where there are actually enough seats nearby. Currently it renders a label for every unique zone+row combination — this creates floating labels for sections with scattered coordinates. Add a minimum seat count check (e.g., only render if the row has 3+ seats).

### Step 4: Keep existing zone colors (they're fine)

The 9 zones with distinct colors are correct — the issue was the PLACEMENT of seats, not the number of zones. Once seats are positioned correctly in the semicircle, each zone will be visually distinct and properly placed.

## Files Changed

1. **Database migration**: DELETE + batch INSERT ~2007 seats with corrected x,y coordinates
2. **src/components/theatre/SeatMapViewer.tsx**: Fix row label logic to suppress orphan labels

