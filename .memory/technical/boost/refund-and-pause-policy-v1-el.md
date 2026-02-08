# Memory: technical/boost/refund-and-pause-policy-v1-el
Updated: now

The boost pause and deactivation policy differs by subscription plan:

**Pause Logic (All Plans):**
- Elapsed time is rounded UP to the nearest unit (hour/day) before calculating remaining time
- Remaining time is "frozen" and stored on the boost record
- Frozen time is displayed in the Boost Management UI (corner of the section)
- Users can RESUME paused boosts directly (un-pause)
- When creating NEW boosts, a pop-up asks "Do you want to use frozen time?" to opt-in

**Deactivation Logic by Plan:**

1) **Free Plan**: Deactivation forfeits ALL remaining value. No refund, no credits returned.

2) **Paid Plans (Basic, Pro, Elite) - Credits Only**: Deactivation triggers pro-rata refund. Unused value is calculated and returned to `monthly_budget_remaining_cents`.

3) **Paid Plans - Stripe Top-up (Hybrid)**: If a subscriber paid extra via Stripe after exhausting credits, upon deactivation ALL remaining value (regardless of funding source) is converted to credits and added to `monthly_budget_remaining_cents`. No Stripe refunds occur.

**Monthly Reset:**
- Frozen time that was converted to `monthly_budget_remaining_cents` DOES reset at month-end like normal budget
- This matches the standard subscription cycle behavior

**Sold Out Exception:**
- Boosts for sold-out items show red "Εξαντλήθηκε" badge
- Cannot be resumed or reactivated
