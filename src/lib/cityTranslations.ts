/**
 * Centralized city translations for Cyprus
 * Maps Greek city names to their English equivalents and vice versa
 */

export const cityTranslationMap: Record<string, { el: string; en: string }> = {
  // Greek keys
  "Λευκωσία": { el: "Λευκωσία", en: "Nicosia" },
  "Λεμεσός": { el: "Λεμεσός", en: "Limassol" },
  "Λάρνακα": { el: "Λάρνακα", en: "Larnaca" },
  "Πάφος": { el: "Πάφος", en: "Paphos" },
  "Αμμόχωστος": { el: "Αμμόχωστος", en: "Famagusta" },
  "Παραλίμνι": { el: "Παραλίμνι", en: "Paralimni" },
  "Αγία Νάπα": { el: "Αγία Νάπα", en: "Ayia Napa" },
  // English keys (for reverse lookup)
  "Nicosia": { el: "Λευκωσία", en: "Nicosia" },
  "Limassol": { el: "Λεμεσός", en: "Limassol" },
  "Larnaca": { el: "Λάρνακα", en: "Larnaca" },
  "Paphos": { el: "Πάφος", en: "Paphos" },
  "Famagusta": { el: "Αμμόχωστος", en: "Famagusta" },
  "Paralimni": { el: "Παραλίμνι", en: "Paralimni" },
  "Ayia Napa": { el: "Αγία Νάπα", en: "Ayia Napa" },
};

/**
 * Translates a city name to the specified language
 * Works with both Greek and English input
 */
export const translateCity = (city: string | null | undefined, language: "el" | "en"): string => {
  if (!city) return "";
  const translation = cityTranslationMap[city];
  return translation ? translation[language] : city;
};

/**
 * Gets the database value (Greek) for a city
 * This is needed because the database stores cities in Greek
 */
export const getCityDbValue = (city: string): string => {
  const translation = cityTranslationMap[city];
  return translation ? translation.el : city;
};

/**
 * List of cities for dropdowns - STANDARD ORDER: Λεμεσός, Λευκωσία, Λάρνακα, Πάφος, Παραλίμνι, Αγία Νάπα, Αμμόχωστος
 */
export const cyprusCities = {
  el: ["Λεμεσός", "Λευκωσία", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα", "Αμμόχωστος"],
  en: ["Limassol", "Nicosia", "Larnaca", "Paphos", "Paralimni", "Ayia Napa", "Famagusta"],
};

/**
 * Standard city order for sorting - used to sort dynamic city lists
 */
export const CITY_ORDER = ["Λεμεσός", "Λευκωσία", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα", "Αμμόχωστος"];

/**
 * Normalizes a raw city/town string (from DB or analytics aggregations) into the
 * canonical database value (Greek) when it matches one of our known cities.
 *
 * Why: analytics sources may contain either Greek or English values, or values
 * with extra whitespace. This ensures consistent bucketing and correct UI
 * translation.
 */
export const normalizeCityDbValue = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // First try direct mapping (handles both EL and EN keys)
  const mapped = cityTranslationMap[trimmed];
  if (mapped) return mapped.el;

  // Fallback: case-insensitive match on English keys (handles e.g. "larnaca")
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(cityTranslationMap)) {
    if (key.toLowerCase() === lower) return val.el;
  }

  // If it's not a known city, keep as-is (still useful for non-standard towns)
  return trimmed;
};

/**
 * Sort cities according to the standard order
 */
export const sortCitiesByStandardOrder = (cities: string[]): string[] => {
  return [...cities].sort((a, b) => {
    const indexA = CITY_ORDER.indexOf(a);
    const indexB = CITY_ORDER.indexOf(b);
    // If not in standard list, put at end
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

/**
 * Default city list with database values (Greek) and display labels
 */
export const getCityOptions = (language: "el" | "en") => {
  return cyprusCities.el.map((dbValue) => ({
    value: dbValue, // Always use Greek for database
    label: translateCity(dbValue, language), // Display in current language
  }));
};

/**
 * "All Cyprus" translation
 */
export const allCyprusLabel = {
  el: "Όλη η Κύπρος",
  en: "All Cyprus",
};
