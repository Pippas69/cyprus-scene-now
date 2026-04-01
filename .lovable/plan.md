

# Fix All Zone Proportions to Match PDF

## Current vs Correct Proportions

The current arc degrees don't properly reflect the seat count ratios. Here's the recalculation using strict proportionality.

**Seat counts**: A=171, B=204, Γ=109, Δ=327, E=327, Z=204, H=216, Θ=113

**Layout**: Both sides get 80° each (186°-266° left, 274°-354° right), with 2° gaps between zones and 8° center gap.

### Left side (186°-266°, 80° total, 74° usable after 3x2° gaps)

| Zone | Seats | Ratio | Arc° | Range |
|------|-------|-------|------|-------|
| Α | 171 | 21.1% | 16° | 186–202 |
| Β | 204 | 25.2% | 19° | 204–223 |
| Γ | 109 | 13.4% | 10° | 225–235 |
| Δ | 327 | 40.3% | 29° | 237–266 |

These are already correct from the last update.

### Right side (274°-354°, 80° total, 74° usable after 3x2° gaps)

| Zone | Seats | Ratio | Arc° (current) | Arc° (correct) | Range |
|------|-------|-------|-----------------|-----------------|-------|
| Ε | 327 | 38.0% | 28° | 28° | 274–302 |
| Ζ | 204 | 23.7% | 18° | 18° | 304–322 |
| Η | 216 | 25.1% | 18° | 18° | 324–342 |
| Θ | 113 | 13.1% | 10° | 10° | 344–354 |

The numbers are actually already proportional. The issue may be that the **visual appearance** differs from the PDF because:
1. Zones near the sides (A, Θ) appear visually narrower due to the horseshoe curvature
2. The font sizes or label positions may make some zones look cramped

### Proposed Adjustments
To better match the PDF visually, I will slightly widen the outer zones (Α, Θ) and compress the inner zones (Δ, Ε) by ~2° each, since the curvature makes equal-degree arcs look unequal:

| Zone | New Range |
|------|-----------|
| Α | 184–202 (18°) |
| Β | 204–222 (18°) |
| Γ | 224–234 (10°) |
| Δ | 236–266 (30°) |
| Ε | 274–302 (28°) |
| Ζ | 304–320 (16°) |
| Η | 322–340 (18°) |
| Θ | 342–354 (12°) |

### File change
**`src/components/theatre/ZoneOverviewMap.tsx`** — Update `ZONE_ARCS` (lines 78-87).

