/**
 * Determines if a business should use the Kaliva-style ticket+reservation linked flow.
 * Businesses with categories 'clubs', 'events', and performance categories automatically use this flow.
 */
const TICKET_LINKED_CATEGORIES = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];

export function isClubOrEventBusiness(categories: string[]): boolean {
  const normalized = categories.map((c) => c.toLowerCase());
  return normalized.some((c) => TICKET_LINKED_CATEGORIES.includes(c));
}

/**
 * Determines if a business is a performance-type business (theatre, music, dance, kids).
 * Used to show "Εισιτήρια" instead of "Κρατήσεις" in the dashboard.
 */
const PERFORMANCE_CATEGORIES = ['theatre', 'music', 'dance', 'kids'];

export function isPerformanceBusiness(categories: string[]): boolean {
  const normalized = categories.map((c) => c.toLowerCase());
  return normalized.some((c) => PERFORMANCE_CATEGORIES.includes(c));
}
