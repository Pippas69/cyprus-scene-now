

## Plan: Fix Row K referencing wrong neighbor

### Problem
Row K (4 seats) finds Row Λ (8 seats) as its "nearest non-short neighbor" because the threshold check `nc >= rowSeats.length / 0.6` evaluates to `nc >= 6.67`. Λ passes this check (8 >= 6.67), but Λ is itself a short row. K should reference Row M (18 seats) instead.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change the neighbor qualification check on line 246** from:
```
nc >= rowSeats.length / 0.6
```
to:
```
nc >= maxNearby * 0.6
```

This means a neighbor only qualifies as "non-short" if it has at least 60% of the section's max nearby count — the same threshold used for short-row detection. For Section Δ outer, `maxNearby` is ~20, so the threshold becomes ~12. Row Λ (8) fails, Row M (18) passes. Both K and Λ will reference M.

### What stays the same
- Everything else: short-row detection, seat placement, all other rows

