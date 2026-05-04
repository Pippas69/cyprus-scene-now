import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { MapPin, Heart, ArrowLeft, Store, Sparkles, Clock, GraduationCap, Mail, Loader2, Phone, ArrowRight, Zap, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { CYPRUS_UNIVERSITIES, isValidUniversityEmail } from "@/lib/cyprusUniversities";
import { getCityOptions } from "@/lib/cityTranslations";
import { InterestSelectorList } from "@/components/categories/InterestSelectorList";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];
  const vt = validationTranslations[language];
  const confetti = useConfetti();
  const { isBetaMode, isLoading: betaLoading, betaMessage } = useBetaMode();

  const signupSchema = z.object({
    firstName: z.string().trim().min(2, { message: vt.nameRequired }),
    lastName: z.string().trim().min(2, { message: vt.nameRequired }),
    age: z.coerce.number().min(15, { message: formatValidationMessage(vt.minValue, { min: 15 }) }).max(100),
    email: z.string().trim().email({ message: vt.invalidEmail }),
    password: z.string().min(8, { message: vt.passwordTooShort }),
    town: z.string().min(1, { message: vt.selectOption }),
    phone: z.string().min(1, { message: language === "el" ? "Το τηλέφωνο είναι υποχρεωτικό" : "Phone is required" }).refine(v => v.replace(/\D/g, "").length >= 8, { message: language === "el" ? "Μη έγκυρος αριθμός τηλεφώνου" : "Invalid phone number" }),
    gender: z.enum(["male", "female", "other"]).optional(),
    preferences: z.array(z.string()).optional(),
    isStudent: z.boolean().optional(),
    universityEmail: z.string().email().optional().or(z.literal("")),
    selectedUniversity: z.string().optional()
  });

  type SignupFormValues = z.infer<typeof signupSchema>;
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", age: undefined, email: "", password: "", town: "", phone: "", gender: undefined, preferences: [], isStudent: false, universityEmail: "", selectedUniversity: "" }
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
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [redirectAfterVerify, setRedirectAfterVerify] = useState("/feed");

  useEffect(() => {
    if (universityEmail && isStudent) {
      const domain = universityEmail.split("@")[1]?.toLowerCase();
      if (domain && selectedUniversity) {
        const matchingUni = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
        if (matchingUni && domain !== matchingUni.domain) setStudentEmailError(language === "el" ? `Το email πρέπει να είναι @${matchingUni.domain}` : `Email must be @${matchingUni.domain}`);
        else if (!isValidUniversityEmail(universityEmail)) setStudentEmailError(language === "el" ? "Παρακαλώ χρησιμοποιήστε ακαδημαϊκό email" : "Please use a valid university email");
        else setStudentEmailError("");
      }
    } else setStudentEmailError("");
  }, [universityEmail, selectedUniversity, isStudent, language]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const redirectUrl = searchParams.get("redirect") || "/feed";
      if (isStudent && universityEmail && selectedUniversity) {
        if (!isValidUniversityEmail(universityEmail)) { toast.error(language === "el" ? "Μη έγκυρο ακαδημαϊκό email" : "Invalid university email"); setIsLoading(false); return; }
      }
      const TEST_EMAIL = "marinoskoumi04@gmail.com";
      if (values.email.toLowerCase() === TEST_EMAIL) {
        try { await supabase.functions.invoke("delete-test-user", { body: { email: TEST_EMAIL } }); } catch {}
      }
      const { data, error } = await supabase.auth.signUp({
        email: values.email, password: values.password,
        options: { emailRedirectTo: `${window.location.origin}${redirectUrl}`, data: { first_name: values.firstName, last_name: values.lastName, age: values.age, town: values.town, phone: values.phone, gender: values.gender, preferences: selectedPreferences, is_student: isStudent, university_email: isStudent ? universityEmail : null, selected_university: isStudent ? selectedUniversity : null } }
      });
      if (error) {
        if (error.message.includes("already registered")) {
          const { error: resendError } = await supabase.auth.resend({ type: "signup", email: values.email });
          if (!resendError) { setOtpEmail(values.email); setRedirectAfterVerify(redirectUrl); setShowOtpScreen(true); toast.success(language === "el" ? "Στείλαμε νέο κωδικό στο email σου." : "We sent a new code to your email."); return; }
          const rmsg = (resendError.message || "").toLowerCase();
          if (rmsg.includes("already confirmed")) { toast.error(language === "el" ? "Αυτό το email έχει ήδη εγγραφεί. Πήγαινε στο login." : "This email is already registered. Please sign in instead."); navigate(`/login?email=${encodeURIComponent(values.email)}`); return; }
          if (rmsg.includes("rate limit") || rmsg.includes("too many")) { toast.error(language === "el" ? "Πάρα πολλές προσπάθειες." : "Too many attempts. Please try again in a few minutes."); return; }
          toast.error(language === "el" ? "Αυτό το email είναι ήδη καταχωρημένο" : "This email is already registered");
        } else if (error.message.toLowerCase().includes("rate limit")) {
          const newAttempts = failedAttempts + 1; setFailedAttempts(newAttempts);
          toast.error(newAttempts >= 5 ? (language === "el" ? "Πολλές αποτυχημένες προσπάθειες." : "Too many failed attempts.") : (language === "el" ? "Κάτι πήγε στραβά." : "Something went wrong."));
        } else { toast.error(error.message); }
        return;
      }
      if (data.user) {
        setFailedAttempts(0);
        const { error: profileUpsertError } = await supabase.from("profiles").upsert({ id: data.user.id, first_name: values.firstName, last_name: values.lastName, phone: values.phone, gender: values.gender ?? null, age: typeof values.age === "number" ? values.age : null, town: values.town, city: values.town } as any, { onConflict: "id" });
        if (profileUpsertError) console.error("Profile upsert error:", profileUpsertError);
        if (isStudent && universityEmail && selectedUniversity) {
          const universityData = CYPRUS_UNIVERSITIES.find(u => u.domain === selectedUniversity);
          if (universityData) {
            const normalizedEmail = universityEmail.toLowerCase().trim();
            const { data: existingApproved } = await supabase.from("student_verifications").select("id").eq("university_email", normalizedEmail).eq("status", "approved").maybeSingle();
            if (existingApproved) toast.error(language === "el" ? "Αυτό το φοιτητικό email χρησιμοποιείται ήδη" : "This university email is already used by another account");
            else {
              const { data: verificationData, error: verificationError } = await supabase.from("student_verifications").insert({ user_id: data.user.id, university_email: normalizedEmail, university_name: universityData.name, university_domain: universityData.domain, status: "pending" } as any).select("id").single();
              if (verificationError) { if (verificationError.code === "23505") toast.error(language === "el" ? "Αυτό το φοιτητικό email χρησιμοποιείται ήδη" : "This university email is already used by another account"); }
              else if (verificationData) {
                try {
                  setSendingVerification(true);
                  const { error: emailError } = await supabase.functions.invoke("send-student-verification-email", { body: { verificationId: verificationData.id, universityEmail: normalizedEmail, universityName: universityData.name, userName: `${values.firstName} ${values.lastName}` } });
                  if (!emailError) setStudentVerificationSent(true);
                } finally { setSendingVerification(false); }
              }
            }
          }
        }
        confetti.trigger();
        setOtpEmail(values.email); setRedirectAfterVerify(redirectUrl); setShowOtpScreen(true);
        toast.success(language === "el" ? "Έλεγξε το email σου για τον κωδικό επαλήθευσης" : "Check your email for the verification code");
      }
    } catch { toast.error(tt.failed); } finally { setIsLoading(false); }
  };

  const togglePreference = (category: string) => setSelectedPreferences(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) return;
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: "signup" });
      if (error) { toast.error(language === "el" ? "Λάθος κωδικός. Δοκίμασε ξανά." : "Wrong verification code. Try again."); setOtpCode(""); }
      else { confetti.trigger(); setShowSuccessScreen(true); setTimeout(() => navigate(redirectAfterVerify), 3500); }
    } catch { toast.error(language === "el" ? "Κάτι πήγε στραβά" : "Something went wrong"); }
    finally { setVerifyingOtp(false); }
  };

  const handleResendOtp = async () => {
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: otpEmail });
      if (error) toast.error(error.message);
      else toast.success(language === "el" ? "Νέος κωδικός στάλθηκε" : "New code sent to your email");
    } finally { setVerifyingOtp(false); }
  };

  const fieldClass = "h-10 rounded-xl bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 text-sm";
  const labelClass = "text-white/55 text-xs font-medium tracking-wide uppercase";

  // ── Beta loading ──
  if (betaLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><OceanLoader size="lg" /></div>;
  }

  // ── Beta mode (coming soon) ──
  if (isBetaMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,hsl(var(--primary)/0.2),transparent)]" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"><ArrowLeft className="w-4 h-4" /></button>
            <LanguageToggle />
          </div>
          <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Clock className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h1 className="font-cinzel font-black text-3xl text-white mb-1">ΦΟΜΟ</h1>
            <h2 className="font-urbanist font-black text-xl text-white mb-3">{language === "el" ? betaMessage.el : betaMessage.en}</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-6">{language === "el" ? "Ετοιμάζουμε κάτι ξεχωριστό! Η εφαρμογή βρίσκεται σε φάση beta." : "We're preparing something special! The app is currently in beta."}</p>
            <div className="flex justify-center gap-2 mb-6">
              {[0, 0.2, 0.4].map((d, i) => <Sparkles key={i} className="h-5 w-5 text-seafoam animate-bounce" style={{ animationDelay: `${d}s` }} />)}
            </div>
            <div className="pt-5 border-t border-white/[0.08]">
              <p className="text-sm text-white/35 mb-3">{language === "el" ? "Είστε επιχείρηση με κωδικό;" : "Are you a business with an invite code?"}</p>
              <Button variant="outline" onClick={() => navigate("/signup-business")} className="gap-2 border-white/10 text-white/60 hover:text-white hover:border-white/20">
                <Store className="h-4 w-4" />{language === "el" ? "Εγγραφή Επιχείρησης" : "Business Signup"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Success screen ──
  if (showSuccessScreen) {
    return (
      <>
        <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={120} />
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,hsl(var(--seafoam)/0.15),transparent)]" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-sm w-full text-center p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <SuccessCheckmark isVisible={true} size="lg" className="mx-auto mb-4" />
            <h2 className="font-urbanist font-black text-2xl text-white mb-2">{language === "el" ? "Καλωσόρισες στο ΦΟΜΟ!" : "Welcome to FOMO!"}</h2>
            <p className="text-white/45 text-sm mb-4">{language === "el" ? "Η εγγραφή σου ολοκληρώθηκε επιτυχώς!" : "Your registration was completed successfully!"}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-white/30">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === "el" ? "Ανακατεύθυνση..." : "Redirecting..."}
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── OTP screen ──
  if (showOtpScreen) {
    return (
      <>
        <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={80} />
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,hsl(var(--primary)/0.2),transparent)]" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-sm w-full">
            <div className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-seafoam/10 flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6 text-seafoam" />
              </div>
              <div>
                <h2 className="font-urbanist font-black text-2xl text-white mb-1">{language === "el" ? "Επαλήθευση Email" : "Email Verification"}</h2>
                <p className="text-white/40 text-sm">{language === "el" ? `Κωδικός στάλθηκε στο` : `Code sent to`}</p>
                <p className="text-seafoam text-sm font-mono mt-0.5">{otpEmail}</p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length < 6 || verifyingOtp}
                className="w-full h-11 flex items-center justify-center gap-2 bg-seafoam text-aegean font-bold rounded-xl hover:bg-seafoam/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> {language === "el" ? "Επαλήθευση" : "Verify"}</>}
              </button>
              <button type="button" className="text-sm text-white/30 hover:text-white/50 transition-colors" onClick={handleResendOtp} disabled={verifyingOtp}>
                {language === "el" ? "Δεν λάβατε κωδικό; Αποστολή ξανά" : "Didn't receive a code? Resend"}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Main signup form ──
  return (
    <>
      <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={80} />
      <div className="min-h-screen bg-background">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-20 bg-[radial-gradient(ellipse,hsl(var(--primary)/0.5),transparent)]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 opacity-15 bg-[radial-gradient(ellipse,hsl(var(--seafoam)/0.6),transparent)]" />
        </div>

        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-8 py-4 bg-background/80 backdrop-blur-md border-b border-white/[0.06]">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>
          <span className="font-cinzel font-black text-base text-white tracking-widest">ΦΟΜΟ</span>
          <LanguageToggle />
        </div>

        <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 relative z-10">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-seafoam/10 border border-seafoam/25 mb-4">
              <Zap className="w-3 h-3 text-seafoam fill-seafoam" />
              <span className="text-seafoam text-xs font-semibold tracking-wider uppercase">{language === "el" ? "Εγγραφή χρήστη" : "User Signup"}</span>
            </div>
            <h1 className="font-urbanist font-black text-4xl sm:text-5xl text-white leading-tight">
              {language === "el" ? "Ξεκίνα να" : "Start"}
              <br />
              <span className="text-gradient-ocean">{language === "el" ? "ανακαλύπτεις." : "discovering."}</span>
            </h1>
            <p className="text-white/40 text-sm mt-3">{language === "el" ? "Events, venues & deals σε όλη την Κύπρο — δωρεάν." : "Events, venues & deals across Cyprus — free."}</p>
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 sm:p-7">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>{language === "el" ? "Όνομα" : "First Name"}</FormLabel>
                        <FormControl><Input placeholder={language === "el" ? "Γιώργος" : "George"} {...field} className={fieldClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>{language === "el" ? "Επίθετο" : "Last Name"}</FormLabel>
                        <FormControl><Input placeholder={language === "el" ? "Παπαδόπουλος" : "Papadopoulos"} {...field} className={fieldClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Age */}
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{language === "el" ? "Ηλικία" : "Age"}</FormLabel>
                      <FormControl><Input type="number" {...field} className={fieldClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Email */}
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{t.email}</FormLabel>
                      <FormControl><Input type="email" placeholder={t.emailPlaceholder} {...field} className={fieldClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Password */}
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{t.password}</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder={t.passwordPlaceholder} {...field} onChange={e => { field.onChange(e); setPasswordLength(e.target.value.trim().length); }} className={fieldClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Town */}
                  <FormField control={form.control} name="town" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${labelClass} flex items-center gap-1.5`}><MapPin className="h-3 w-3 text-seafoam" />{language === "el" ? "Πόλη" : "Town"}</FormLabel>
                      <Select onValueChange={v => safeSelectChange(field.value, v, field.onChange)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className={fieldClass}>
                            <SelectValue placeholder={language === "el" ? "Επιλέξτε πόλη" : "Select town"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>{getCityOptions(language).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Phone */}
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${labelClass} flex items-center gap-1.5`}><Phone className="h-3 w-3 text-seafoam" />{language === "el" ? "Τηλέφωνο" : "Phone"}</FormLabel>
                      <FormControl>
                        <PhoneInput value={field.value} onChange={field.onChange} language={language} selectClassName={fieldClass} inputClassName={fieldClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Gender */}
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{language === "el" ? "Φύλο" : "Gender"}</FormLabel>
                      <Select onValueChange={v => safeSelectChange(field.value, v, field.onChange)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className={fieldClass}>
                            <SelectValue placeholder={language === "el" ? "Επιλέξτε (προαιρετικό)" : "Select (optional)"} />
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

                  {/* Preferences */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-seafoam" />
                      <span className={labelClass}>{language === "el" ? "Τι σας αρέσει;" : "What do you like?"}</span>
                    </div>
                    <p className="text-white/30 text-xs">{language === "el" ? "Επιλέξτε όσα θέλετε για καλύτερες προτάσεις" : "Select as many as you like for better recommendations"}</p>
                    <div className="[&>div]:space-y-1.5">
                      <InterestSelectorList categories={getCategoriesForUser(language)} selectedIds={selectedPreferences} onToggle={togglePreference} />
                    </div>
                  </div>

                  {/* Student verification */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Checkbox id="isStudent" checked={isStudent} onCheckedChange={checked => setIsStudent(checked === true)} />
                      <label htmlFor="isStudent" className="flex items-center gap-1.5 text-sm text-white/60 cursor-pointer">
                        <GraduationCap className="h-3.5 w-3.5 text-seafoam" />
                        {language === "el" ? "Είμαι φοιτητής/τρια" : "I am a student"}
                      </label>
                    </div>
                    <AnimatePresence>
                      {isStudent && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                          <p className="text-white/30 text-xs">{language === "el" ? "Επαληθεύστε τη φοιτητική σας ιδιότητα για εκπτώσεις." : "Verify your student status to receive discounts."}</p>
                          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                            <SelectTrigger className={fieldClass}><SelectValue placeholder={language === "el" ? "Επιλέξτε πανεπιστήμιο" : "Select university"} /></SelectTrigger>
                            <SelectContent>{CYPRUS_UNIVERSITIES.map(uni => <SelectItem key={uni.domain} value={uni.domain}>{language === "el" ? uni.nameEl : uni.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {selectedUniversity && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                              <Input type="email" value={universityEmail} onChange={e => setUniversityEmail(e.target.value)} placeholder={`example@${selectedUniversity}`} className={fieldClass} />
                              {studentEmailError && <p className="text-xs text-red-400">{studentEmailError}</p>}
                              {universityEmail && !studentEmailError && isValidUniversityEmail(universityEmail) && (
                                <p className="text-xs text-emerald-400">{language === "el" ? "Θα λάβετε email επαλήθευσης μετά την εγγραφή." : "You will receive a verification email after signup."}</p>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading || passwordLength < 8}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-seafoam text-aegean font-bold rounded-xl hover:bg-seafoam/90 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-seafoam/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t.signupButton} <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <p className="text-xs text-center text-white/25">
                    {language === "el" ? (
                      <>Με την εγγραφή σας αποδέχεστε τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam/70 hover:text-seafoam">όρους χρήσης</a> και την <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam/70 hover:text-seafoam">πολιτική απορρήτου</a>.</>
                    ) : (
                      <>By signing up you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-seafoam/70 hover:text-seafoam">terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-seafoam/70 hover:text-seafoam">privacy policy</a>.</>
                    )}
                  </p>

                  <div className="text-center text-sm text-white/30">
                    {t.alreadyHaveAccount}{" "}
                    <Link to="/login" className="text-seafoam hover:text-seafoam/80 font-semibold transition-colors">{t.loginLink}</Link>
                  </div>
                </form>
              </Form>

              <div className="mt-5 pt-4 border-t border-white/[0.07] text-right">
                <Link to="/signup-business" className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors">
                  <Store className="h-3.5 w-3.5" />{t.businessSignupLink}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Signup;
