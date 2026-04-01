

# Add Center Gap Between Zones Δ and Ε

The PDF shows a clear horizontal aisle/gap running through the middle of the horseshoe (at the top center, 270°). Currently Δ ends at 282° and Ε starts at 284° — only a 2° gap, barely visible.

## Change

**File: `src/components/theatre/ZoneOverviewMap.tsx`** — Widen the gap between Δ and Ε to ~6-8° centered on 270°:

- Δ: `260°–266°` (was 260–282, shift end back)
- Ε: `274°–306°` (was 284–306, shift start back)

Wait — that shrinks them too much. Better approach: keep zone sizes but shift them apart symmetrically around 270°:

- Δ: `256°–266°` (ends 4° before center)
- Ε: `274°–296°` (starts 4° after center)

Actually, simplest fix: just increase the gap from 2° to ~8° while keeping the overall layout balanced:

- **Line 82**: Change Δ from `{ startDeg: 260, endDeg: 282 }` → `{ startDeg: 258, endDeg: 276 }`
- **Line 83**: Change Ε from `{ startDeg: 284, endDeg: 306 }` → `{ startDeg: 284, endDeg: 308 }`

This creates an 8° gap (276°→284°) centered around 280° — close to the vertical center line. The zones keep their angular width (~18° and ~24°).

No other files affected.

