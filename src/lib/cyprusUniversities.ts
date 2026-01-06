export interface CyprusUniversity {
  domain: string;
  name: string;
  nameEl: string;
}

export const CYPRUS_UNIVERSITIES: CyprusUniversity[] = [
  { domain: 'ucy.ac.cy', name: 'University of Cyprus', nameEl: 'Πανεπιστήμιο Κύπρου' },
  { domain: 'unic.ac.cy', name: 'University of Nicosia', nameEl: 'Πανεπιστήμιο Λευκωσίας' },
  { domain: 'euc.ac.cy', name: 'European University Cyprus', nameEl: 'Ευρωπαϊκό Πανεπιστήμιο Κύπρου' },
  { domain: 'cut.ac.cy', name: 'Cyprus University of Technology', nameEl: 'Τεχνολογικό Πανεπιστήμιο Κύπρου' },
  { domain: 'nup.ac.cy', name: 'Neapolis University Paphos', nameEl: 'Πανεπιστήμιο Νεάπολις Πάφου' },
  { domain: 'uol.ac.cy', name: 'University of Limassol', nameEl: 'Πανεπιστήμιο Λεμεσού' },
];

export function getUniversityByDomain(email: string): CyprusUniversity | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return CYPRUS_UNIVERSITIES.find(u => u.domain === domain) || null;
}

export function isValidUniversityEmail(email: string): boolean {
  return getUniversityByDomain(email) !== null;
}

export function getUniversityName(domain: string, language: 'en' | 'el'): string {
  const university = CYPRUS_UNIVERSITIES.find(u => u.domain === domain);
  if (!university) return domain;
  return language === 'el' ? university.nameEl : university.name;
}
