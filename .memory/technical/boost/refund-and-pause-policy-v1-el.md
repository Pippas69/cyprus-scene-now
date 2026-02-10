# Memory: technical/boost/refund-and-pause-policy-v1-el
Updated: now

The boost deactivation policy differs by subscription plan. There is NO pause functionality — only deactivation.

**Deactivation Logic by Plan:**

1) **Free Plan**: Deactivation forfeits ALL remaining value. No refund, no credits returned. A warning disclaimer is shown at all boost creation points.

2) **Paid Plans (Basic, Pro, Elite) - Credits Only**: Deactivation triggers pro-rata refund. Unused value is calculated and returned to `monthly_budget_remaining_cents`.

3) **Paid Plans - Stripe Top-up (Hybrid)**: If a subscriber paid extra via Stripe after exhausting credits, upon deactivation ALL remaining value (regardless of funding source) is converted to credits and added to `monthly_budget_remaining_cents`. No Stripe refunds occur.

**Monthly Reset:**
- Credits returned from deactivation DO reset at month-end like normal budget
- This matches the standard subscription cycle behavior

**Post-Deactivation:**
- Deactivated boosts are permanent — cannot be reactivated or modified
- They appear in the "Expired" history section as read-only (no action buttons)
- The boost immediately loses its "Boosted" visibility in feed/events
- To boost again, users must create a new boost from scratch
