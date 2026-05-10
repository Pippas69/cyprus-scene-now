import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeSelectChange } from "@/lib/formSafeUpdate";
import { MapPin, Heart, ArrowLeft, Store, Sun, Moon, Sparkles, Clock, GraduationCap, Mail, CheckCircle, Loader2, Phone, User, Calendar, Lock, Users } from "lucide-react";
import { useTheme } from "next-themes";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { authTranslations } from "@/translations/authTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { validationTranslations, formatValidationMessage } from "@/translations/validationTranslations";
import { Confetti, useConfetti } from "@/components/ui/confetti";
import { SuccessCheckmark } from "@/components/ui/success-animation";
import { useBetaMode } from "@/hooks/useBetaMode";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { getCategoriesForUser } from "@/lib/unifiedCategories";
import { CYPRUS_UNIVERSITIES, getUniversityByDomain, isValidUniversityEmail } from "@/lib/cyprusUniversities";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCityOptions, translateCity, cyprusCities } from "@/lib/cityTranslations";
import { InterestSelectorList } from "@/components/categories/InterestSelectorList";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];
  const vt = validationTranslations[language];
  const confetti = useConfetti();
  const { isBetaMode, isLoading: betaLoading, betaMessage } = useBetaMode();

  const signupSchema = z.object({
    firstName: z.string().trim().min(2, {
      message: vt.nameRequired
    }),
    lastName: z.string().trim().min(2, {
      message: vt.nameRequired
    }),
    age: z.coerce.number().min(15, {
      message: formatValidationMessage(vt.minValue, { min: 15 })
    }).max(100),
    email: z.string().trim().email({
      message: vt.invalidEmail
    }),
    password: z.string().min(8, {
      message: vt.passwordTooShort
    }),
    town: z.string().min(1, {
      message: vt.selectOption
    }),
    phone: z.string().min(1, {
      message: language === 'el' ? 'Το τηλέφωνο είναι υποχρεωτικό' : 'Phone is required'
    }).refine((val) => {
      const digits = val.replace(/\D/g, '').length;
      return digits >= 8;
    }, { message: language === 'el' ? 'Μη έγκυρος αριθμός τηλεφώνου' : 'Invalid phone number' }),
    gender: z.enum(['male', 'female', 'other']).optional(),
    preferences: z.array(z.string()).optional(),
    isStudent: z.boolean().optional(),
    universityEmail: z.string().email().optional().or(z.literal('')),
    selectedUniversity: z.string().optional()
  });

  type SignupFormValues = z.infer<typeof signupSchema>;
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      age: undefined,
      email: "",
      password: "",
      town: "",
      phone: "",
      gender: undefined,
      preferences: [],
      isStudent: false,
      universityEmail: "",
      selectedUniversity: ""
    }
  });
  const [passwordLength, setPasswordLength] = useState(0);

  const [isStudent, setIsStudent] = useState(false);
  const [universityEmail, setUniversityEmail] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [studentEmailError, setStudentEmailError] = useState("");
  const [studentVerificationSent, setStudentVerificationSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [redirectAfterVerify, setRedirectAfterVerify] = useState('/feed');

  useEffect(() => {
    if (universityEmail && isStudent) {
      const domain = universityEmail.split('@')[1]?.toLowerCase();
      if (domain && selectedUniversity) {
        const matchingUni = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
        if (matchingUni && domain !== matchingUni.domain) {
          setStudentEmailError(
            language === 'el'
              ? `Το email πρέπει να είναι @${matchingUni.domain}`
              : `Email must be @${matchingUni.domain}`
          );
        } else if (!isValidUniversityEmail(universityEmail)) {
          setStudentEmailError(
            language === 'el'
              ? 'Παρακαλώ χρησιμοποιήστε ακαδημαϊκό email'
              : 'Please use a valid university email'
          );
        } else {
          setStudentEmailError('');
        }
      }
    } else {
      setStudentEmailError('');
    }
  }, [universityEmail, selectedUniversity, isStudent, language]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const redirectUrl = searchParams.get('redirect') || '/feed';

      if (isStudent && universityEmail && selectedUniversity) {
        if (!isValidUniversityEmail(universityEmail)) {
          toast.error(language === 'el' ? 'Μη έγκυρο ακαδημαϊκό email' : 'Invalid university email');
          setIsLoading(false);
          return;
        }
      }

      const TEST_EMAIL = "marinoskoumi04@gmail.com";
      if (values.email.toLowerCase() === TEST_EMAIL) {
        try {
          await supabase.functions.invoke('delete-test-user', {
            body: { email: TEST_EMAIL }
          });
        } catch (e) {
          console.log('Test user cleanup skipped:', e);
        }
      }

      const fullPhone = values.phone;

      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectUrl}`,
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
            age: values.age,
            town: values.town,
            phone: fullPhone,
            gender: values.gender,
            preferences: selectedPreferences,
            is_student: isStudent,
            university_email: isStudent ? universityEmail : null,
            selected_university: isStudent ? selectedUniversity : null
          }
        }
      });
      if (error) {
        if (error.message.includes("already registered")) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: values.email,
          });
          if (!resendError) {
            setOtpEmail(values.email);
            setRedirectAfterVerify(redirectUrl);
            setShowOtpScreen(true);
            toast.success(
              language === 'el'
                ? 'Ο λογαριασμός σου υπάρχει αλλά δεν έχει επιβεβαιωθεί. Στείλαμε νέο κωδικό στο email σου.'
                : "Your account exists but isn't verified. We sent a new code to your email."
            );
            return;
          }
          const rmsg = (resendError.message || '').toLowerCase();
          if (rmsg.includes('already confirmed') || rmsg.includes('confirmed')) {
            toast.error(
              language === 'el'
                ? 'Αυτό το email έχει ήδη εγγραφεί. Πήγαινε στο login για να συνδεθείς.'
                : 'This email is already registered. Please sign in instead.'
            );
            navigate(`/login?email=${encodeURIComponent(values.email)}`);
            return;
          }
          if (rmsg.includes('rate limit') || rmsg.includes('rate_limit') || rmsg.includes('too many')) {
            toast.error(
              language === 'el'
                ? 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.'
                : 'Too many attempts. Please try again in a few minutes.'
            );
            return;
          }
          toast.error(language === "el" ? "Αυτό το email είναι ήδη καταχωρημένο" : "This email is already registered");
        } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("rate_limit")) {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          if (newAttempts >= 5) {
            toast.error(language === "el" ? "Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά αργότερα." : "Too many failed attempts. Please try again later.");
          } else {
            toast.error(language === "el" ? "Κάτι πήγε στραβά. Δοκιμάστε ξανά." : "Something went wrong. Please try again.");
          }
        } else {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          if (newAttempts >= 5 && (error.message.toLowerCase().includes("email") || error.message.toLowerCase().includes("limit"))) {
            toast.error(language === "el" ? "Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά αργότερα." : "Too many failed attempts. Please try again later.");
          } else {
            toast.error(error.message);
          }
        }
        return;
      }
      if (data.user) {
        setFailedAttempts(0);
        const { error: profileUpsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              first_name: values.firstName,
              last_name: values.lastName,
              phone: fullPhone,
              gender: values.gender ?? null,
              age: typeof values.age === "number" ? values.age : null,
              town: values.town,
              city: values.town,
            } as any,
            { onConflict: "id" }
          );

        if (profileUpsertError) {
          console.error("Profile upsert error on signup:", profileUpsertError);
        }

        if (isStudent && universityEmail && selectedUniversity) {
          const universityData = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
          if (universityData) {
            const normalizedEmail = universityEmail.toLowerCase().trim();

            const { data: existingApproved } = await supabase
              .from('student_verifications')
              .select('id')
              .eq('university_email', normalizedEmail)
              .eq('status', 'approved')
              .maybeSingle();

            if (existingApproved) {
              toast.error(language === 'el'
                ? 'Αυτό το φοιτητικό email χρησιμοποιείται ήδη σε άλλο λογαριασμό'
                : 'This university email is already used by another account'
              );
            } else {
              const { data: verificationData, error: verificationError } = await supabase
                .from('student_verifications')
                .insert({
                  user_id: data.user.id,
                  university_email: normalizedEmail,
                  university_name: universityData.name,
                  university_domain: universityData.domain,
                  status: 'pending'
                } as any)
                .select('id')
                .single();

              if (verificationError) {
                console.error('Student verification insert error:', verificationError);
                if (verificationError.code === '23505') {
                  toast.error(language === 'el'
                    ? 'Αυτό το φοιτητικό email χρησιμοποιείται ήδη σε άλλο λογαριασμό'
                    : 'This university email is already used by another account'
                  );
                } else {
                  toast.error(language === 'el' ? 'Αποτυχία δημιουργίας επαλήθευσης φοιτητή' : 'Failed to create student verification');
                }
              } else if (verificationData) {
                try {
                  setSendingVerification(true);
                  const { error: emailError } = await supabase.functions.invoke('send-student-verification-email', {
                    body: {
                      verificationId: verificationData.id,
                      universityEmail: normalizedEmail,
                      universityName: universityData.name,
                      userName: `${values.firstName} ${values.lastName}`,
                    },
                  });

                  if (emailError) {
                    console.error('Student verification email error:', emailError);
                    toast.error(language === 'el' ? 'Δεν στάλθηκε email επαλήθευσης στο πανεπιστήμιο' : 'Verification email was not sent');
                  } else {
                    setStudentVerificationSent(true);
                    toast.success(language === 'el' ? 'Στάλθηκε email επαλήθευσης στο πανεπιστήμιο σου' : 'Verification email sent to your university inbox');
                  }
                } finally {
                  setSendingVerification(false);
                }
              }
            }
          }
        }
        confetti.trigger();
        setOtpEmail(values.email);
        setRedirectAfterVerify(redirectUrl);
        setShowOtpScreen(true);
        toast.success(language === 'el' ? 'Έλεγξε το email σου για τον κωδικό επαλήθευσης' : 'Check your email for the verification code');
      }
    } catch (error) {
      toast.error(tt.failed);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (category: string) => {
    setSelectedPreferences(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) return;
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'signup',
      });
      if (error) {
        toast.error(language === 'el' ? 'Λάθος κωδικός επαλήθευσης. Δοκίμασε ξανά.' : 'Wrong verification code. Try again.');
        setOtpCode('');
      } else {
        confetti.trigger();
        setShowSuccessScreen(true);
        setTimeout(() => navigate(redirectAfterVerify), 3500);
      }
    } catch (e) {
      toast.error(language === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: otpEmail });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(language === 'el' ? 'Νέος κωδικός στάλθηκε στο email σου' : 'New code sent to your email');
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (betaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <OceanLoader size="lg" />
      </div>
    );
  }

  if (isBetaMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> {t.back}
            </button>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
            <h1 className="font-urbanist font-black text-white text-5xl mb-2">ΦΟΜΟ</h1>
            <div className="w-12 h-0.5 bg-seafoam mx-auto rounded-full mb-8" />
            <div className="w-16 h-16 bg-seafoam/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-seafoam animate-pulse" />
            </div>
            <h2 className="font-urbanist font-black text-white text-2xl mb-3">
              {language === 'el' ? betaMessage.el : betaMessage.en}
            </h2>
            <p className="text-white/45 text-sm leading-relaxed mb-8">
              {language === 'el'
                ? 'Ετοιμάζουμε κάτι ξεχωριστό για εσένα! Η εφαρμογή βρίσκεται σε φάση beta.'
                : "We're preparing something special for you! The app is currently in beta phase."
              }
            </p>
            <div className="flex justify-center gap-3 mb-8">
              <Sparkles className="h-5 w-5 text-seafoam animate-bounce" style={{ animationDelay: "0s" }} />
              <Sparkles className="h-5 w-5 text-white/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
              <Sparkles className="h-5 w-5 text-seafoam animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
            <div className="pt-6 border-t border-white/[0.06]">
              <p className="text-white/40 text-sm mb-4">
                {language === 'el' ? 'Είστε επιχείρηση με κωδικό πρόσκλησης;' : 'Are you a business with an invite code?'}
              </p>
              <button
                onClick={() => navigate("/signup-business")}
                className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-5 py-2.5 text-white text-sm hover:bg-white/[0.1] transition-colors"
              >
                <Store className="h-4 w-4" />
                {language === 'el' ? 'Εγγραφή Επιχείρησης' : 'Business Signup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <>
        <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={100} />
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
            <SuccessCheckmark isVisible={true} size="lg" className="mx-auto" />
            <h2 className="font-urbanist font-black text-white text-2xl mt-6 mb-2">
              {language === 'el' ? 'Καλωσόρισες στο ΦΟΜΟ!' : 'Welcome to FOMO!'}
            </h2>
            <p className="text-white/50 text-sm">
              {language === 'el' ? 'Η εγγραφή σου ολοκληρώθηκε επιτυχώς!' : 'Your registration was completed successfully!'}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-white/30 mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === 'el' ? 'Ανακατεύθυνση...' : 'Redirecting...'}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showOtpScreen) {
    return (
      <>
        <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={80} />
        <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-seafoam/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-seafoam" />
                </div>
                <h2 className="font-urbanist font-black text-white text-2xl mb-2">
                  {language === 'el' ? 'Επαλήθευση Email' : 'Email Verification'}
                </h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  {language === 'el'
                    ? `Εισάγετε τον 6ψήφιο κωδικό που στάλθηκε στο ${otpEmail}`
                    : `Enter the 6-digit code sent to ${otpEmail}`}
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length < 6 || verifyingOtp}
                className="w-full h-11 bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifyingOtp
                  ? (language === 'el' ? 'Επαλήθευση...' : 'Verifying...')
                  : (language === 'el' ? 'Επαλήθευση' : 'Verify')}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  onClick={handleResendOtp}
                  disabled={verifyingOtp}
                >
                  {language === 'el' ? 'Δεν λάβατε κωδικό; Αποστολή ξανά' : "Didn't receive a code? Resend"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={80} />
      <div className="min-h-screen bg-background flex">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:w-[400px] xl:w-[460px] flex-shrink-0 relative border-r border-white/[0.06] px-10 xl:px-14">
          <div className="absolute top-1/2 left-0 w-[360px] h-[360px] bg-seafoam/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
          <div className="relative z-10">
            <h1
              className="font-urbanist font-black leading-none tracking-[-0.05em] mb-4"
              style={{ fontSize: "clamp(4rem, 6vw, 6.5rem)" }}
            >
              <span className="text-[#7EC8F0]">Φ</span><span className="text-white">ΟΜΟ</span>
            </h1>
            <p className="font-inter text-white/45 text-base leading-relaxed mb-10">
              {language === 'el'
                ? 'Η νυχτερινή ζωή της Κύπρου στα χέρια σου. Ανακάλυψε, κράτα θέση, ζήσε.'
                : 'Cyprus nightlife at your fingertips. Discover, book, experience.'}
            </p>
            <div className="space-y-4">
              {[
                { value: '10K+', label: language === 'el' ? 'Ενεργοί χρήστες' : 'Active users' },
                { value: '500+', label: language === 'el' ? 'Εκδηλώσεις μηνιαίως' : 'Events monthly' },
                { value: '50K+', label: language === 'el' ? 'Επισκέψεις' : 'Total visits' },
              ].map(s => (
                <div key={s.value} className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-seafoam rounded-full" />
                  <div>
                    <div className="font-urbanist font-black text-white text-xl">{s.value}</div>
                    <div className="text-white/40 text-xs">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 pt-5 pb-3 flex-shrink-0">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t.back}
            </button>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              </div>
          </div>

          {/* Form content */}
          <div className="flex-1 px-4 sm:px-6 lg:px-10 py-4 pb-12">
            <div className="max-w-xl mx-auto lg:mx-0">
              <div className="mb-6">
                <h2 className="font-urbanist font-black text-white text-3xl mb-1">
                  {language === 'el' ? 'Δημιουργία Λογαριασμού' : 'Create Account'}
                </h2>
                <p className="text-white/40 text-sm">
                  {language === 'el' ? 'Γίνε μέλος της κοινότητας' : 'Join the community'}
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 sm:p-7">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                              <Input placeholder={language === "el" ? "Όνομα" : "First Name"} {...field} className="rounded-xl h-10 pl-10 placeholder:text-white/40" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                              <Input placeholder={language === "el" ? "Επίθετο" : "Last Name"} {...field} className="rounded-xl h-10 pl-10 placeholder:text-white/40" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="age" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                            <Input type="number" placeholder={language === "el" ? "Ηλικία" : "Age"} {...field} className="rounded-xl h-10 pl-10 placeholder:text-white/40" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                            <Input type="email" placeholder={language === "el" ? "Ηλεκτρονικό Ταχυδρομείο" : "Email"} {...field} className="rounded-xl h-10 pl-10 placeholder:text-white/40" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none z-10" />
                            <PasswordInput
                              placeholder={t.passwordPlaceholder}
                              {...field}
                              onChange={(e) => { field.onChange(e); setPasswordLength(e.target.value.trim().length); }}
                              className="rounded-xl h-10 pl-10 placeholder:text-white/40"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="town" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(v) => safeSelectChange(field.value, v, field.onChange)} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-10">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <MapPin className="h-4 w-4 text-white/25 flex-shrink-0" />
                                <SelectValue placeholder={language === "el" ? "Πόλη" : "Town"} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getCityOptions(language).map(city => (
                              <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            language={language}
                            selectClassName="rounded-xl h-10"
                            inputClassName="rounded-xl h-10 placeholder:text-white/40"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(v) => safeSelectChange(field.value, v, field.onChange)} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-10">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Users className="h-4 w-4 text-white/25 flex-shrink-0" />
                                <SelectValue placeholder={language === "el" ? "Φύλο (προαιρετικό)" : "Gender (optional)"} />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">{language === "el" ? "Άνδρας" : "Male"}</SelectItem>
                            <SelectItem value="female">{language === "el" ? "Γυναίκα" : "Female"}</SelectItem>
                            <SelectItem value="other">{language === "el" ? "Άλλο" : "Other"}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <button
                      type="submit"
                      className="w-full h-11 bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || passwordLength < 8}
                    >
                      {isLoading ? t.signingUp : t.signupButton}
                    </button>

                    <p className="text-xs text-center text-white/40">
                      {language === "el" ? (
                        <>Με την εγγραφή σας, αποδέχεστε τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">όρους χρήσης</a> και την <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">πολιτική απορρήτου</a>.</>
                      ) : (
                        <>By signing up, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">terms of use</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam underline">privacy policy</a>.</>
                      )}
                    </p>

                    <div className="text-center text-sm text-white/40">
                      {t.alreadyHaveAccount}{" "}
                      <Link to="/login" className="text-seafoam hover:text-seafoam/80 font-semibold">
                        {t.loginLink}
                      </Link>
                    </div>
                  </form>
                </Form>
              </div>

              <div className="mt-5 text-right">
                <Link to="/signup-business" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors font-medium">
                  <Store className="h-4 w-4" />
                  {t.businessSignupLink}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
