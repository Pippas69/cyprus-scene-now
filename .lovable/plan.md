

## Plan: Update Stripe Express Account Emails (One-Time)

### Safety Confirmation
- Platform account: `acct_1SXnhgHTQ1AOHDjn` (ΦΟΜΟ) — **will NOT be touched**
- The `stripe.accounts.update(accountId, ...)` API only modifies the specific connected account passed as parameter
- The two target account IDs are completely different from the platform ID

### What Will Happen

| Business | Stripe Account | New Email |
|----------|---------------|-----------|
| Σουαρέ | `acct_1THRjZHypfryVi4W` | `nikiforou.p@gmail.com` |
| Test Account | `acct_1TG3EuHX5s2fjV6x` | `rami@fomo.com.cy` |

### Steps

**Step 1: Fix build error**
Revert `bun.lock` to its previous working state to resolve the 429 npm cache errors.

**Step 2: Create one-time edge function**
File: `supabase/functions/update-connect-emails/index.ts`
- Hardcoded mapping of the 2 account IDs → new emails
- Uses `stripe.accounts.update(accountId, { email: newEmail })` for each
- No auth required (one-time admin use)
- Returns JSON report of results

**Step 3: Deploy, invoke, verify**
- Deploy the edge function
- Call it via curl
- Confirm both emails updated successfully in the response

**Step 4: Clean up**
- Delete the edge function after successful execution
- Remove the file from codebase

### Technical Detail
The `stripe.accounts.update()` call requires the connected account ID as the first parameter. It updates ONLY that sub-account's properties. There is no way this call can affect the platform account — the Stripe API enforces this by design.

