

# Theatre Seating Plan — Corrections & Modal Size

## What You're Telling Me

1. **The overall horseshoe design is good** — keep it as-is
2. **Seat counts per section are wrong** — you'll send me detailed screenshots of each section individually so I can match the exact number of seats per row per zone
3. **The seat selection window is too small** — needs to be bigger

## What I'll Do Now (Before Your Screenshots)

### 1. Make the Seat Selection Dialog Bigger

Currently the dialog uses `max-w-2xl` (672px) on desktop when showing seats. I'll increase this to `max-w-4xl` (896px) or even `max-w-5xl` (1024px) so the seat map has room to breathe. On mobile, I'll also increase from `85vh` to `90vh` height.

**File:** `src/components/tickets/TicketPurchaseFlow.tsx` (lines 1128 and 1113)

Also in the business dashboard's `ShowInstanceEditor.tsx`, the seat map container has no explicit size constraints — I'll ensure it also gets adequate space.

### 2. Wait for Your Screenshots to Fix Seat Data

Once you send me the screenshots of each section (Τμήμα Α through Θ), I'll:
- Count the exact seats per row per zone from your screenshots
- Update the `venue_seats` database entries to match the real Pattihio layout
- Ensure row labels (Α-Σ) and seat numbers are correct for each zone

## What Won't Change
- The horseshoe zone overview design
- The curved arc seat rendering within each zone
- The zone colors, legends, zoom/pan behavior
- Row label positions and ordering

## Next Step

Send me the screenshots of each section whenever you're ready, and I'll update the seat data to match exactly.

