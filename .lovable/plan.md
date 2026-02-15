
# Fix: QR Card Dark Theme Bug

## Problem
All QR card components (Tickets, Reservations, Offers, Success) use hardcoded light colors for their card design (branded FOMO cards). However, the "QR Εικόνα" download button and other elements inherit dark theme styles from the `outline` button variant (`bg-background`), causing the dark navy text (`text-[#102b4a]`) to become invisible against the dark background.

## Root Cause
The buttons inside QR cards use `variant="outline"` which applies `bg-background` -- in dark mode this is a dark color. The inline className adds `text-[#102b4a]` (dark navy) but the background becomes dark, making text unreadable. The `bg-white/95` on the card body may also become semi-transparent over dark backgrounds.

## Solution
Force all QR card inner content to remain light-themed regardless of the app's dark/light mode. These are branded FOMO cards that should always appear with their light design.

## Files to Update (4 files)

### 1. `src/components/tickets/TicketQRDialog.tsx`
- Change the "QR Εικόνα" button to explicitly use `bg-white` instead of inheriting `bg-background` from the outline variant
- Ensure the card body uses `bg-white` (not `bg-white/95`) or add explicit dark-mode overrides

### 2. `src/components/user/ReservationQRCard.tsx`
- Same button fix: override dark theme on "QR Εικόνα" button

### 3. `src/components/user/OfferQRCard.tsx`
- Same button fix

### 4. `src/components/ui/SuccessQRCard.tsx`
- Same button fix

## Technical Approach
For each file, the download button(s) will be changed from:
```
className="flex-1 border-[#3ec3b7] text-[#102b4a] hover:bg-[#3ec3b7]/10 h-8 text-xs px-2"
```
To include explicit light background overrides:
```
className="flex-1 border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 text-xs px-2"
```

Additionally, the card body `bg-white/95` sections and wave decoration sections will be hardened with `dark:bg-white/95` to prevent dark theme from overriding the card's white appearance. The info grid cells (`bg-[#f0f9ff]`) already use hardcoded colors so they should be fine.

The DialogContent wrapper uses `bg-transparent` which is correct -- the card itself provides all the background.
