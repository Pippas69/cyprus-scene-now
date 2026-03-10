/**
 * Categories that should NOT see Offers anywhere in the dashboard.
 * Clubs, Events, and Performance categories (theatre, music, dance, kids).
 */
const NO_OFFERS_CATEGORIES = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];

export function shouldHideOffers(categories: string[]): boolean {
  const normalized = categories.map((c) => c.toLowerCase());
  return normalized.some((c) => NO_OFFERS_CATEGORIES.includes(c));
}
