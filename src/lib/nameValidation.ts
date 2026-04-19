import { z } from 'zod';

/**
 * Latin-only name validator.
 *
 * Επιτρέπει μόνο λατινικούς χαρακτήρες (a-z, A-Z), κενά, παύλες,
 * τελείες και αποστρόφους. Χρησιμοποιείται σε όλα τα πεδία ονομάτων
 * που εμφανίζονται στη Διαχείριση Επιχείρησης ώστε η αλφαβητική
 * ταξινόμηση (A-Z) να είναι συνεπής.
 *
 * Παλιά δεδομένα (Ελληνικά) δεν επηρεάζονται — ο κανόνας ισχύει
 * μόνο για νέες καταχωρήσεις από εδώ και στο εξής.
 */
export const LATIN_NAME_REGEX = /^[a-zA-Z\s\-\.']+$/;

export const latinNameMessages = {
  el: 'Παρακαλώ χρησιμοποίησε μόνο λατινικούς χαρακτήρες (A-Z)',
  en: 'Please use Latin characters only (A-Z)',
};

export const isValidLatinName = (value: string): boolean => {
  if (!value) return false;
  return LATIN_NAME_REGEX.test(value.trim());
};

export const latinNameSchema = (
  opts: { min?: number; max?: number; language?: 'el' | 'en' } = {}
) => {
  const { min = 2, max = 100, language = 'el' } = opts;
  const msg = latinNameMessages[language];
  return z
    .string()
    .trim()
    .min(min, language === 'el' ? `Τουλάχιστον ${min} χαρακτήρες` : `Must be at least ${min} characters`)
    .max(max, language === 'el' ? `Μέγιστο ${max} χαρακτήρες` : `Must not exceed ${max} characters`)
    .regex(LATIN_NAME_REGEX, msg);
};
