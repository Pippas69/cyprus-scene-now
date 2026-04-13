# Memory: features/phone/international-phone-input-el
Updated: now

Το application υποστηρίζει πλέον διεθνή τηλέφωνα από όλες τις χώρες (όχι μόνο CY/GR). 
- Reusable component: `src/components/ui/phone-input.tsx` (PhoneInput)
- Country data: `src/lib/countries.ts` (100+ χώρες, CY/GR πρώτες)
- Format: E.164 (π.χ. +35799123456) — αποθηκεύεται και επιστρέφεται πάντα σε αυτό το format
- Default χώρα: Κύπρος (+357)
- Search: Ο χρήστης μπορεί να αναζητήσει χώρα στο dropdown
- Ενημερώθηκαν ΟΛΑ τα σημεία phone input: Signup, SignupModal, ProfileCompletionGate, ReservationDialog, ReservationEventCheckout, DirectReservationDialog, ManualEntryDialog, TicketPurchaseFlow, KalivaTicketReservationFlow, OfferPurchaseDialog, CrmAddGuestDialog, ProductionCreationForm, ProductionEditForm, BookDemo, Contact
- Validation: 8-15 ψηφία (E.164 compatible), ήδη υπάρχει στο phoneValidation.ts
