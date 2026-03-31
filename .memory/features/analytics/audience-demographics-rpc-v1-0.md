# Memory: features/analytics/audience-demographics-rpc-v1-0
Updated: now

The "Πληροφορίες Πελατών" (Customer Information) section uses a secure RPC function `get_audience_demographics` to calculate demographics. This bypasses RLS restrictions that prevent businesses from reading customer profiles directly.

**Data Sources (All customers, not just check-ins):**
1. **Tickets**: `status IN ('valid', 'used')` for events owned by the business
2. **Offer purchases**: any purchase (`status != 'cancelled'`) for offers owned by the business
3. **Reservations**: any reservation (`status != 'cancelled'`) for the business
4. **Student discount redemptions**: for the business

**Demographics Calculation with Fallback:**
- Gender: From `profiles.gender` (registered users) or "other" (manual entries without user_id)
- Age: `COALESCE(profiles.age, tickets.guest_age)` — falls back to ticket guest data if profile is empty
- City: `COALESCE(profiles.city, profiles.town, tickets.guest_city)` — falls back to ticket guest data

**Manual Entries:** Tickets without `user_id` (manual entries by business) are now included. Their `guest_age` and `guest_city` are used directly.

**Security:** The RPC function uses SECURITY DEFINER and verifies business ownership before returning any data. Only aggregated counts are returned, never individual profile data.
