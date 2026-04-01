

# Add Zone-First Seat Selection to Production Management

## What we're building
Replace the old flat seat map (`SeatMapViewer`) in the production creation form's "House Seats" section with the same two-step zone-first flow (ZoneOverviewMap → ZoneSeatPicker) that customers use when purchasing tickets. This gives theatre staff a consistent, intuitive experience for reserving seats for crew, press, sponsors, etc.

## Changes

### 1. Update `ShowInstanceEditor.tsx`
- Replace the `SeatMapViewer` import with `SeatSelectionStep` (from `src/components/theatre/SeatSelectionStep.tsx`)
- The `SeatSelectionStep` component already accepts `venueId`, `showInstanceId`, `maxSeats`, `selectedSeats`, and `onSeatToggle` — the same props currently passed to `SeatMapViewer`
- Pass `eventTitle` as the zone/instance label and `eventDate` as a descriptive string (e.g. the show date)
- This gives staff the same horseshoe overview → zone drill-down → seat pick flow

### 2. No other files affected
The `SeatSelectionStep`, `ZoneOverviewMap`, and `ZoneSeatPicker` components are already fully functional and reusable. The `showInstanceId="__new__"` value is already handled correctly (skips sold-seat queries).

## Technical details
- **File**: `src/components/business/productions/ShowInstanceEditor.tsx`
  - Remove `SeatMapViewer` import, add `SeatSelectionStep` import
  - Replace the `<SeatMapViewer>` JSX block (lines ~377-383) with `<SeatSelectionStep>` using the same props
  - The `maxSeats={999}` and `onSeatToggle` logic remain unchanged

