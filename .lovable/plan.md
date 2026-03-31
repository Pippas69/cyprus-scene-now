
Goal: Rebuild Παττίχειιο exactly from the PDF (not an approximation), and stop the repeated “almost right” geometry issues.

What is wrong now (from your screenshots + current data):
1) Sections are generated from different geometric centers, so they look like islands instead of one continuous amphitheatre.
2) Too many distinct zone colors are shown compared to the PDF.
3) Floating row letters appear because labels are auto-derived from zone+row clusters, including bad/outlier clusters.
4) Seat glyph size vs coordinate spacing makes dense areas look cramped.

Implementation plan (single pass, source-of-truth approach):

1) Lock to the PDF as canonical blueprint
- Use the original PDF as the only reference (not previous generated layouts).
- Extract exact section boundaries and row structure from the PDF.
- Define a canonical blueprint object for this venue (per section: row list, seat count per row, angular span, radius progression, ordering).

2) Regenerate coordinates from one unified geometry
- Use one stage center and one global radius progression for the main bowl.
- Build sections as continuous adjacent angular bands so there are no gaps/islands:
  - Πλατεία inner bowl
  - Δ/Ε outer continuation
  - Γ/Β left continuation
  - Ζ/Η right continuation
  - Α/Θ edge extensions
- Keep exact capacity = 2007 and preserve section totals.
- Remove all existing seats for this venue and insert only the regenerated set.

3) Correct zone color mapping to PDF palette
- Replace current “many unique colors” mapping with the exact reduced palette from the PDF.
- Reuse colors across sections exactly as in the PDF (instead of forcing each section to have a different color).
- Update legend ordering to match visual order in the PDF.

4) Fix row-label rendering (eliminate floating letters)
- Replace current generic row-label logic with stricter rules:
  - label only the largest connected seat cluster for a row
  - require minimum cluster size and minimum arc span
  - suppress labels for tiny/isolated fragments
- For this venue specifically, if any label still lands outside seat mass, hide that label entirely.
- Keep seat details accessible via hover/click tooltip (row/seat/zone), so usability is preserved even with fewer static labels.

5) Improve perceived spacing without breaking capacity
- Tune seat glyph dimensions for high-density venues (smaller chair shape for this venue) so rows remain readable and not visually merged.
- Keep coordinates true to PDF geometry; only visual glyph size adjusts for clarity.

6) Validation before finalizing
- Hard checks:
  - total active seats = 2007
  - per-zone counts match blueprint
  - no isolated single-seat islands outside section hulls
  - no floating row letters
- Visual checks against PDF:
  - one continuous amphitheatre silhouette
  - section joins match PDF
  - color palette matches PDF
  - stage orientation matches PDF

Files/areas to update:
1) New migration:
- delete/reinsert venue_seats for venue b3c3805f-6fb6-4c0e-a6a5-907dfe43b6b7
- update venue_zones colors to PDF-correct palette
2) src/components/theatre/SeatMapViewer.tsx
- robust row-label filtering logic
- venue-aware high-density seat glyph sizing
- legend ordering/color display consistency

Technical details:
- Main bowl coordinates remain trigonometric (x = cx + r cosθ, y = cy - r sinθ), but section boundaries are blueprint-driven and contiguous (no independent per-zone centers).
- “Connected cluster” for labels is computed by seat-neighbor distance in same row; only dominant cluster gets a label anchor.
- Outlier suppression is geometric (cluster size + arc-length + hull containment), not just “count >= 3”.
