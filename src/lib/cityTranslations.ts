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
 * List of cities for dropdowns
 */
export const cyprusCities = {
  el: ["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"],
  en: ["Nicosia", "Limassol", "Larnaca", "Paphos", "Paralimni", "Ayia Napa"],
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
