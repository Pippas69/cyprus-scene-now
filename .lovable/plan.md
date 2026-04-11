

## Plan: Flip the stage semicircle to curve upward into the horseshoe

### Problem
The current stage path uses SVG arc sweep-flag `0`, which curves the semicircle **downward** (below `CY`). The real stage sits **inside** the horseshoe opening — it should curve **upward** (above `CY`).

### Fix (single file: `src/components/theatre/ZoneOverviewMap.tsx`)

1. **Flip the arc sweep flag** from `0` to `1` in the stage path:
   - Current: `A ${INNER_R} ${INNER_R} 0 0 0 ${CX + INNER_R} ${CY} Z`
   - Fixed: `A ${INNER_R} ${INNER_R} 0 0 1 ${CX + INNER_R} ${CY} Z`

2. **Move the "STAGE" text label** from `y={CY + 30}` to `y={CY - 30}` so it sits centered inside the upward-curving semicircle.

### What stays the same
Everything else — zone arcs, viewBox, click handlers, all other files.

### Result
The stage semicircle will curve upward into the center of the horseshoe, matching the actual theatre layout shown in the screenshot.

