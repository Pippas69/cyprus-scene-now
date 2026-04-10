

## Plan: Fix 4 seat count and display issues

### What I understood

1. **"Selected 0 of 999" counter** (top-right when inside a section): Shows `maxSeats=999` hardcoded from `ShowInstanceEditor`. Should show the actual seat count of the selected zone.

2. **Zone overview "xxx available"**: Shows `total - sold`, but during production creation (no tickets sold yet), should show the total seat count per zone. Only reduce when seats are actually selected/sold.

3. **Zone Pricing colors and counts**: The zone color dots in the pricing list should match the actual zone colors from the seating plan. The seat count in parentheses already uses `actual_seat_count` from venue_seats, so it should be correct — but need to verify the query isn't hitting the 1000-row limit.

4. **Legend in zone detail view** (Available / Sold / Selected): 
   - "Available" should show actual seat count for that zone
   - "Sold" should be hidden when creating a production (`showInstanceId === '__new__'`)
   - "Selected" shows `1` as static text — should show actual count of selected seats in the zone

### Changes

**File 1: `src/components/theatre/SeatSelectionStep.tsx`**
- Instead of receiving `maxSeats` from parent and showing "0 of 999", compute the zone seat count when `activeZone` is set
- When in zone view, show "Selected: X of {zoneSeatCount}" instead of the global maxSeats
- When in overview, show total selected across all zones

**File 2: `src/components/business/productions/ShowInstanceEditor.tsx`**
- Change `maxSeats={999}` to a large number or remove the cap entirely (house seats shouldn't have a practical limit), OR better: pass the venue total seat count
- Verify the seat count query handles >1000 seats (current limit is 5000, should be fine)

**File 3: `src/components/theatre/ZoneOverviewMap.tsx`**
- The "available" count is `total - sold`. For `__new__` show instances, sold=0, so available=total. This should already be correct. Verify the seat query limit (currently 5000).

**File 4: `src/components/theatre/ZoneSeatPicker.tsx`**
- **Legend**: Replace static "1" numbers with dynamic counts:
  - Available = `seats.length - soldSeatIds.size - zoneSelectedCount`
  - Sold = `soldSeatIds.size` (hide entirely when `showInstanceId === '__new__'`)
  - Selected = count of `selectedSeats` in this zone
- The seat query has `limit(1000)` — needs to be increased to handle zones with >1000 seats (though unlikely for a single zone)

### Technical details

**SeatSelectionStep.tsx** — When `activeZone` is set, fetch or pass the zone's seat count. The simplest approach: have `ZoneSeatPicker` expose the count, or fetch it in `SeatSelectionStep` when a zone is activated. Best approach: pass zone seat count from `ZoneOverviewMap` through `onZoneClick` (it already has `seatCounts`).

**ZoneSeatPicker.tsx legend** (lines 492-513):
```tsx
// Compute counts
const zoneSelectedCount = selectedSeats.filter(s => s.zoneId === zoneId).length;
const availableCount = seats.length - soldSeatIds.size - zoneSelectedCount;
const soldCount = soldSeatIds.size;

// Legend shows dynamic numbers; hide "Sold" when __new__
```

**SeatSelectionStep.tsx counter** (lines 99-116):
- Add `seatCount` to `ActiveZone` interface
- Pass it from `ZoneOverviewMap` via `onZoneClick`
- Show zone-specific count when in zone view

**ShowInstanceEditor.tsx** (line 398):
- Change `maxSeats={999}` to total venue seat count (sum of all zone seats)

