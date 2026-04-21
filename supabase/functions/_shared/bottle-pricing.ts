/**
 * Bottle pricing helper for edge functions (Deno).
 * Mirrors src/lib/bottlePricing.ts but lives here so edge functions can import it.
 *
 * Used to format the "minimum consumption" label in emails and notifications:
 *  - amount mode  → "€100.00"
 *  - bottles mode → "2 Premium Bottles (στο κατάστημα)"
 */

export type BottleType = "bottle" | "premium_bottle";
export type SeatingTierPricingMode = "amount" | "bottles";

export interface BottleTierFields {
  pricing_mode?: SeatingTierPricingMode | string | null;
  bottle_type?: BottleType | string | null;
  bottle_count?: number | null;
  prepaid_min_charge_cents?: number | null;
}

export const isBottleTier = (tier?: BottleTierFields | null): boolean =>
  !!tier &&
  tier.pricing_mode === "bottles" &&
  !!tier.bottle_type &&
  (tier.bottle_count ?? 0) >= 1;

export const formatBottleLabel = (
  bottleType: BottleType | string,
  count: number,
  language: "el" | "en" = "el",
): string => {
  const isPremium = bottleType === "premium_bottle";
  if (language === "en") {
    const word = count === 1
      ? (isPremium ? "Premium Bottle" : "Bottle")
      : (isPremium ? "Premium Bottles" : "Bottles");
    return `${count} ${word}`;
  }
  // Greek locale uses English bottle terminology by design
  const word = count === 1
    ? (isPremium ? "Premium Bottle" : "Bottle")
    : (isPremium ? "Premium Bottles" : "Bottles");
  return `${count} ${word}`;
};

/**
 * Returns the customer-facing min-spend label for a tier.
 * - bottles → "2 Premium Bottles (στο κατάστημα)"
 * - amount  → "€100.00"
 */
export const formatTierMinSpendLabel = (
  tier: BottleTierFields | null | undefined,
  language: "el" | "en" = "el",
): string => {
  if (isBottleTier(tier)) {
    const bottle = formatBottleLabel(
      tier!.bottle_type as BottleType,
      tier!.bottle_count as number,
      language,
    );
    const venueSuffix = language === "en" ? "at venue" : "στο κατάστημα";
    return `${bottle} (${venueSuffix})`;
  }
  const cents = tier?.prepaid_min_charge_cents ?? 0;
  return `€${(cents / 100).toFixed(2)}`;
};

/**
 * Fetch the matched seating_type_tier for a reservation.
 * Returns null if reservation has no seating_type_id, no tiers exist,
 * or the lookup fails (caller should treat as "amount mode" fallback).
 */
export async function fetchReservationTier(
  supabaseClient: any,
  seatingTypeId: string | null | undefined,
  partySize: number,
): Promise<BottleTierFields | null> {
  if (!seatingTypeId) return null;
  try {
    const { data: tiers, error } = await supabaseClient
      .from("seating_type_tiers")
      .select("min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count")
      .eq("seating_type_id", seatingTypeId)
      .order("min_people", { ascending: true });

    if (error || !tiers || tiers.length === 0) return null;

    const matched = tiers.find(
      (t: any) => partySize >= t.min_people && partySize <= t.max_people,
    );
    const fallback =
      matched ??
      [...tiers].reverse().find((t: any) => partySize >= t.min_people) ??
      tiers[0];
    return fallback as BottleTierFields;
  } catch {
    return null;
  }
}
