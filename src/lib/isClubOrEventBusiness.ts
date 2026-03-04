/**
 * Determines if a business should use the Kaliva-style ticket+reservation linked flow.
 * Businesses with categories 'clubs' and/or 'events' automatically use this flow.
 */
export function isClubOrEventBusiness(categories: string[]): boolean {
  const normalized = categories.map((c) => c.toLowerCase());
  return normalized.some((c) => c === 'clubs' || c === 'events');
}
