

## Plan: Left-align short outer rows in Section Δ

### Problem
Rows Κ (4 seats) and Λ (8 seats) in Τμήμα Δ are stretched edge-to-edge across the full arc, making them look unnaturally spaced. They should start from the left and end early, with blank space on the right.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change the else branch at lines 340-343** to add a special case for Section Δ outer short rows:

```tsx
} else if (zoneName === 'Τμήμα Δ' && isOuter && isShortRow) {
  // Section Δ outer short rows: left-aligned, same spacing as full rows
  angle = fullStartDeg + seatIdx * seatStepDeg;
} else {
  // All other sections/rows: edge-to-edge distribution
  angle = fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
}
```

### What stays the same
- **Τμήμα Α**: Completely untouched
- **All other sections**: Edge-to-edge distribution unchanged
- **Inner rows of Τμήμα Δ**: Edge-to-edge, unchanged
- **Full-length outer rows of Τμήμα Δ (Σ, Ρ, Π, etc.)**: Edge-to-edge, unchanged

### Result
- Κ and Λ start at the same left edge as all rows, use uniform spacing, and stop early leaving blank space on the right

