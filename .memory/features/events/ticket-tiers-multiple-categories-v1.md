# Memory: features/events/ticket-tiers-multiple-categories-v1
Updated: 2026-01-14

The Event Creation Form now supports **multiple ticket tiers/categories** for ticketed events. The inline ticket configuration fields were replaced with the `TicketTierEditor` component (`src/components/tickets/TicketTierEditor.tsx`).

## Key changes:
1. **FormData structure**: Changed from individual fields (`ticketName`, `ticketPriceCents`, etc.) to a single `ticketTiers: TicketTier[]` array.

2. **TicketTier interface**: Each tier has:
   - `name` (required): Category name (e.g., "General Admission", "VIP")
   - `description` (optional)
   - `price_cents`: Price in cents
   - `quantity_total`: Available tickets for this tier
   - `max_per_order`: Maximum tickets per order
   - `dress_code` (optional): Dress code for this tier

3. **Validation**: Uses `validateTicketTiers()` helper from TicketTierEditor to validate tier names.

4. **Database insert**: Inserts all tiers with proper `sort_order` on event creation.

5. **UI**: The TicketTierEditor provides a clean interface to add/remove tiers with a "+" button, matching the user's request for simplicity.

This allows businesses to create events with multiple ticket categories (e.g., General, VIP, Early Bird) each with different prices, quantities, and dress codes.
