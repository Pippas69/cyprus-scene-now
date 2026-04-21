/**
 * Word-based limit utilities for staff memo / notes inputs.
 * Counts whitespace-separated words and truncates to a maximum.
 */

export const NOTES_MAX_WORDS = 18;

export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Truncate text to a maximum number of words.
 * Preserves trailing whitespace if the user is mid-typing (so they can keep adding spaces),
 * but only when not yet at the limit.
 */
export function limitWords(text: string, maxWords: number = NOTES_MAX_WORDS): string {
  if (!text) return text;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  // Past the limit — keep only the first maxWords words, no trailing space.
  return words.slice(0, maxWords).join(' ');
}
