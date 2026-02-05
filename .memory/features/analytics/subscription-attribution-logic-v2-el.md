# Memory: features/analytics/subscription-attribution-logic-v2-el
Updated: now

The analytics system (Performance, Promotion Value, Guidance) attributes metrics like 'Profile Visits' and 'New Customers' using interval-based matching logic against the 'business_subscription_plan_history' table. Metrics are categorized as:

- **Επιλεγμένο (Featured)**: Views, interactions, and visits that occurred while the business was on a PAID plan (Basic, Pro, or Elite).
- **Μη Επιλεγμένο (Non-Featured)**: Views, interactions, and visits that occurred while the business was on the FREE plan.

**Key Rule**: The categorization is determined by which plan was active at the EXACT MOMENT of the interaction (view, click, check-in). If a business switches plans multiple times, each metric is attributed to the correct category based on when it happened.

**Downgrade Behavior**: When a subscription is canceled (`canceled_at` is set), the `downgraded_to_free_at` column is automatically synchronized via the `trg_sync_downgraded_to_free_at` trigger. The `append_business_plan_history` trigger then closes the paid interval at that exact timestamp and opens a `free` interval, ensuring analytics reflect the user's intent immediately rather than waiting for the billing period to end.

**Reactivation Behavior**: When `canceled_at` is cleared (subscription reactivated), `downgraded_to_free_at` is also cleared, and the analytics system resumes counting metrics as "Featured" for paid plans.

**Profile Visits**: Specifically combine verified reservation check-ins (`checked_in_at`) and student discount redemptions (`created_at`), filtered by event_id IS NULL for non-event reservations.
