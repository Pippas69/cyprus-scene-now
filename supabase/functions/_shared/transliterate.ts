/**
 * Transliterate Greek characters to Latin and sanitize for Stripe statement descriptors.
 * Stripe only accepts: A-Z, a-z, 0-9, spaces, and some symbols.
 * Max suffix length: 22 characters.
 */

// Common Greek digraphs that need special handling (order matters - check longer first)
const GREEK_DIGRAPHS: [string, string][] = [
  ['ΟΥ', 'OU'], ['Ου', 'Ou'], ['ου', 'ou'],
  ['ΑΥ', 'AV'], ['Αυ', 'Av'], ['αυ', 'av'],
  ['ΕΥ', 'EV'], ['Ευ', 'Ev'], ['ευ', 'ev'],
  ['ΑΙ', 'AI'], ['Αι', 'Ai'], ['αι', 'ai'],
  ['ΕΙ', 'EI'], ['Ει', 'Ei'], ['ει', 'ei'],
  ['ΟΙ', 'OI'], ['Οι', 'Oi'], ['οι', 'oi'],
  ['ΜΠ', 'B'], ['Μπ', 'B'], ['μπ', 'b'],
  ['ΝΤ', 'D'], ['Ντ', 'D'], ['ντ', 'd'],
  ['ΓΚ', 'G'], ['Γκ', 'G'], ['γκ', 'g'],
  ['ΓΓ', 'NG'], ['γγ', 'ng'],
  ['ΤΣ', 'TS'], ['Τσ', 'Ts'], ['τσ', 'ts'],
  ['ΤΖ', 'TZ'], ['Τζ', 'Tz'], ['τζ', 'tz'],
];

const GREEK_TO_LATIN: Record<string, string> = {
  'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z',
  'Η': 'I', 'Θ': 'TH', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M',
  'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S',
  'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'CH', 'Ψ': 'PS', 'Ω': 'O',
  'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z',
  'η': 'i', 'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm',
  'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's',
  'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps',
  'ω': 'o',
  // Accented vowels
  'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o',
  'Ά': 'A', 'Έ': 'E', 'Ή': 'I', 'Ί': 'I', 'Ό': 'O', 'Ύ': 'Y', 'Ώ': 'O',
  'ϊ': 'i', 'ϋ': 'y', 'ΐ': 'i', 'ΰ': 'y',
};

export function toStatementDescriptorSuffix(name: string): string {
  // Strip accents for consistent digraph matching
  // Map accented chars to their base form first
  const ACCENT_MAP: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
    'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ',
  };

  let normalized = '';
  for (const char of name) {
    normalized += ACCENT_MAP[char] ?? char;
  }

  // First pass: replace digraphs
  let result = normalized;
  for (const [greek, latin] of GREEK_DIGRAPHS) {
    result = result.split(greek).join(latin);
  }

  // Second pass: transliterate remaining single Greek characters
  let final = '';
  for (const char of result) {
    final += GREEK_TO_LATIN[char] ?? char;
  }

  // Remove any non-allowed characters (keep A-Z, 0-9, spaces, hyphens, dots)
  final = final.replace(/[^A-Za-z0-9 \-\.]/g, '').trim();

  // Uppercase for consistency
  final = final.toUpperCase();

  // Truncate to 22 chars (Stripe limit for suffix)
  return final.substring(0, 22);
}

/**
 * Convert any text to GSM-7-safe Latin characters.
 * Used for SMS bodies to ensure 1 segment (160 chars) instead of UCS-2 (70 chars).
 * - Transliterates Greek -> Latin
 * - Strips remaining non-GSM-7 characters
 * GSM-7 basic charset: A-Z a-z 0-9 + common punctuation/symbols.
 */
export function toGsm7Safe(text: string): string {
  if (!text) return "";

  const ACCENT_MAP: Record<string, string> = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
    'ΐ': 'ι', 'ΰ': 'υ', 'ϊ': 'ι', 'ϋ': 'υ',
  };

  let normalized = '';
  for (const char of text) {
    normalized += ACCENT_MAP[char] ?? char;
  }

  let result = normalized;
  for (const [greek, latin] of GREEK_DIGRAPHS) {
    result = result.split(greek).join(latin);
  }

  let out = '';
  for (const char of result) {
    out += GREEK_TO_LATIN[char] ?? char;
  }

  // GSM-7 basic charset (subset, safe). Strip anything else.
  // Allowed: A-Z a-z 0-9 space and . , ? ! : ; ' " ( ) / + - _ & @ #
  out = out.replace(/[^A-Za-z0-9 .,?!:;'"()\/+\-_&@#]/g, '');

  // Collapse multiple spaces
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}
