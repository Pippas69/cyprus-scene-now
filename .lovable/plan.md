
Goal

Replace the current “full-seat-map first” theatre picker with a 2-step flow:
1) overview image/map where only zones are clickable
2) zoomed-in seat picker for the chosen zone only

What I understood

Yes, I understand exactly what you want:
- First screen: simple theatre overview that looks like the PDF/layout
- No need for all seats to be visible there
- User clicks a zone (A, B, etc.)
- Then opens a focused seat view for only that zone
- User can select seats in that zone, go back, enter another zone, and keep building the selection

What exists now

- `SeatSelectionStep.tsx` is just a wrapper around `SeatMapViewer`
- `SeatMapViewer.tsx` currently loads all zones + all seats and renders everything in one SVG with pan/zoom
- `TicketPurchaseFlow.tsx` and `ShowInstanceEditor.tsx` both depend on `SelectedSeat` and `onSeatToggle`, so the new UX should preserve that selection contract
- Selected seats are currently stored correctly as seat IDs + zone/row/seat metadata, which is good and can stay

Plan

1. Split the theatre experience into two modes inside the theatre components
- Create a new top-level “zone-first” experience instead of trying to salvage the current all-seats canvas
- Keep the existing seat-selection data shape (`SelectedSeat`) so checkout and house-seat flows continue working

2. Build a clickable zone overview
- Show a simplified static theatre overview based on zones only
- Use large clickable zone regions/cards/overlay shapes instead of individual seats
- Display zone names, colors, and optionally pricing / selected-count per zone
- Make this overview visually resemble the PDF enough to orient the user, without requiring exact seat geometry

3. Build a focused per-zone seat picker
- After clicking a zone, show only that zone’s seats
- Load/filter seats by selected zone and render a simple local seat map/grid/list for that zone
- Keep unavailable / selected states
- Allow selecting multiple seats in that zone, then returning to the zone overview
- Preserve already selected seats from other zones

4. Add clear navigation between the two levels
- Add “Back to zones”
- Show currently active zone
- Show summary of selected seats across all zones
- Make zone switching easy without losing selections

5. Keep compatibility with both existing flows
- Use the new zone-first selector in:
  - `TicketPurchaseFlow.tsx`
  - `ShowInstanceEditor.tsx`
- Do not change checkout payload format or house-seat persistence logic
- Only change how seats are browsed/selected

Likely files to update

- `src/components/theatre/SeatSelectionStep.tsx`
  - turn into the coordinator for overview mode vs zone-detail mode
- `src/components/theatre/SeatMapViewer.tsx`
  - simplify heavily or repurpose as the zone-detail seat renderer
- likely add a new component such as:
  - `src/components/theatre/ZoneOverviewMap.tsx`
  - and possibly a small `ZoneSeatPicker.tsx`

Design approach

- Stop relying on one huge pan/zoom canvas for the entire venue
- Use a much simpler UX:
  - overview = zones only
  - detail = seats of one zone only
- Prefer clarity over geometric perfection
- Reuse backend data already available:
  - `venue_zones`
  - `venue_seats`
  - `show_instance_seats`

Important implementation details

- Zone overview should not depend on exact seat coordinates
- Zone detail should filter seats by `zone_id`
- Selected seats must remain removable from summary chips
- Sold/held seats must still be disabled
- For business house seats (`showInstanceId="__new__"`), zone detail should still work without sold-seat polling
- The current ResizeObserver warning is likely incidental; main redesign should reduce layout stress by removing the giant interactive full-map behavior

Questions that still matter before implementation

I only need you to confirm one product choice:
- For the first screen, do you want:
  1. a stylized clickable theatre diagram that resembles the PDF
  2. a simpler block-based zone layout (cleaner/faster, less pretty)
  3. both: diagram on customer flow, simpler layout on business flow

If you approve this direction, implementation should be much safer than continuing to fight the full-seat-map approach.
