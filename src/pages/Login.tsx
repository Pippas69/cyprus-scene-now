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
import { ArrowLeft, Sun, Moon, Mail, Loader2 } from "lucide-react";
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
    <div className="min-h-screen gradient-hero flex items-center justify-center py-4 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-md w-full space-y-2 sm:space-y-8 relative z-10">
        <div className="flex items-center justify-between mb-2 sm:mb-4 -mt-4 sm:mt-0">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:text-seafoam">

            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.back}
          </Button>
          
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-white hover:text-seafoam">

              {theme === "dark" ?
              <Sun className="h-5 w-5" /> :

              <Moon className="h-5 w-5" />
              }
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-elegant p-5 py-8 sm:p-8 md:p-12">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 whitespace-nowrap">
              <span className="font-inter">{language === 'el' ? 'Σύνδεση στο' : 'Login to'}</span>{' '}
              <span className="font-cinzel">ΦΟΜΟ</span>
            </h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) =>
                <FormItem>
                    <FormLabel>{t.email}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t.emailPlaceholder} {...field} className="rounded-xl h-10 sm:h-10 text-base sm:text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />


              <FormField
                control={form.control}
                name="password"
                render={({ field }) =>
                <FormItem>
                    <FormLabel>{t.password}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder={t.passwordPlaceholder} {...field} className="rounded-xl h-10 sm:h-10 text-base sm:text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />


              {showVerifyBlock && unconfirmedEmail && (
                <Alert className="border-accent/40 bg-accent/5">
                  <Mail className="h-4 w-4" />
                  <AlertDescription className="space-y-3">
                    <p className="text-sm">
                      {language === 'el'
                        ? 'Ο λογαριασμός σου δεν έχει επιβεβαιωθεί ακόμα. Έλεγξε το email σου για τον κωδικό που σου στείλαμε, ή πάτα παρακάτω για να σου στείλουμε νέο.'
                        : "Your account isn't verified yet. Check your email for the code we sent, or tap below to receive a new one."}
                    </p>
                    <p className="text-xs font-medium text-primary">{unconfirmedEmail}</p>

                    <div className="flex justify-center pt-1">
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

                    <Button
                      type="button"
                      onClick={handleVerifyUnconfirmed}
                      disabled={verifyingOtp || otpCode.length < 6}
                      className="w-full"
                      size="sm"
                    >
                      {verifyingOtp ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {language === 'el' ? 'Επαλήθευση...' : 'Verifying...'}</>
                      ) : (
                        language === 'el' ? 'Επαλήθευση κωδικού' : 'Verify code'
                      )}
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={resendingCode}
                        onClick={handleResendVerificationCode}
                      >
                        {resendingCode ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          {language === 'el' ? 'Αποστολή...' : 'Sending...'}</>
                        ) : (
                          language === 'el' ? 'Στείλε ξανά κωδικό' : 'Resend code'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={cancelVerifyBlock}
                      >
                        {language === 'el' ? 'Άκυρο' : 'Cancel'}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full h-12 sm:h-12"
                disabled={isLoading}>
                {isLoading ? t.loggingIn : t.loginButton}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-accent hover:text-accent/80 hover:underline mb-4 font-medium">

                  {t.forgotPassword}
                </button>
              </div>

              <div className="text-center text-xs sm:text-sm">
                <span className="text-foreground/80">{t.noAccount}</span>{" "}
                <Link to="/signup" className="text-accent hover:text-accent/80 hover:underline font-semibold">
                  {t.signupLink}
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
    {show2FA && (
      <TwoFactorVerification
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    )}
    </>);

};

export default Login;
