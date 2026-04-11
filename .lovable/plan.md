

## Plan: Fullscreen Seat Selection on Mobile

### Problem
On mobile, the seat selection map (both for ticket buyers and business owners selecting house seats) is crammed inside a small dialog/container, making it nearly impossible to tap individual seats in a 2,000+ seat theatre layout.

### Solution
When on mobile, open the seat selection step in a **fullscreen overlay** that takes 100% of the screen, giving users maximum space to pan, zoom, and tap seats. A sticky header shows the zone name and selection count, and a sticky footer shows the selected seats and navigation buttons.

### Changes

**1. Create `src/components/theatre/FullscreenSeatSelector.tsx`**
- A new wrapper component that renders `SeatSelectionStep` inside a fullscreen fixed overlay (`fixed inset-0 z-50 bg-background`)
- Sticky top bar: zone name, back button, selected count
- Sticky bottom bar: selected seat chips + Done button
- Only used when `isMobile` is true

**2. Update `src/components/tickets/TicketPurchaseFlow.tsx`**
- On the seat selection step, when `isMobile`: instead of rendering `SeatSelectionStep` inline inside the dialog, open the `FullscreenSeatSelector` overlay
- The dialog stays open underneath; the fullscreen overlay sits on top
- When user taps "Done", close the fullscreen overlay and return to the dialog flow
- On desktop: no change, keep current inline rendering with `max-w-5xl`

**3. Update `src/components/business/productions/ShowInstanceEditor.tsx`**
- Same pattern: when `isMobile` and showing the seat map, render `FullscreenSeatSelector` instead of the inline `SeatSelectionStep`
- Add a "Select Seats" button that opens the fullscreen overlay
- Selected seats summary shown inline after closing

### Technical Details
- Uses `useIsMobile()` hook (already exists)
- The fullscreen overlay uses `fixed inset-0 z-[60]` to sit above dialogs (z-50)
- SVG seat map inside gets full viewport height minus header/footer (~calc(100dvh - 120px))
- No changes to `ZoneSeatPicker`, `ZoneOverviewMap`, or `SeatMapViewer` internals
- Bilingual support (el/en) for all new UI text

