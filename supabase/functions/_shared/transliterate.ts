/**
 * Transliterate Greek characters to Latin and sanitize for Stripe statement descriptors.
 * Stripe only accepts: A-Z, a-z, 0-9, spaces, and some symbols.
 * Max suffix length: 22 characters.
 */
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
  // Transliterate Greek to Latin
  let result = '';
  for (const char of name) {
    result += GREEK_TO_LATIN[char] ?? char;
  }

  // Remove any non-allowed characters (keep A-Z, 0-9, spaces, hyphens, dots)
  result = result.replace(/[^A-Za-z0-9 \-\.]/g, '').trim();

  // Uppercase for consistency
  result = result.toUpperCase();

  // Truncate to 22 chars (Stripe limit for suffix)
  return result.substring(0, 22);
}
