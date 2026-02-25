import { z } from 'zod';

/**
 * Validates phone numbers:
 * - Strips all non-digit characters (except leading +)
 * - Must have at least 8 digits (Cyprus standard)
 * - Must have at most 15 digits (ITU-T E.164 max)
 * - Allows optional + prefix and formatting characters
 */
export const phoneRegex = /^\+?[\d\s\-()]+$/;

export function getDigitCount(phone: string): number {
  return phone.replace(/\D/g, '').length;
}

export function isValidPhone(phone: string): boolean {
  if (!phoneRegex.test(phone)) return false;
  const digits = getDigitCount(phone);
  return digits >= 8 && digits <= 15;
}

export const phoneValidationMessages = {
  el: {
    invalid: 'Μη έγκυρο τηλέφωνο',
    tooShort: 'Το τηλέφωνο πρέπει να έχει τουλάχιστον 8 ψηφία',
    tooLong: 'Το τηλέφωνο δεν μπορεί να υπερβαίνει τα 15 ψηφία',
    format: 'Το τηλέφωνο πρέπει να περιέχει μόνο αριθμούς',
  },
  en: {
    invalid: 'Invalid phone number',
    tooShort: 'Phone number must be at least 8 digits',
    tooLong: 'Phone number cannot exceed 15 digits',
    format: 'Phone number must contain only numbers',
  },
};

/** Zod schema for required phone field */
export const phoneSchema = (lang: 'el' | 'en' = 'el') => {
  const m = phoneValidationMessages[lang];
  return z
    .string()
    .regex(phoneRegex, m.format)
    .refine((val) => getDigitCount(val) >= 8, { message: m.tooShort })
    .refine((val) => getDigitCount(val) <= 15, { message: m.tooLong });
};

/** Zod schema for optional phone field */
export const optionalPhoneSchema = (lang: 'el' | 'en' = 'el') => {
  const m = phoneValidationMessages[lang];
  return z
    .string()
    .regex(phoneRegex, m.format)
    .refine((val) => getDigitCount(val) >= 8, { message: m.tooShort })
    .refine((val) => getDigitCount(val) <= 15, { message: m.tooLong })
    .optional()
    .or(z.literal(''));
};
