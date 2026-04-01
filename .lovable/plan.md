

# Fix Zone Proportions to Match PDF

## Problem
The angular sizes of zones don't match their actual seat counts. For example, Δ (327 seats) and Ε (327 seats) should be equal in size but currently Δ is 18° and Ε is 24°. Similarly Β and Ζ (both 204 seats) differ in width.

## Solution
Recalculate all zone arcs proportionally based on seat counts, with 2° gaps between adjacent zones and the existing 8° center gap between Δ and Ε.

**File: `src/components/theatre/ZoneOverviewMap.tsx`** — Update `ZONE_ARCS` (lines 78-87):

**Left side** (190°→276°, 86° total, minus 6° for 3 inter-zone gaps = 80° usable):
| Zone | Seats | Arc° | Range |
|------|-------|------|-------|
| Α | 171 | 17° | 190–207 |
| Β | 204 | 20° | 209–229 |
| Γ | 109 | 11° | 231–242 |
| Δ | 327 | 32° | 244–276 |

**8° center gap (276°→284°)**

**Right side** (284°→358°, 74° total, minus 6° for 3 gaps = 68° usable):
| Zone | Seats | Arc° | Range |
|------|-------|------|-------|
| Ε | 327 | 26° | 284–310 |
| Ζ | 204 | 16° | 312–328 |
| Η | 216 | 17° | 330–347 |
| Θ | 113 | 9° | 349–358 |

Now Δ and Ε are visually the largest (matching their 327 seats), Α/Θ and Γ are the smallest, and Β/Ζ/Η are mid-sized — matching the PDF proportions.

No other files changed.

