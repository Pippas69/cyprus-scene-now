

## Plan: Προαιρετικό Email OTP 2FA

### Εγγύηση: Τι ΔΕΝ θα αλλάξει
- **Login page** (`Login.tsx`): Η φόρμα, το UI, τα redirects παραμένουν ακριβώς ίδια. Προστίθεται μόνο ένα intercept ΜΕΤΑ το επιτυχημένο login — αν ο χρήστης έχει ενεργοποιημένο 2FA, εμφανίζεται ένα modal/overlay για τον κωδικό. Αν δεν έχει 2FA, τίποτα δεν αλλάζει.
- **Signup flow**: Κανένα touch. Η εγγραφή, OTP επαλήθευση, welcome email — όλα μένουν ακριβώς ως έχουν.
- **InlineAuthGate**: Κανένα touch.
- **Navbar, BottomNav, UserLayout, routing**: Κανένα touch.
- **Profiles table, RLS policies**: Κανένα touch.
- **Υπάρχοντα Edge Functions**: Κανένα touch.
- **Business login/dashboard**: Κανένα touch.
- **Admin login/dashboard**: Κανένα touch.

### Τι θα προστεθεί (μόνο νέα αρχεία + μικρές προσθήκες)

**1. Database — 2 νέοι πίνακες (migration)**
- `user_2fa_settings`: αποθηκεύει αν ο χρήστης έχει ενεργοποιήσει 2FA (`user_id`, `is_enabled`, timestamps)
- `email_otp_codes`: αποθηκεύει προσωρινούς 6ψήφιους κωδικούς (`user_id`, `code`, `expires_at`, `used`)
- RLS policies ώστε κάθε χρήστης βλέπει μόνο τα δικά του

**2. Edge Functions — 2 νέα (ΔΕΝ πειράζουν τα υπάρχοντα)**
- `send-2fa-code`: Δημιουργεί 6ψήφιο κωδικό, τον αποθηκεύει στη βάση, τον στέλνει email μέσω Resend (support@fomo.com.cy)
- `verify-2fa-code`: Ελέγχει τον κωδικό και επιστρέφει επιτυχία/αποτυχία

**3. Frontend — Νέα components + μικρές προσθήκες**
- **Νέο component** `TwoFactorVerification.tsx`: Modal/overlay με 6 InputOTP slots — εμφανίζεται μόνο αν ο χρήστης έχει 2FA ενεργό
- **Login.tsx**: Μετά το επιτυχημένο `signInWithPassword`, ΕΝΑ query check στο `user_2fa_settings` — αν `is_enabled`, εμφανίζει το modal αντί να κάνει redirect. Αν όχι, κάνει ακριβώς ό,τι κάνει τώρα. Καμία αλλαγή στο UI της φόρμας.
- **UserSettings.tsx**: Προσθήκη ενός νέου Section "Ασφάλεια" με toggle switch για ενεργοποίηση/απενεργοποίηση 2FA. Δεν αλλάζει τίποτα στα υπάρχοντα sections.

### Ροή λειτουργίας
```text
User logs in → password OK → check 2fa_settings
  ├─ 2FA OFF → normal redirect (ακριβώς όπως τώρα)
  └─ 2FA ON  → call send-2fa-code → show OTP modal
                → user enters code → call verify-2fa-code
                  ├─ OK → normal redirect
                  └─ Wrong → error toast, retry
```

### Αρχεία που θα δημιουργηθούν (νέα)
- `supabase/functions/send-2fa-code/index.ts`
- `supabase/functions/verify-2fa-code/index.ts`
- `src/components/auth/TwoFactorVerification.tsx`

### Αρχεία που θα τροποποιηθούν (ελάχιστες προσθήκες)
- `src/pages/Login.tsx` — προσθήκη 2FA check μετά το login (15-20 γραμμές κώδικα)
- `src/components/user/UserSettings.tsx` — προσθήκη 2FA toggle section

### Τι ΔΕΝ θα πειραχτεί
Όλα τα υπόλοιπα αρχεία, components, pages, edge functions, database tables, RLS policies παραμένουν 100% ανέπαφα.

