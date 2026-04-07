import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface PricingProfile {
  stripe_fee_bearer: 'buyer' | 'business';
  platform_revenue_enabled: boolean;
  revenue_model: 'commission' | 'fixed_fee';
  commission_percent: number;
  fixed_fee_bearer: 'buyer' | 'business';
  fixed_fee_ticket_cents: number;
  fixed_fee_reservation_cents: number;
  fixed_fee_hybrid_ticket_cents: number;
  fixed_fee_hybrid_reservation_cents: number;
}

// Default profile when none is configured
const DEFAULT_PROFILE: PricingProfile = {
  stripe_fee_bearer: 'buyer',
  platform_revenue_enabled: false,
  revenue_model: 'commission',
  commission_percent: 0,
  fixed_fee_bearer: 'business',
  fixed_fee_ticket_cents: 0,
  fixed_fee_reservation_cents: 0,
  fixed_fee_hybrid_ticket_cents: 0,
  fixed_fee_hybrid_reservation_cents: 0,
};

export type EventType = 'ticket' | 'reservation' | 'hybrid';

export interface PricingCalculation {
  // What the customer pays (total)
  customerPaysCents: number;
  // What goes to the business
  businessReceivesCents: number;
  // What ΦΟΜΟ keeps (application_fee_amount for Stripe)
  applicationFeeCents: number;
  // Stripe processing fee amount
  stripeFeeCents: number;
  // ΦΟΜΟ revenue portion
  fomoRevenueCents: number;
  // Whether to add a processing fee line item
  addProcessingFeeLineItem: boolean;
  processingFeeLineItemCents: number;
  // Whether to add a platform fee line item (when buyer pays fixed fee)
  addPlatformFeeLineItem: boolean;
  platformFeeLineItemCents: number;
  // Profile used
  profile: PricingProfile;
}

/**
 * Fetch the pricing profile for a business.
 * Uses service_role client to bypass RLS.
 */
export async function fetchPricingProfile(businessId: string): Promise<PricingProfile> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from('business_pricing_profiles')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error || !data) {
    console.log(`[PRICING] No pricing profile for business ${businessId}, using defaults`);
    return DEFAULT_PROFILE;
  }

  console.log(`[PRICING] Loaded profile for business ${businessId}`, JSON.stringify({
    stripe_fee_bearer: data.stripe_fee_bearer,
    platform_revenue_enabled: data.platform_revenue_enabled,
    revenue_model: data.revenue_model,
    commission_percent: data.commission_percent,
    fixed_fee_bearer: data.fixed_fee_bearer,
  }));

  return data as PricingProfile;
}

/**
 * Calculate all fees based on the business pricing profile.
 * 
 * @param subtotalCents - The base price (ticket price × quantity, or prepaid amount)
 * @param profile - The business pricing profile
 * @param eventType - ticket, reservation, or hybrid
 * @param ticketCount - Number of tickets (for per-ticket fixed fees)
 * @param reservationCount - Number of reservations (for per-reservation fixed fees), usually 1
 */
export function calculatePricing(
  subtotalCents: number,
  profile: PricingProfile,
  eventType: EventType,
  ticketCount: number = 1,
  reservationCount: number = 1,
): PricingCalculation {
  if (subtotalCents <= 0) {
    return {
      customerPaysCents: 0,
      businessReceivesCents: 0,
      applicationFeeCents: 0,
      stripeFeeCents: 0,
      fomoRevenueCents: 0,
      addProcessingFeeLineItem: false,
      processingFeeLineItemCents: 0,
      addPlatformFeeLineItem: false,
      platformFeeLineItemCents: 0,
      profile,
    };
  }

  // 1. Calculate ΦΟΜΟ revenue
  let fomoRevenueCents = 0;
  if (profile.platform_revenue_enabled) {
    if (profile.revenue_model === 'commission') {
      fomoRevenueCents = Math.round(subtotalCents * profile.commission_percent / 100);
    } else {
      // Fixed fee based on event type
      switch (eventType) {
        case 'ticket':
          fomoRevenueCents = profile.fixed_fee_ticket_cents * ticketCount;
          break;
        case 'reservation':
          fomoRevenueCents = profile.fixed_fee_reservation_cents * reservationCount;
          break;
        case 'hybrid':
          fomoRevenueCents = 
            (profile.fixed_fee_hybrid_ticket_cents * ticketCount) + 
            (profile.fixed_fee_hybrid_reservation_cents * reservationCount);
          break;
      }
    }
  }

  // 2. Determine what gets added to the customer price
  let customerExtraCents = 0;
  let addPlatformFeeLineItem = false;
  let platformFeeLineItemCents = 0;

  // If fixed_fee and buyer pays → add to customer price as line item
  if (profile.platform_revenue_enabled && 
      profile.revenue_model === 'fixed_fee' && 
      profile.fixed_fee_bearer === 'buyer') {
    customerExtraCents += fomoRevenueCents;
    addPlatformFeeLineItem = true;
    platformFeeLineItemCents = fomoRevenueCents;
  }

  // 3. Calculate Stripe processing fees
  // Stripe charges 2.9% + €0.25 on the TOTAL amount charged to the customer
  const amountBeforeStripeFee = subtotalCents + customerExtraCents;
  const stripeFeeCents = Math.ceil(amountBeforeStripeFee * 0.029 + 25);

  // If buyer pays Stripe fees → add as line item
  let addProcessingFeeLineItem = false;
  let processingFeeLineItemCents = 0;
  if (profile.stripe_fee_bearer === 'buyer') {
    customerExtraCents += stripeFeeCents;
    addProcessingFeeLineItem = true;
    processingFeeLineItemCents = stripeFeeCents;
  }

  const customerPaysCents = subtotalCents + customerExtraCents;

  // 4. Calculate application_fee_amount (what Stripe keeps for the platform)
  // With Stripe Connect destination charges, the Stripe processing fee is
  // deducted from the platform's share. Therefore, application_fee_amount
  // MUST always include the Stripe fee so the platform can cover it.
  // 
  // - Buyer pays Stripe fees: fee is collected as a line item AND included
  //   in application_fee (platform breaks even on Stripe fees)
  // - Business pays Stripe fees: fee is NOT a line item but IS included
  //   in application_fee (deducted from business's share via application_fee)
  let applicationFeeCents = stripeFeeCents; // Always include Stripe fee

  if (profile.platform_revenue_enabled) {
    // ΦΟΜΟ revenue is always part of application_fee regardless of model
    applicationFeeCents += fomoRevenueCents;
  }

  // Business receives = total charged - application_fee
  // (Stripe deducts its processing fee from the platform's portion of application_fee)
  const businessReceivesCents = customerPaysCents - applicationFeeCents;

  console.log(`[PRICING] Calculation result`, JSON.stringify({
    subtotalCents,
    eventType,
    ticketCount,
    reservationCount,
    stripeFeeCents,
    stripeFeeBearer: profile.stripe_fee_bearer,
    fomoRevenueCents,
    revenueModel: profile.revenue_model,
    customerPaysCents,
    applicationFeeCents,
    businessReceivesCents,
  }));

  return {
    customerPaysCents,
    businessReceivesCents,
    applicationFeeCents,
    stripeFeeCents,
    fomoRevenueCents,
    addProcessingFeeLineItem,
    processingFeeLineItemCents,
    addPlatformFeeLineItem,
    platformFeeLineItemCents,
    profile,
  };
}
