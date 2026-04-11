

## Plan: Fix stage position and size in the zone overview map

### Problem
The stage semicircle is currently drawn as a small ellipse (`A 90 60`) positioned below the center point (`CY + 20`). Looking at the screenshot with the white outline, the stage should fill the **entire inner area** of the horseshoe — matching the `INNER_R = 100` radius — not be a small shape tucked underneath.

### Fix (single file: `src/components/theatre/ZoneOverviewMap.tsx`)

Replace the current small stage semicircle path:
```
M ${CX - 90} ${CY + 20} A 90 60 0 0 0 ${CX + 90} ${CY + 20} Z
```

With a proper semicircle that fills the inner horseshoe area, using `INNER_R` (100):
```
M ${CX - INNER_R} ${CY} A {INNER_R} {INNER_R} 0 0 0 ${CX + INNER_R} ${CY} Z
```

This draws a semicircle from the left edge to the right edge of the inner arc boundary, curving downward to fill the hollow center of the horseshoe — exactly where the white outline indicates the stage should be.

Also adjust the "STAGE" text label `y` position from `CY + 10` to `CY + 30` so it sits centered inside the larger semicircle.

### What stays the same
- All zone arcs, viewBox, labels, click handlers — untouched
- FullscreenSeatSelector, SeatSelectionStep — no changes
- theatreConstants — unchanged

### Result
The stage fills the inner opening of the horseshoe as it does in the real theatre layout, matching the user's white-outline reference.

