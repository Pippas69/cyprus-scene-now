import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";


const translations = {
  el: {
    signupTitle: "Δημιουργία Λογαριασμού",
    loginTitle: "Σύνδεση",
    email: "Email",
    password: "Κωδικός",
    signup: "Εγγραφή",
    login: "Σύνδεση",
    haveAccount: "Έχετε ήδη λογαριασμό;",
    noAccount: "Δεν έχετε λογαριασμό;",
    verifyTitle: "Επαλήθευση Email",
    verifyDesc: "Εισάγετε τον κωδικό που στάλθηκε στο email σας",
    verify: "Επαλήθευση",
    resend: "Αποστολή ξανά",
    processing: "Επεξεργασία...",
    passwordMin: "Τουλάχιστον 8 χαρακτήρες",
  },
  en: {
    signupTitle: "Create Account",
    loginTitle: "Sign In",
    email: "Email",
    password: "Password",
    signup: "Sign Up",
    login: "Sign In",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    verifyTitle: "Verify Email",
    verifyDesc: "Enter the code sent to your email",
    verify: "Verify",
    resend: "Resend",
    processing: "Processing...",
    passwordMin: "At least 8 characters",
  },
};

interface InlineAuthGateProps {
  onAuthSuccess: () => void;
}

export const InlineAuthGate: React.FC<InlineAuthGateProps> = ({ onAuthSuccess }) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [mode, setMode] = useState<'signup' | 'login' | 'verify'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignup = async () => {
    if (!email || !password) return;
    if (password.length < 8) {
      toast.error(t.passwordMin);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMode('verify');
      toast.success(language === 'el' ? 'Κωδικός επαλήθευσης στάλθηκε!' : 'Verification code sent!');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      onAuthSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'signup',
      });
      if (error) throw error;
      toast.success(language === 'el' ? 'Επαλήθευση επιτυχής!' : 'Verified successfully!');
      onAuthSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) throw error;
      toast.success(language === 'el' ? 'Κωδικός στάλθηκε ξανά!' : 'Code resent!');
    } catch (err: any) {
      toast.error(err.message || 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification screen
  if (mode === 'verify') {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-base">{t.verifyTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.verifyDesc}</p>
          <p className="text-xs font-medium text-primary">{email}</p>
        </div>

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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

        <Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.processing}</> : t.verify}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleResendOtp} disabled={loading} className="w-full text-xs">
          {t.resend}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-base">
          {mode === 'signup' ? t.signupTitle : t.loginTitle}
        </h3>
      </div>

      {/* Email/Password form */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="auth-email" className="text-sm flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> {t.email}
          </Label>
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="auth-password" className="text-sm flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> {t.password}
          </Label>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordMin}
            className="h-9 text-sm"
          />
        </div>

        <Button
          onClick={mode === 'signup' ? handleEmailSignup : handleLogin}
          disabled={loading || !email || !password.trim() || (mode === 'signup' && password.trim().length < 8)}
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.processing}</>
          ) : (
            mode === 'signup' ? t.signup : t.login
          )}
        </Button>
      </div>

      {/* Toggle mode */}
      <div className="text-center">
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        >
          {mode === 'signup' ? t.haveAccount : t.noAccount}
        </button>
      </div>
    </div>
  );
};
