
I understand exactly what you mean.

Right now there are three separate problems in the business production-creation flow for Pattihio:

1. The overview horseshoe uses hardcoded arc sizes in `theatreConstants.ts`, so the zone proportions do not reflect the real section widths/capacities.
2. The “available seats” numbers on the overview are computed from whatever seat rows exist in `venue_seats`, and because the underlying seat dataset / layout mapping is still not aligned with the real theatre, those labels are wrong or even show 0.
3. Inside each section, `ZoneSeatPicker.tsx` currently spreads seats evenly across a synthetic arc based only on row length. That preserves row letters and the aisle, but it does not preserve the real row-by-row visual shape of each section.

What I will implement after approval:

1. Fix the business production seat-picker data source
- Re-check the Pattihio `venue_seats` and `venue_zones` data that the production flow reads.
- Confirm the real per-zone counts being returned in the business flow, not just in ticket purchase.
- Remove any mismatch between zone records, seat records, and counts shown in the creation UI.

2. Fix the overview section proportions
- Replace the current fixed `ZONE_ARCS` proportions with Pattihio-specific section spans that match the real venue more closely.
- Keep the same horseshoe concept, same row letters, and same central aisle logic.
- Update the overview labels so each section size visually corresponds to its real section width instead of arbitrary hardcoded spans.

3. Fix wrong availability labels in the overview
- Make the overview counts derive from the actual active seats per zone consistently in the production-creation context.
- Ensure `__new__` instances never incorrectly subtract sold/held seats.
- Verify no zone renders 0 unless that zone truly has no seats.

4. Fix the detailed section layout
- Adjust `ZoneSeatPicker.tsx` so rows are not just evenly distributed along a generic arc.
- Preserve exactly:
  - row letters
  - row placement order
  - the aisle between inner and outer halves
- Update the per-row geometry so Pattihio sections visually match the real layout much more closely, based on the row ranges you provided for all sections.

5. Fix related business UI data
- Update the zone pricing list in `ShowInstanceEditor.tsx` so displayed seat counts come from real active seat totals instead of stale `venue_zones.capacity` values if those capacities are wrong.
- Make sure production creation, house-seat selection, and later ticket inventory all stay consistent.

Files I expect to change
- `src/components/theatre/theatreConstants.ts`
- `src/components/theatre/ZoneOverviewMap.tsx`
- `src/components/theatre/ZoneSeatPicker.tsx`
- `src/components/business/productions/ShowInstanceEditor.tsx`
- possibly data records for Pattihio zone capacities if they are out of sync with actual seats

Technical notes
- The core issue is not just “missing seats in DB”; it is that the business flow is rendering Pattihio with generic geometry.
- The detailed zone view currently calculates seat positions from:
  - row count
  - max seats in row
  - generic arc span
  not from Pattihio-specific section geometry.
- So even with correct row letters and aisle, the visual section shape can still be wrong.
- I will keep the current two-step flow:
  - overview of all zones
  - click into a single zone
- I will not switch to a different seat-map system unless the code inspection proves the current architecture cannot be corrected cleanly.

Expected result
- In production creation, Pattihio will show:
  - correct section proportions in the overview
  - correct available-seat numbers on each zone
  - much more accurate seat layout inside each section
  - unchanged row letters and aisle placement

