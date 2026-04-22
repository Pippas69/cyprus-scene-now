/**
 * Centralized seating type translations
 * Maps seating type values (DB or raw) to localized display labels.
 *
 * The DB may contain values like: "table", "Table", "Τραπέζι", "sofa", "Καναπές",
 * "vip", "VIP", "bar", "Bar", or any custom label. This utility ensures the UI
 * displays the correct localized label regardless of how the value is stored.
 */

type Language = 'el' | 'en';

const SEATING_MAP: Record<string, { el: string; en: string }> = {
  // Table variants
  table: { el: 'Τραπέζι', en: 'Table' },
  'τραπέζι': { el: 'Τραπέζι', en: 'Table' },
  // Sofa variants
  sofa: { el: 'Καναπές', en: 'Sofa' },
  'καναπές': { el: 'Καναπές', en: 'Sofa' },
  couch: { el: 'Καναπές', en: 'Sofa' },
  // VIP
  vip: { el: 'VIP', en: 'VIP' },
  // Bar
  bar: { el: 'Bar', en: 'Bar' },
  'μπαρ': { el: 'Bar', en: 'Bar' },
  // Booth
  booth: { el: 'Booth', en: 'Booth' },
  // Standing
  standing: { el: 'Όρθιοι', en: 'Standing' },
  'όρθιοι': { el: 'Όρθιοι', en: 'Standing' },
};

/**
 * Translates a seating type value into the requested language.
 * Falls back to the original raw value if not recognized.
 */
export const translateSeatingType = (
  raw: string | null | undefined,
  language: Language
): string => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();
  const entry = SEATING_MAP[key];
  if (entry) return entry[language];
  return trimmed; // unknown / custom label — show as-is
};
