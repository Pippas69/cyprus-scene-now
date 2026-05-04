import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, Zap, Calendar, Users, MapPin, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { authTranslations } from "@/translations/authTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { TwoFactorVerification } from "@/components/auth/TwoFactorVerification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<{ path: string; message: string } | null>(null);
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];

  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [showVerifyBlock, setShowVerifyBlock] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const loginSchema = z.object({
    email: z.string().trim().email({ message: t.invalidEmail }),
    password: z.string().min(1, { message: t.passwordTooShort })
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  useEffect(() => {
    const msg = location.state?.message;
    if (msg) {
      toast.success(msg, { duration: 5000 });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.message, navigate, location.pathname]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillEmail = params.get("email");
    if (prefillEmail) form.setValue("email", prefillEmail);
  }, [location.search]);

  const performRedirect = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    const { data: business } = await supabase.from("businesses").select("id").eq("user_id", userId).maybeSingle();
    let redirectPath = "/feed";
    let successMessage = t.loginSuccess;
    if (profile?.role === "admin") { redirectPath = "/admin/verification"; successMessage = t.adminWelcome; }
    else if (business) { redirectPath = "/dashboard-business"; successMessage = t.businessWelcome; }
    setPendingRedirect({ path: redirectPath, message: successMessage });
    return { path: redirectPath, message: successMessage };
  };

  const triggerResendForUnconfirmed = async (email: string): Promise<boolean> => {
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    if (!resendError) return true;
    const rmsg = (resendError.message || "").toLowerCase();
    if (rmsg.includes("rate limit") || rmsg.includes("too many")) {
      toast.error(language === "el" ? "Πάρα πολλές προσπάθειες." : "Too many attempts. Please try again in a few minutes.");
      return false;
    }
    if (rmsg.includes("already confirmed")) {
      toast.error(language === "el" ? "Ο λογαριασμός φαίνεται ήδη επιβεβαιωμένος." : "Account already appears confirmed. Please try signing in again.");
      setShowVerifyBlock(false); setUnconfirmedEmail(null);
      return false;
    }
    toast.error(resendError.message);
    return false;
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) toast.error(t.wrongCredentials);
        else if (error.message.includes("Email not confirmed") || error.message.toLowerCase().includes("not confirmed")) {
          setUnconfirmedEmail(values.email); setShowVerifyBlock(true); setOtpCode("");
          toast.error(t.emailNotConfirmed);
        } else toast.error(error.message);
        return;
      }
      if (data.user) {
        const { data: twoFaSettings } = await supabase.from("user_2fa_settings").select("is_enabled").eq("user_id", data.user.id).maybeSingle();
        if (twoFaSettings?.is_enabled) {
          await supabase.functions.invoke("send-2fa-code");
          await performRedirect(data.user.id);
          setShow2FA(true);
        } else {
          const redirect = await performRedirect(data.user.id);
          toast.success(redirect.message);
          navigate(redirect.path);
        }
      }
    } catch { toast.error(tt.failed); } finally { setIsLoading(false); }
  };

  const handleResendVerificationCode = async () => {
    if (!unconfirmedEmail) return;
    setResendingCode(true);
    try {
      const ok = await triggerResendForUnconfirmed(unconfirmedEmail);
      if (ok) toast.success(language === "el" ? "Στάλθηκε νέος κωδικός." : "A new verification code was sent to your email.");
    } finally { setResendingCode(false); }
  };

  const handleVerifyUnconfirmed = async () => {
    if (!unconfirmedEmail || otpCode.length < 6) return;
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: unconfirmedEmail.trim(), token: otpCode, type: "signup" });
      if (error) { toast.error(language === "el" ? "Λάθος κωδικός." : "Wrong verification code. Try again."); setOtpCode(""); return; }
      if (data.user) { const redirect = await performRedirect(data.user.id); toast.success(redirect.message); navigate(redirect.path); }
    } catch { toast.error(language === "el" ? "Κάτι πήγε στραβά" : "Something went wrong"); }
    finally { setVerifyingOtp(false); }
  };

  const cancelVerifyBlock = () => { setShowVerifyBlock(false); setUnconfirmedEmail(null); setOtpCode(""); };
  const handle2FASuccess = () => { setShow2FA(false); if (pendingRedirect) { toast.success(pendingRedirect.message); navigate(pendingRedirect.path); } };
  const handle2FACancel = async () => { setShow2FA(false); setPendingRedirect(null); await supabase.auth.signOut(); };

  const copy = {
    el: { headline: "Καλωσόρισες\nπίσω.", sub: "Ανακάλυψε events, venues και exclusive deals σε όλη την Κύπρο.", signIn: "Σύνδεση στο", stats: [{ v: "500+", l: "Events" }, { v: "10K+", l: "Χρήστες" }, { v: "200+", l: "Venues" }] },
    en: { headline: "Welcome\nback.", sub: "Discover events, venues and exclusive deals across Cyprus.", signIn: "Sign in to", stats: [{ v: "500+", l: "Events" }, { v: "10K+", l: "Users" }, { v: "200+", l: "Venues" }] },
  };
  const c = copy[language];

  return (
    <>
      <div className="min-h-screen bg-background flex overflow-hidden">
        {/* ── Left branding panel (desktop) ── */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_50%,hsl(var(--primary)/0.25),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,hsl(var(--seafoam)/0.12),transparent)]" />
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* Top nav */}
          <div className="relative z-10 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> {language === "el" ? "Αρχική" : "Home"}
            </button>
            <LanguageToggle />
          </div>

          {/* Main branding */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-seafoam/10 border border-seafoam/25">
              <Zap className="w-3 h-3 text-seafoam fill-seafoam" />
              <span className="text-seafoam text-xs font-semibold tracking-wider uppercase">ΦΟΜΟ</span>
            </div>
            <h1 className="font-urbanist font-black text-5xl xl:text-6xl text-white leading-[0.92] tracking-tight whitespace-pre-line">
              {c.headline}
            </h1>
            <p className="text-white/45 text-base leading-relaxed max-w-xs">{c.sub}</p>

            {/* Stats row */}
            <div className="flex items-center gap-6 pt-2">
              {c.stats.map((s) => (
                <div key={s.l}>
                  <p className="font-urbanist font-black text-xl text-white/90">{s.v}</p>
                  <p className="text-white/35 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating feature chips */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col gap-2"
          >
            {[
              { icon: Calendar, label: language === "el" ? "Εκδηλώσεις & Events" : "Events & Experiences" },
              { icon: MapPin, label: language === "el" ? "Venues σε όλη Κύπρο" : "Venues across Cyprus" },
              { icon: Users, label: language === "el" ? "10K+ ενεργοί χρήστες" : "10K+ active users" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl w-fit">
                <Icon className="w-3.5 h-3.5 text-seafoam" />
                <span className="text-white/55 text-xs">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-cinzel font-black text-lg text-white tracking-widest">ΦΟΜΟ</span>
            <LanguageToggle />
          </div>

          <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[420px]"
            >
              {/* Form header */}
              <div className="mb-8">
                <p className="text-seafoam text-xs font-semibold tracking-widest uppercase mb-2">
                  {language === "el" ? "Σύνδεση" : "Sign In"}
                </p>
                <h2 className="font-urbanist font-black text-3xl sm:text-4xl text-white leading-tight">
                  {c.signIn}{" "}
                  <span className="font-cinzel text-seafoam">ΦΟΜΟ</span>
                </h2>
              </div>

              {/* Form card */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs font-medium tracking-wide uppercase">{t.email}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t.emailPlaceholder}
                              {...field}
                              className="h-11 rounded-xl bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 focus:ring-seafoam/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/60 text-xs font-medium tracking-wide uppercase">{t.password}</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder={t.passwordPlaceholder}
                              {...field}
                              className="h-11 rounded-xl bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/25 focus:border-seafoam/50 focus:ring-seafoam/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <AnimatePresence>
                      {showVerifyBlock && unconfirmedEmail && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Alert className="border-seafoam/30 bg-seafoam/5">
                            <Mail className="h-4 w-4 text-seafoam" />
                            <AlertDescription className="space-y-3 pt-1">
                              <p className="text-sm text-white/70">
                                {language === "el"
                                  ? "Ο λογαριασμός σου δεν έχει επιβεβαιωθεί. Έλεγξε το email σου."
                                  : "Your account isn't verified. Check your email for the code."}
                              </p>
                              <p className="text-xs font-mono text-seafoam">{unconfirmedEmail}</p>
                              <div className="flex justify-center">
                                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                                  <InputOTPGroup>
                                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                                  </InputOTPGroup>
                                </InputOTP>
                              </div>
                              <Button type="button" onClick={handleVerifyUnconfirmed} disabled={verifyingOtp || otpCode.length < 6} className="w-full bg-seafoam text-aegean hover:bg-seafoam/90" size="sm">
                                {verifyingOtp ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{language === "el" ? "Επαλήθευση..." : "Verifying..."}</> : (language === "el" ? "Επαλήθευση" : "Verify code")}
                              </Button>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="flex-1 border-white/10 text-white/50 hover:text-white" disabled={resendingCode} onClick={handleResendVerificationCode}>
                                  {resendingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (language === "el" ? "Αποστολή ξανά" : "Resend")}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="flex-1 text-white/40 hover:text-white/60" onClick={cancelVerifyBlock}>
                                  {language === "el" ? "Άκυρο" : "Cancel"}
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-xs text-seafoam/70 hover:text-seafoam transition-colors"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 flex items-center justify-center gap-2 bg-seafoam text-aegean font-bold rounded-xl hover:bg-seafoam/90 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-seafoam/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          {t.loginButton}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </Form>
              </div>

              {/* Footer links */}
              <div className="mt-6 text-center space-y-3">
                <p className="text-white/35 text-sm">
                  {t.noAccount}{" "}
                  <Link to="/signup" className="text-seafoam hover:text-seafoam/80 font-semibold transition-colors">
                    {t.signupLink}
                  </Link>
                </p>
                <p className="text-white/20 text-xs">
                  {language === "el" ? "Επιχείρηση;" : "A business?"}{" "}
                  <Link to="/signup-business" className="text-white/40 hover:text-white/60 transition-colors">
                    {language === "el" ? "Εγγραφή Επιχείρησης" : "Business Signup"}
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {show2FA && <TwoFactorVerification onSuccess={handle2FASuccess} onCancel={handle2FACancel} />}
    </>
  );
};

export default Login;
