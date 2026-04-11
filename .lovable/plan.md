

## Plan: Revert outer row alignment for all sections except A

### Problem
When fixing Section A's alignment (outer = right-aligned, inner = edge-to-edge), the logic was applied globally to ALL zones. Sections Β, Γ, Δ, Ε, Ζ, Η, Θ now have incorrectly right-aligned outer rows.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change lines 328-339** in the `seatPositions` memo to only apply Section A logic when `zoneName === 'Τμήμα Α'`:

```tsx
// Current (applies to ALL zones):
if (isOuter) {
  angle = fullEndDeg - (rowSeats.length - 1 - seatIdx) * seatStepDeg;
} else {
  angle = fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
}

// Fixed (Section A only):
if (zoneName === 'Τμήμα Α') {
  if (isOuter) {
    angle = fullEndDeg - (rowSeats.length - 1 - seatIdx) * seatStepDeg;
  } else {
    angle = fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
  }
} else {
  // All other sections: uniform left-aligned placement (original behavior)
  angle = fullStartDeg + seatIdx * seatStepDeg;
}
```

### What stays the same
- Section A: outer rows right-aligned, inner rows edge-to-edge (perfect, untouched)
- Section Δ short rows (Κ, Λ): naturally left-aligned because they use the same `seatStepDeg` and stop early
- All geometry constants, smoothing logic, short-row detection, viewBox calculation

### Result
- **Τμήμα Α**: Unchanged (outer right-aligned, inner edge-to-edge)
- **All other sections**: Restored to uniform left-aligned placement as it was before the Section A fix

