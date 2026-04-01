

## Remove Πλατεία and assign unique colors to all 8 zones

### What's wrong
1. `ZONE_ARCS` in `ZoneOverviewMap.tsx` includes a `'Πλατεία'` entry (line 87) — this zone doesn't exist in the PDF layout. All seats belong to zones Α–Θ only.
2. Zone colors come from the database, and some zones share the same color, making them hard to distinguish.

### Changes

**File: `src/components/theatre/ZoneOverviewMap.tsx`**
- Remove the `'Πλατεία'` entry from `ZONE_ARCS` (line 87)
- That's it — since zones are matched by name from the DB, if there's no `Πλατεία` zone in the DB it won't render anyway, but the arc definition should be cleaned up regardless

**Database migration — update zone colors to be unique:**
Update the `venue_zones` table so each zone has a distinct color:
- Α → `#E91E63` (magenta/pink)
- Β → `#F44336` (red)  
- Γ → `#4CAF50` (green)
- Δ → `#FF9800` (orange)
- Ε → `#2196F3` (blue)
- Ζ → `#795548` (brown)
- Η → `#00BCD4` (cyan)
- Θ → `#9C27B0` (purple)

If a `Πλατεία` zone exists in the database, we should also remove it (or the user can confirm whether it has seats assigned).

### No other files affected
The `SeatSelectionStep.tsx` and `ZoneSeatPicker.tsx` remain unchanged — they already filter by zone and will simply no longer see a Πλατεία zone.

