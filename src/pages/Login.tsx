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
import { ArrowLeft, Sun, Moon, Mail, Loader2, Lock } from "lucide-react";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];

  // Recovery flow for unconfirmed accounts
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
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Pre-fill email from query param (e.g. when redirected from signup)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillEmail = params.get("email");
    if (prefillEmail) {
      form.setValue("email", prefillEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const performRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let redirectPath = "/feed";
    let successMessage = t.loginSuccess;

    if (profile?.role === 'admin') {
      redirectPath = "/admin/verification";
      successMessage = t.adminWelcome;
    } else if (business) {
      redirectPath = "/dashboard-business";
      successMessage = t.businessWelcome;
    }

    setPendingRedirect({ path: redirectPath, message: successMessage });
    return { path: redirectPath, message: successMessage };
  };

  const triggerResendForUnconfirmed = async (email: string): Promise<boolean> => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (!resendError) return true;
    const rmsg = (resendError.message || '').toLowerCase();
    if (rmsg.includes('rate limit') || rmsg.includes('rate_limit') || rmsg.includes('too many')) {
      toast.error(language === 'el'
        ? 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.'
        : 'Too many attempts. Please try again in a few minutes.');
      return false;
    }
    if (rmsg.includes('already confirmed') || rmsg.includes('confirmed')) {
      toast.error(language === 'el'
        ? 'Ο λογαριασμός φαίνεται ήδη επιβεβαιωμένος. Δοκίμασε ξανά να συνδεθείς.'
        : 'Account already appears confirmed. Please try signing in again.');
      setShowVerifyBlock(false);
      setUnconfirmedEmail(null);
      return false;
    }
    toast.error(resendError.message);
    return false;
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t.wrongCredentials);
        } else if (
          error.message.includes("Email not confirmed") ||
          error.message.toLowerCase().includes("email_not_confirmed") ||
          error.message.toLowerCase().includes("not confirmed")
        ) {
          // Edge case: user signed up but never verified the OTP.
          // Show inline alert + offer to resend the code, then verify inline.
          setUnconfirmedEmail(values.email);
          setShowVerifyBlock(true);
          setOtpCode("");
          toast.error(t.emailNotConfirmed);
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Check if user has 2FA enabled
        const { data: twoFaSettings } = await supabase
          .from("user_2fa_settings")
          .select("is_enabled")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (twoFaSettings?.is_enabled) {
          // Send 2FA code and show modal
          await supabase.functions.invoke("send-2fa-code");
          await performRedirect(data.user.id);
          setShow2FA(true);
        } else {
          // Normal flow — no 2FA
          const redirect = await performRedirect(data.user.id);
          toast.success(redirect.message);
          navigate(redirect.path);
        }
      }
    } catch (_error) {
      toast.error(tt.failed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationCode = async () => {
    if (!unconfirmedEmail) return;
    setResendingCode(true);
    try {
      const ok = await triggerResendForUnconfirmed(unconfirmedEmail);
      if (ok) {
        toast.success(language === 'el'
          ? 'Στάλθηκε νέος κωδικός επαλήθευσης στο email σου.'
          : 'A new verification code was sent to your email.');
      }
    } finally {
      setResendingCode(false);
    }
  };

  const handleVerifyUnconfirmed = async () => {
    if (!unconfirmedEmail || otpCode.length < 6) return;
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: unconfirmedEmail.trim(),
        token: otpCode,
        type: 'signup',
      });
      if (error) {
        toast.error(language === 'el'
          ? 'Λάθος κωδικός επαλήθευσης. Δοκίμασε ξανά.'
          : 'Wrong verification code. Try again.');
        setOtpCode("");
        return;
      }
      // verifyOtp creates a session → user is now signed in.
      if (data.user) {
        const redirect = await performRedirect(data.user.id);
        toast.success(redirect.message);
        navigate(redirect.path);
      }
    } catch (_e) {
      toast.error(language === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const cancelVerifyBlock = () => {
    setShowVerifyBlock(false);
    setUnconfirmedEmail(null);
    setOtpCode("");
  };

  const handle2FASuccess = () => {
    setShow2FA(false);
    if (pendingRedirect) {
      toast.success(pendingRedirect.message);
      navigate(pendingRedirect.path);
    }
  };

  const handle2FACancel = async () => {
    setShow2FA(false);
    setPendingRedirect(null);
    await supabase.auth.signOut();
  };

  return (
    <>
      <div className="min-h-screen bg-background flex">

        {/* ── Left branding panel (desktop only) ──────────────── */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:w-[400px] xl:w-[460px] flex-shrink-0 px-12 xl:px-16 relative border-r border-white/[0.06]">
          <div className="absolute top-1/2 left-0 w-[360px] h-[360px] bg-seafoam/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
          <div className="relative z-10">
            <h1 className="font-urbanist font-black leading-none tracking-[-0.05em] mb-4" style={{ fontSize: "clamp(4.5rem, 7vw, 6.5rem)" }}>
              <span className="text-[#7EC8F0]">Φ</span><span className="text-white">ΟΜΟ</span>
            </h1>
            <p className="font-inter text-white/45 text-base leading-relaxed mb-10">
              {language === 'el'
                ? 'Ανακάλυψε nightlife, εστιατόρια και events στην Κύπρο.'
                : 'Discover nightlife, restaurants and events in Cyprus.'}
            </p>
            <div className="space-y-4">
              {[
                { value: "10K+", label: language === 'el' ? "Ενεργοί χρήστες" : "Active users" },
                { value: "500+", label: language === 'el' ? "Επιχειρήσεις" : "Businesses" },
                { value: "50K+", label: language === 'el' ? "Κρατήσεις" : "Reservations" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-urbanist font-black text-seafoam text-xl leading-none">{s.value}</span>
                  <span className="font-inter text-white/35 text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-seafoam/5 rounded-full blur-[140px] pointer-events-none" />

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-6 relative z-10">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-white/55 hover:text-white hover:bg-white/5 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.back}
            </Button>
            <div className="flex items-center gap-1">
              <LanguageToggle />
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-[420px] relative z-10">

              {/* Heading */}
              <div className="mb-8">
                <h2 className="font-urbanist font-black text-white leading-none tracking-[-0.03em] mb-3" style={{ fontSize: "clamp(2.2rem, 5vw, 3rem)" }}>
                  {language === 'el' ? 'Σύνδεση' : 'Sign in'}
                </h2>
                <p className="font-inter text-white/45 text-sm">
                  {t.noAccount}{' '}
                  <Link to="/signup" className="text-seafoam hover:text-seafoam/80 font-medium transition-colors">{t.signupLink}</Link>
                </p>
              </div>

              {/* Form card */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField control={form.control} name="email" render={({ field }) =>
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                            <Input type="email" placeholder={t.emailPlaceholder} {...field} className="rounded-xl h-11 pl-10 placeholder:text-white/40" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                    <FormField control={form.control} name="password" render={({ field }) =>
                      <FormItem>
                        <div className="flex justify-end mb-1">
                          <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-seafoam hover:text-seafoam/80 font-medium transition-colors">
                            {t.forgotPassword}
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none z-10" />
                            <PasswordInput placeholder={t.passwordPlaceholder} {...field} className="rounded-xl h-11 pl-10 placeholder:text-white/40" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />

                    {showVerifyBlock && unconfirmedEmail && (
                      <Alert className="border-seafoam/30 bg-seafoam/5">
                        <Mail className="h-4 w-4 text-seafoam" />
                        <AlertDescription className="space-y-3">
                          <p className="text-sm text-white/70">
                            {language === 'el'
                              ? 'Ο λογαριασμός σου δεν έχει επιβεβαιωθεί ακόμα. Έλεγξε το email σου για τον κωδικό που σου στείλαμε, ή πάτα παρακάτω για να σου στείλουμε νέο.'
                              : "Your account isn't verified yet. Check your email for the code we sent, or tap below to receive a new one."}
                          </p>
                          <p className="text-xs font-medium text-seafoam">{unconfirmedEmail}</p>
                          <div className="flex justify-center pt-1">
                            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <Button type="button" onClick={handleVerifyUnconfirmed} disabled={verifyingOtp || otpCode.length < 6} className="w-full bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-xl h-10" size="sm">
                            {verifyingOtp ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{language === 'el' ? 'Επαλήθευση...' : 'Verifying...'}</> : language === 'el' ? 'Επαλήθευση κωδικού' : 'Verify code'}
                          </Button>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="flex-1 border-white/15 text-white/60 hover:bg-white/5 hover:text-white" disabled={resendingCode} onClick={handleResendVerificationCode}>
                              {resendingCode ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{language === 'el' ? 'Αποστολή...' : 'Sending...'}</> : language === 'el' ? 'Στείλε ξανά κωδικό' : 'Resend code'}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="flex-1 text-white/50 hover:text-white hover:bg-white/5" onClick={cancelVerifyBlock}>
                              {language === 'el' ? 'Άκυρο' : 'Cancel'}
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full h-11 bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full text-base" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.loggingIn}</> : t.loginButton}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {show2FA && (
        <TwoFactorVerification onSuccess={handle2FASuccess} onCancel={handle2FACancel} />
      )}
    </>
  );

};

export default Login;
