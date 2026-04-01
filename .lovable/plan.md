

# Fix Zone Proportions — Make Layout Symmetric

## Problem
The current layout is asymmetric: left side spans 86° (190°→276°) but right side only 74° (284°→358°). This makes zones like Δ(32°) vs Ε(26°) look unequal despite having the same seat count (327 each). The PDF shows a clearly symmetric horseshoe.

## Solution
Make both sides span equally around the center (270°), then distribute proportionally by seat count within each side.

**Symmetric span**: Left 186°→266° (80°), Right 274°→354° (80°), with 8° center gap.

Each side: 80° minus 6° (three 2° inter-zone gaps) = 74° usable.

**Left side** (seats total: 811):
| Zone | Seats | Arc° | Range |
|------|-------|------|-------|
| Α | 171 | 16° | 186–202 |
| Β | 204 | 19° | 204–223 |
| Γ | 109 | 10° | 225–235 |
| Δ | 327 | 29° | 237–266 |

**8° center gap (266°→274°)**

**Right side** (seats total: 860):
| Zone | Seats | Arc° | Range |
|------|-------|------|-------|
| Ε | 327 | 28° | 274–302 |
| Ζ | 204 | 18° | 304–322 |
| Η | 216 | 18° | 324–342 |
| Θ | 113 | 10° | 344–354 |

Now Δ(29°) ≈ Ε(28°), Β(19°) ≈ Ζ(18°) ≈ Η(18°), and Γ(10°) ≈ Θ(10°) — matching the symmetric horseshoe in the PDF.

### File change
**`src/components/theatre/ZoneOverviewMap.tsx`** — Update `ZONE_ARCS` values (lines 78-87).

No other files affected.

