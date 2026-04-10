

## Plan: Add more spacing between seats in Section A

### Problem
The section-wide envelope alignment compresses all rows to the same angular span, but the seats within each row are packed too tightly because the seat angle spacing multiplier (currently `2.05` on line 235) doesn't leave enough gap between circles.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Increase the seat spacing multiplier** on line 235 from `2.05` to `2.4`:

```tsx
// From:
const seatAngleDeg = ((seatRadius * 2.05) / radius) * (180 / Math.PI);
// To:
const seatAngleDeg = ((seatRadius * 2.4) / radius) * (180 / Math.PI);
```

This single constant controls the angular distance between adjacent seat circles. Increasing it from 2.05 to 2.4 adds visible breathing room between seats across all sections uniformly.

### What stays the same
- Envelope alignment logic, short-row logic, smoothing — all untouched
- Only the inter-seat gap changes

