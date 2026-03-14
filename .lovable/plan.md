

# Fix: Stripe Connect Business Type Selection

## Problem
The `create-connect-account` edge function hardcodes `business_type: "company"`, which forces Stripe to require a company registration number (HE number) during onboarding. Many of your clients are individuals/sole proprietors without formal registration in Cyprus.

## Solution
Add a business type selection step before initiating Stripe Connect onboarding. The business chooses whether they are an **Individual** or a **Registered Company**, and we pass the correct `business_type` to Stripe.

## Changes

### 1. Frontend — `StripeConnectOnboarding.tsx`
- Add a selection UI (two cards/buttons) before the "Connect Bank Account" button:
  - **Ιδιώτης / Individual** — "Δεν έχω εγγεγραμμένη εταιρεία. Θα χρειαστώ μόνο ταυτότητα, διεύθυνση και IBAN."
  - **Εγγεγραμμένη Εταιρεία / Registered Company** — "Έχω αριθμό εγγραφής εταιρείας (HE) στην Κύπρο."
- Store the selection in component state
- Pass `business_type` as a body parameter when invoking `create-connect-account`
- Update the "What you'll need" checklist dynamically based on selection (individuals don't need business registration info)

### 2. Edge Function — `create-connect-account/index.ts`
- Parse `business_type` from the request body (default to `"individual"` if not provided)
- Pass it to `stripe.accounts.create()`:
  ```
  business_type: businessType,  // "individual" or "company"
  ```
- This single change means Stripe's hosted onboarding will adapt its form fields automatically — individuals won't be asked for company registration numbers

### 3. Translations
- Add Greek/English labels for the new selection UI in the existing `translations` object

No database changes needed — Stripe handles the rest based on the `business_type` parameter.

