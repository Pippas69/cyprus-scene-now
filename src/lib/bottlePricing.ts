/**
 * Bottle pricing utilities for seating tiers.
 *
 * A seating tier can use one of two pricing modes:
 *  - 'amount' (default): the existing minimum charge in cents (prepaid_min_charge_cents)
 *  - 'bottles': the minimum consumption is N bottles of a given type, paid AT THE VENUE.
 *
 * When pricing_mode === 'bottles' the prepaid_min_charge_cents is forced to 0
 * (no online prepayment for that tier). Stripe / Webhook / Refund / Commission
 * logic remains untouched — they all keep operating on prepaid_min_charge_cents.
 */

export type BottleType = 'bottle' | 'premium_bottle';
export type SeatingTierPricingMode = 'amount' | 'bottles';

export interface BottleTierFields {
  pricing_mode?: SeatingTierPricingMode | null;
  bottle_type?: BottleType | null;
  bottle_count?: number | null;
}

export const isBottleTier = (tier?: BottleTierFields | null): boolean =>
  !!tier && tier.pricing_mode === 'bottles' && !!tier.bottle_type && (tier.bottle_count ?? 0) >= 1;

const labels = {
  el: {
    bottle: 'Μπουκάλι',
    bottlePlural: 'Μπουκάλια',
    premium: 'Premium Bottle',
    premiumPlural: 'Premium Bottles',
    minSpend: 'Ελάχιστη κατανάλωση',
    atVenue: 'στο κατάστημα',
  },
  en: {
    bottle: 'Bottle',
    bottlePlural: 'Bottles',
    premium: 'Premium Bottle',
    premiumPlural: 'Premium Bottles',
    minSpend: 'Minimum spend',
    atVenue: 'at venue',
  },
} as const;

export const formatBottleLabel = (
  bottleType: BottleType,
  count: number,
  language: 'el' | 'en' = 'el'
): string => {
  const l = labels[language];
  const isPremium = bottleType === 'premium_bottle';
  const word = count === 1
    ? (isPremium ? l.premium : l.bottle)
    : (isPremium ? l.premiumPlural : l.bottlePlural);
  return `${count} ${word}`;
};

/**
 * Returns the customer-facing label for a tier:
 *  - bottles mode  → e.g. "2 Premium Bottles"
 *  - amount mode   → e.g. "€100" (formatted)
 */
export const formatTierMinSpend = (
  tier: BottleTierFields & { prepaid_min_charge_cents?: number | null },
  language: 'el' | 'en' = 'el'
): string => {
  if (isBottleTier(tier)) {
    return formatBottleLabel(tier.bottle_type as BottleType, tier.bottle_count as number, language);
  }
  const cents = tier.prepaid_min_charge_cents ?? 0;
  return `€${(cents / 100).toFixed(2)}`;
};

export const minSpendLabel = (language: 'el' | 'en' = 'el') => labels[language].minSpend;
export const atVenueLabel = (language: 'el' | 'en' = 'el') => labels[language].atVenue;

/**
 * Returns a full display string for the minimum consumption,
 * appending "(στο κατάστημα)" / "(at venue)" when bottle mode.
 */
export const formatTierFullLabel = (
  tier: BottleTierFields & { prepaid_min_charge_cents?: number | null },
  language: 'el' | 'en' = 'el'
): string => {
  if (isBottleTier(tier)) {
    const bottle = formatBottleLabel(tier.bottle_type as BottleType, tier.bottle_count as number, language);
    return `${bottle} (${atVenueLabel(language)})`;
  }
  const cents = tier.prepaid_min_charge_cents ?? 0;
  return `€${(cents / 100).toFixed(2)}`;
};
