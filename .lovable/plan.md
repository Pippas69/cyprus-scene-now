
Goal: Business (and user) push notifications reliably arrive whenever a device is subscribed, by fixing a logic mismatch where the database “push enabled” flag stays `false` even after a successful subscription.

What I found (root cause)
- Your backend logs show:
  - `[WEB-PUSH-CRYPTO] Push disabled for user {"userId":"8170..."}`
  - and the notification function reports `{"sent":0,"failed":0,"skipped":true}`
- The database confirms for your business user:
  - `user_preferences.notification_push_enabled = false`
  - but there IS an active `push_subscriptions` row for that same user.
- In the frontend subscription hook (`src/hooks/usePushNotifications.ts`):
  - `unsubscribe()` explicitly sets `notification_push_enabled` to `false`
  - but `subscribe()` never sets it back to `true`
- In the backend helper (`supabase/functions/_shared/web-push-crypto.ts`):
  - `sendPushIfEnabled()` blocks all sends when `notification_push_enabled === false`, even if a subscription exists.

So you were subscribed at the device level, but the preference flag remained false, causing the backend to skip sending.

Fix strategy
A) Make “Subscribe” explicitly enable pushes in preferences
1) Update `src/hooks/usePushNotifications.ts`:
   - After successfully saving/upserting into `push_subscriptions`, also upsert/update `user_preferences.notification_push_enabled = true`.
   - Use an upsert so it works whether a preferences row exists or not.
   - Keep `unsubscribe()` as-is (it already sets to false).

B) Repair existing users who are currently subscribed but flagged disabled
2) Run a one-time database migration (safe + idempotent) to set:
   - `notification_push_enabled = true` for any `user_id` that has at least one row in `push_subscriptions`.
   This immediately fixes users like your Velora business account without needing manual toggles.

C) Make backend behavior more robust against future mismatches (optional but recommended)
3) Update `supabase/functions/_shared/web-push-crypto.ts`:
   - Adjust the “enabled” logic to avoid false negatives:
     - Option 1 (recommended): Treat users as enabled if they have at least one active subscription, unless they explicitly disabled.
     - Option 2 (minimal): Keep current preference gate, but add a “self-heal” check: if pref is false but subscriptions exist, log a warning and proceed (or flip the pref).
   This is defensive programming to prevent a single missed preference update from killing push delivery again.

Implementation details (files to change)
1) Frontend
- File: `src/hooks/usePushNotifications.ts`
- Change in `subscribe()`:
  - After saving subscription to `push_subscriptions`, do:
    - `upsert({ user_id: userId, notification_push_enabled: true })` into `user_preferences` (or `update` + fallback insert).
  - Ensure errors are handled (if this update fails, we should treat subscription as incomplete and show a clear toast).

2) Database migration (one-time repair)
- Migration SQL concept:
  - Update user_preferences for all users who have push_subscriptions.
  - Also insert missing user_preferences rows (if your schema allows) so users without a row still get enabled.
- This avoids telling you “just toggle it off/on”.

3) Backend shared helper (optional but recommended)
- File: `supabase/functions/_shared/web-push-crypto.ts`
- Change:
  - Strengthen `isUserPushEnabled()` / `sendPushIfEnabled()` decision so “subscription exists” isn’t ignored.

How we’ll verify (step-by-step)
1) Re-test with an explicit push test
- In User Settings, press “Test Push”.
- Expected backend log: it should no longer say “Push disabled for user”.
- Expected response: `sent >= 1` (or `failed` with a real endpoint error if something else is wrong).

2) Re-test with a real business event
- Claim/redeem another offer.
- Check logs for `send-offer-claim-business-notification`:
  - Expect `skipped:false` and `sent:1` (or `failed:1` with detailed reason if delivery fails).

3) If delivery still fails after these fixes
- Next layer checks (we’ll do only if needed):
  - Confirm browser permission state is `granted`
  - Confirm service worker registration scope is correct (`/sw.js`)
  - Confirm the endpoint type (Apple) is receiving encrypted payload correctly (we already see the Apple endpoint in your DB)

Expected outcome after these changes
- Yes, you will get business notifications for offer claims (and ticket sales, etc.) as long as:
  - the device is subscribed and permissions are granted, and
  - the user hasn’t disabled push intentionally.
- Your current issue specifically (Velora business account) will be fixed immediately by the repair migration + the subscribe() preference update, so it won’t regress.

Notes / edge cases covered
- Users who explicitly disable push remain disabled (unsubscribe sets the flag false).
- Users who subscribe on multiple devices remain enabled (flag true, multiple subscription rows).
- If a subscription exists but the pref is false due to a bug or old state, the migration and/or backend hardening resolves it.

After you approve this plan, I will:
- Implement the frontend hook fix,
- Add the backend hardening (recommended),
- Apply the one-time database repair migration,
- Then guide you through a quick “Test Push” verification.

