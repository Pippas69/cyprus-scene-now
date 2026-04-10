

## Plan: Align rows Κ & Λ with Row M

### Problem
The short-row envelope width is based on `maxNearby` (max of ±2 rows), which picks up rows wider than the immediate neighbor M. This makes Κ/Λ slightly wider than M, pushing their seats left and their right-side letters outward.

### Fix (single file: `src/components/theatre/ZoneSeatPicker.tsx`)

**Change `getReferenceCount` for short rows** to use the **closest non-short neighbor's count** instead of the max across ±2 rows. For Κ and Λ, this means using M's count (18) as the envelope reference, not Ν(19) or Ξ(20).

Specifically, modify the logic around line 234-238:
- After detecting `isShortRow`, find the nearest row in the same section that is NOT a short row
- Use that row's smoothed count as `fullEnvelopeCount` instead of `maxNearby`
- This makes Κ/Λ's arc width match M's exactly, aligning seats on the left and row letters on the right

### What stays the same
- Short row detection threshold (60%)
- Seat placement logic (start from left, use `seatStepDeg`)
- All other rows unaffected

### Expected result
- Κ and Λ seats align with M's left edge
- Κ and Λ right-side letters align with M, Ν, Ξ, etc.

