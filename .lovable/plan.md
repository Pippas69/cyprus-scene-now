
Fix the zone detail view in two layers so it matches the agreed concept without another accidental layout rewrite.

1. Confirm the real root cause
- The current `ZoneSeatPicker` is only rendering rows that exist in `venue_seats`.
- I checked the stored seat data and several zones are actually incomplete in the backend:
  - Τμήμα Α: only Ι→Σ
  - Τμήμα Β / Ζ / Η: only Γ→Ξ
  - Τμήμα Γ: only Ε→Ξ
  - Τμήμα Δ / Ε: only Κ→Σ
  - Τμήμα Θ: only Ι→Ρ
- So this is not just a front-end ordering bug. Missing rows are missing from the actual seat records.

2. Front-end fix in `src/components/theatre/ZoneSeatPicker.tsx`
- Keep the current two-section concept and overall look.
- Stop deriving the visible row scaffold from `rowGroups.length`.
- Always build the zone layout from the full agreed row sequence for every zone:
  - Outer section: Σ → Ρ → Π → Ο → Ξ → Ν → Μ → Λ → Κ
  - Gap
  - Inner section: Ι → Θ → Η → Ζ → Ε → Δ → Γ → Β → Α
- Map real seat rows onto that fixed 18-row scaffold.
- For rows that currently have no seat records, still render the row label and arc position so the structure stays consistent across zones.
- Render seats only where data exists, but preserve the empty row bands so the missing rows are obvious and the gap stays in the correct place.
- Increase row/seat spacing a bit more while keeping the current geometry, since you said seats are still too close.

3. Data fix in the backend
- Add the missing `venue_seats` rows so every theatre zone has the full 18-row structure the UI now expects.
- Use the screenshots and the existing seat-count pattern per zone as the source of truth for which row labels and seat counts belong in each zone.
- Regenerate/update coordinates for the newly added seat records so they align with the existing horseshoe layout.

4. Guard against future breakage
- Add a small normalization layer in `ZoneSeatPicker` so row ordering never depends on SQL/string sort.
- Ensure the gap is always placed only between Κ and Ι, never based on which rows happen to exist.
- Make sure section background paths and row labels are driven by the fixed scaffold, not by partial data arrays.

5. Validation after implementation
- Verify each zone shows all 18 row labels in the exact agreed order.
- Verify the visual split is always:
  - Σ Ρ Π Ο Ξ Ν Μ Λ Κ
  - gap
  - Ι Θ Η Ζ Ε Δ Γ Β Α
- Verify seat counts in each row against the uploaded screenshots, especially Τμήμα Γ.
- Verify the layout still scrolls correctly and feels tappable on mobile.

Technical details
- Main file to update: `src/components/theatre/ZoneSeatPicker.tsx`
- Additional work required: backend seat-data migration for `venue_seats`
- Important finding: if only the component is changed, the UI can show all 18 row positions, but it cannot invent the missing seats. To truly fix “where are the rest of the rows”, the seat dataset must be completed as well.
