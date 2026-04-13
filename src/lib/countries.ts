/**
 * International country dial codes for phone input.
 * Cyprus and Greece are prioritized at the top.
 */
export interface CountryCode {
  code: string;   // ISO 3166-1 alpha-2
  dial: string;   // Dial prefix with +
  flag: string;   // Emoji flag
  name: string;   // English name
  nameEl: string; // Greek name
}

/** Prioritized countries (CY, GR first) + all others alphabetically */
export const COUNTRY_CODES: CountryCode[] = [
  // Priority
  { code: 'CY', dial: '+357', flag: '🇨🇾', name: 'Cyprus', nameEl: 'Κύπρος' },
  { code: 'GR', dial: '+30', flag: '🇬🇷', name: 'Greece', nameEl: 'Ελλάδα' },
  // Alphabetical
  { code: 'AF', dial: '+93', flag: '🇦🇫', name: 'Afghanistan', nameEl: 'Αφγανιστάν' },
  { code: 'AL', dial: '+355', flag: '🇦🇱', name: 'Albania', nameEl: 'Αλβανία' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algeria', nameEl: 'Αλγερία' },
  { code: 'AD', dial: '+376', flag: '🇦🇩', name: 'Andorra', nameEl: 'Ανδόρα' },
  { code: 'AO', dial: '+244', flag: '🇦🇴', name: 'Angola', nameEl: 'Ανγκόλα' },
  { code: 'AR', dial: '+54', flag: '🇦🇷', name: 'Argentina', nameEl: 'Αργεντινή' },
  { code: 'AM', dial: '+374', flag: '🇦🇲', name: 'Armenia', nameEl: 'Αρμενία' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia', nameEl: 'Αυστραλία' },
  { code: 'AT', dial: '+43', flag: '🇦🇹', name: 'Austria', nameEl: 'Αυστρία' },
  { code: 'AZ', dial: '+994', flag: '🇦🇿', name: 'Azerbaijan', nameEl: 'Αζερμπαϊτζάν' },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain', nameEl: 'Μπαχρέιν' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh', nameEl: 'Μπανγκλαντές' },
  { code: 'BY', dial: '+375', flag: '🇧🇾', name: 'Belarus', nameEl: 'Λευκορωσία' },
  { code: 'BE', dial: '+32', flag: '🇧🇪', name: 'Belgium', nameEl: 'Βέλγιο' },
  { code: 'BA', dial: '+387', flag: '🇧🇦', name: 'Bosnia', nameEl: 'Βοσνία' },
  { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brazil', nameEl: 'Βραζιλία' },
  { code: 'BG', dial: '+359', flag: '🇧🇬', name: 'Bulgaria', nameEl: 'Βουλγαρία' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada', nameEl: 'Καναδάς' },
  { code: 'CL', dial: '+56', flag: '🇨🇱', name: 'Chile', nameEl: 'Χιλή' },
  { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China', nameEl: 'Κίνα' },
  { code: 'CO', dial: '+57', flag: '🇨🇴', name: 'Colombia', nameEl: 'Κολομβία' },
  { code: 'HR', dial: '+385', flag: '🇭🇷', name: 'Croatia', nameEl: 'Κροατία' },
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Czech Republic', nameEl: 'Τσεχία' },
  { code: 'DK', dial: '+45', flag: '🇩🇰', name: 'Denmark', nameEl: 'Δανία' },
  { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'Egypt', nameEl: 'Αίγυπτος' },
  { code: 'EE', dial: '+372', flag: '🇪🇪', name: 'Estonia', nameEl: 'Εσθονία' },
  { code: 'ET', dial: '+251', flag: '🇪🇹', name: 'Ethiopia', nameEl: 'Αιθιοπία' },
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland', nameEl: 'Φινλανδία' },
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France', nameEl: 'Γαλλία' },
  { code: 'GE', dial: '+995', flag: '🇬🇪', name: 'Georgia', nameEl: 'Γεωργία' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany', nameEl: 'Γερμανία' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana', nameEl: 'Γκάνα' },
  { code: 'HU', dial: '+36', flag: '🇭🇺', name: 'Hungary', nameEl: 'Ουγγαρία' },
  { code: 'IS', dial: '+354', flag: '🇮🇸', name: 'Iceland', nameEl: 'Ισλανδία' },
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India', nameEl: 'Ινδία' },
  { code: 'ID', dial: '+62', flag: '🇮🇩', name: 'Indonesia', nameEl: 'Ινδονησία' },
  { code: 'IR', dial: '+98', flag: '🇮🇷', name: 'Iran', nameEl: 'Ιράν' },
  { code: 'IQ', dial: '+964', flag: '🇮🇶', name: 'Iraq', nameEl: 'Ιράκ' },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland', nameEl: 'Ιρλανδία' },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel', nameEl: 'Ισραήλ' },
  { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italy', nameEl: 'Ιταλία' },
  { code: 'JM', dial: '+1876', flag: '🇯🇲', name: 'Jamaica', nameEl: 'Τζαμάικα' },
  { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan', nameEl: 'Ιαπωνία' },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordan', nameEl: 'Ιορδανία' },
  { code: 'KZ', dial: '+7', flag: '🇰🇿', name: 'Kazakhstan', nameEl: 'Καζακστάν' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya', nameEl: 'Κένυα' },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait', nameEl: 'Κουβέιτ' },
  { code: 'LV', dial: '+371', flag: '🇱🇻', name: 'Latvia', nameEl: 'Λετονία' },
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'Lebanon', nameEl: 'Λίβανος' },
  { code: 'LY', dial: '+218', flag: '🇱🇾', name: 'Libya', nameEl: 'Λιβύη' },
  { code: 'LT', dial: '+370', flag: '🇱🇹', name: 'Lithuania', nameEl: 'Λιθουανία' },
  { code: 'LU', dial: '+352', flag: '🇱🇺', name: 'Luxembourg', nameEl: 'Λουξεμβούργο' },
  { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia', nameEl: 'Μαλαισία' },
  { code: 'MT', dial: '+356', flag: '🇲🇹', name: 'Malta', nameEl: 'Μάλτα' },
  { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'Mexico', nameEl: 'Μεξικό' },
  { code: 'MD', dial: '+373', flag: '🇲🇩', name: 'Moldova', nameEl: 'Μολδαβία' },
  { code: 'MC', dial: '+377', flag: '🇲🇨', name: 'Monaco', nameEl: 'Μονακό' },
  { code: 'ME', dial: '+382', flag: '🇲🇪', name: 'Montenegro', nameEl: 'Μαυροβούνιο' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Morocco', nameEl: 'Μαρόκο' },
  { code: 'NL', dial: '+31', flag: '🇳🇱', name: 'Netherlands', nameEl: 'Ολλανδία' },
  { code: 'NZ', dial: '+64', flag: '🇳🇿', name: 'New Zealand', nameEl: 'Νέα Ζηλανδία' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria', nameEl: 'Νιγηρία' },
  { code: 'MK', dial: '+389', flag: '🇲🇰', name: 'North Macedonia', nameEl: 'Βόρεια Μακεδονία' },
  { code: 'NO', dial: '+47', flag: '🇳🇴', name: 'Norway', nameEl: 'Νορβηγία' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman', nameEl: 'Ομάν' },
  { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan', nameEl: 'Πακιστάν' },
  { code: 'PS', dial: '+970', flag: '🇵🇸', name: 'Palestine', nameEl: 'Παλαιστίνη' },
  { code: 'PA', dial: '+507', flag: '🇵🇦', name: 'Panama', nameEl: 'Παναμάς' },
  { code: 'PE', dial: '+51', flag: '🇵🇪', name: 'Peru', nameEl: 'Περού' },
  { code: 'PH', dial: '+63', flag: '🇵🇭', name: 'Philippines', nameEl: 'Φιλιππίνες' },
  { code: 'PL', dial: '+48', flag: '🇵🇱', name: 'Poland', nameEl: 'Πολωνία' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal', nameEl: 'Πορτογαλία' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar', nameEl: 'Κατάρ' },
  { code: 'RO', dial: '+40', flag: '🇷🇴', name: 'Romania', nameEl: 'Ρουμανία' },
  { code: 'RU', dial: '+7', flag: '🇷🇺', name: 'Russia', nameEl: 'Ρωσία' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia', nameEl: 'Σαουδική Αραβία' },
  { code: 'RS', dial: '+381', flag: '🇷🇸', name: 'Serbia', nameEl: 'Σερβία' },
  { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore', nameEl: 'Σιγκαπούρη' },
  { code: 'SK', dial: '+421', flag: '🇸🇰', name: 'Slovakia', nameEl: 'Σλοβακία' },
  { code: 'SI', dial: '+386', flag: '🇸🇮', name: 'Slovenia', nameEl: 'Σλοβενία' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa', nameEl: 'Νότια Αφρική' },
  { code: 'KR', dial: '+82', flag: '🇰🇷', name: 'South Korea', nameEl: 'Νότια Κορέα' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain', nameEl: 'Ισπανία' },
  { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka', nameEl: 'Σρι Λάνκα' },
  { code: 'SE', dial: '+46', flag: '🇸🇪', name: 'Sweden', nameEl: 'Σουηδία' },
  { code: 'CH', dial: '+41', flag: '🇨🇭', name: 'Switzerland', nameEl: 'Ελβετία' },
  { code: 'SY', dial: '+963', flag: '🇸🇾', name: 'Syria', nameEl: 'Συρία' },
  { code: 'TW', dial: '+886', flag: '🇹🇼', name: 'Taiwan', nameEl: 'Ταϊβάν' },
  { code: 'TH', dial: '+66', flag: '🇹🇭', name: 'Thailand', nameEl: 'Ταϊλάνδη' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisia', nameEl: 'Τυνησία' },
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Turkey', nameEl: 'Τουρκία' },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Ukraine', nameEl: 'Ουκρανία' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE', nameEl: 'ΗΑΕ' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom', nameEl: 'Ηνωμένο Βασίλειο' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States', nameEl: 'ΗΠΑ' },
  { code: 'UY', dial: '+598', flag: '🇺🇾', name: 'Uruguay', nameEl: 'Ουρουγουάη' },
  { code: 'UZ', dial: '+998', flag: '🇺🇿', name: 'Uzbekistan', nameEl: 'Ουζμπεκιστάν' },
  { code: 'VE', dial: '+58', flag: '🇻🇪', name: 'Venezuela', nameEl: 'Βενεζουέλα' },
  { code: 'VN', dial: '+84', flag: '🇻🇳', name: 'Vietnam', nameEl: 'Βιετνάμ' },
];

/** Find a country by code */
export const getCountryByCode = (code: string): CountryCode | undefined =>
  COUNTRY_CODES.find(c => c.code === code);

/** Find a country by dial prefix — tries longest match first */
export const getCountryByDial = (dial: string): CountryCode | undefined => {
  const clean = dial.startsWith('+') ? dial : `+${dial}`;
  // Sort by dial length descending to match +1876 before +1
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find(c => clean.startsWith(c.dial));
};

/**
 * Parse a stored E.164 phone into { countryCode, localNumber }.
 * Returns null if no match found.
 */
export const parseE164Phone = (phone: string): { countryCode: string; localNumber: string } | null => {
  if (!phone) return null;
  const clean = phone.replace(/\s/g, '');
  if (!clean.startsWith('+')) return null;
  
  const country = getCountryByDial(clean);
  if (!country) return null;
  
  return {
    countryCode: country.code,
    localNumber: clean.slice(country.dial.length),
  };
};

/**
 * Build E.164 phone string from country code + local number
 */
export const buildE164Phone = (countryCode: string, localNumber: string): string => {
  const country = getCountryByCode(countryCode);
  if (!country) return localNumber;
  const digits = localNumber.replace(/\D/g, '');
  return `${country.dial}${digits}`;
};
