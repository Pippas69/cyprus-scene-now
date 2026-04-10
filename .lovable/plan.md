
## Plan: Actually fix rows Κ and Λ in Section Δ

### What I found
You’re right: the code was changed, but not in a way that produces the visual result we agreed on.

The current file already contains:
- short-row detection (`isShortRow`)
- custom short-row spacing (`shortRowSeatAngle`)
- wheelchair rendering (`♿`)

But the layout still looks wrong because the geometry is still driven by a single centered row arc. So changing the seat angle alone does not properly create:
- the same left starting point as the other rows
- a blank remainder on the right
- row letters staying at the full row width

### What I will change
In `src/components/theatre/ZoneSeatPicker.tsx` I will separate each row into two different geometries:

1. **Full row envelope**
- used for the row background shape
- used for left/right row letters
- keeps the same full width as neighboring rows

2. **Occupied seat segment**
- used only for actual seat placement
- for rows Κ and Λ in Section Δ, it will begin at the same left boundary as the other rows
- it will stop after the real seats, leaving the rest of the row empty on the right

### Implementation steps
1. Refactor `rowLayouts` so each row stores:
- `fullStartDeg` / `fullEndDeg`
- `seatStartDeg`
- `seatStepDeg`
- `isShortRow`

2. For normal rows:
- seats continue to fill the full row as they do now

3. For short rows (Κ and Λ in Section Δ):
- compute the full row width from neighboring rows
- anchor `seatStartDeg` to the same left edge as those rows
- place seats using the neighboring seat density
- stop after 4 seats for Κ and 8 seats for Λ

4. Keep row letters tied to the **full** row envelope, not the occupied seat segment

5. Leave wheelchair rendering unchanged, since that part is already present and correct

6. Build and visually verify against the screenshot so the result matches exactly:
- same left start as adjacent rows
- empty space on the right
- right-side row letter remains at the normal row end

### Technical details
Right now the bug is that `startDeg`/`endDeg` and seat placement are still too coupled.  
The fix is to decouple:
- **visual row boundary**
from
- **actual occupied seat positions**

That is the missing piece.

### Expected result
After this fix:
- Row Λ will start where the other rows start, show only seats 49–56, then remain blank until the row letter
- Row Κ will do the same with the 4 AMEA seats
- The section will keep its proper fan symmetry
