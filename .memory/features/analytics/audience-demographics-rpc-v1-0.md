# Memory: features/analytics/audience-demographics-rpc-v1-0
Updated: now

The "Κοινό που επισκέφθηκε το μαγαζί" (Audience Demographics) section uses a secure RPC function `get_audience_demographics` to calculate demographics. This bypasses RLS restrictions that prevent businesses from reading customer profiles directly.

**Data Sources (Visits):**
1. **Ticket check-ins**: `tickets.checked_in_at IS NOT NULL` for events owned by the business
2. **Offer redemptions**: `offer_purchases.redeemed_at IS NOT NULL` for discounts owned by the business
3. **Reservation check-ins**: `reservations.checked_in_at IS NOT NULL` for reservations at the business

**Demographics Calculation:**
- Gender: Derived from `profiles.gender` with support for EN/EL values (male/m/άνδρας, female/f/γυναίκα)
- Age: Derived from `profiles.age` field, grouped into buckets (18-24, 25-34, 35-44, 45-54, 55+, Άγνωστο)
- Region: Derived from `profiles.city` or `profiles.town`

**Weighted Counting:** Each visit counts individually. If a user visits 3 times, their demographics count 3 times toward totals.

**Security:** The RPC function uses SECURITY DEFINER and verifies business ownership before returning any data. Only aggregated counts are returned, never individual profile data.

Rationale: Direct queries to profiles table fail due to RLS ("Users can view their own profile" policy), so server-side aggregation is required.
