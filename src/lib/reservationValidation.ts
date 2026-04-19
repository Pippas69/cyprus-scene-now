import { z } from 'zod';
import { phoneRegex, getDigitCount } from './phoneValidation';

export const reservationSchema = z.object({
  reservation_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\u0370-\u03FF\u1F00-\u1FFF]+$/, 'Name must contain only letters and spaces'),
  
  party_size: z
    .number()
    .int('Party size must be a whole number')
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size cannot exceed 50'),
  
  phone_number: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format')
    .refine((val) => getDigitCount(val) >= 8, { message: 'Phone number must be at least 8 digits' })
    .refine((val) => getDigitCount(val) <= 15, { message: 'Phone number cannot exceed 15 digits' })
    .optional()
    .or(z.literal('')),
  
  special_requests: z
    .string()
    .max(500, 'Special requests must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  
  seating_preference: z.string().optional(),
  preferred_time: z.date(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
