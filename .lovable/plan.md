

## Plan: Restore edge-to-edge fitting for sections Β–Θ

### Problem
Sections Β–Θ were set to left-aligned placement. Before the Section A fix, they used **edge-to-edge** distribution where every row fills the full arc width perfectly.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

Change the `else` branch at line 340-343 from left-aligned to edge-to-edge:

```tsx
// Current (left-aligned):
} else {
  angle = fullStartDeg + seatIdx * seatStepDeg;
}

// Fixed (edge-to-edge, original behavior):
} else {
  angle = fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
}
```

### What stays the same
- **Τμήμα Α**: Completely untouched (outer right-aligned, inner edge-to-edge)
- All geometry constants, smoothing, short-row detection, viewBox

### Result
- **Τμήμα Α**: Unchanged
- **Β, Γ, Δ, Ε, Ζ, Η, Θ**: Every row fills its arc perfectly from edge to edge, no gaps on either side

