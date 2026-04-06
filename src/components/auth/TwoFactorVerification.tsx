import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  el: {
    title: "Επαλήθευση 2FA",
    subtitle: "Εισάγετε τον 6ψήφιο κωδικό που στάλθηκε στο email σας",
    verify: "Επαλήθευση",
    verifying: "Επαλήθευση...",
    resend: "Αποστολή νέου κωδικού",
    resending: "Αποστολή...",
    resent: "Νέος κωδικός εστάλη!",
    invalidCode: "Μη έγκυρος ή ληγμένος κωδικός",
    error: "Κάτι πήγε στραβά",
    cancel: "Ακύρωση",
  },
  en: {
    title: "2FA Verification",
    subtitle: "Enter the 6-digit code sent to your email",
    verify: "Verify",
    verifying: "Verifying...",
    resend: "Resend code",
    resending: "Sending...",
    resent: "New code sent!",
    invalidCode: "Invalid or expired code",
    error: "Something went wrong",
    cancel: "Cancel",
  },
};

interface TwoFactorVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({ onSuccess, onCancel }: TwoFactorVerificationProps) => {
  const { language } = useLanguage();
  const t = translations[language];
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-2fa-code", {
        body: { code },
      });

      if (error) throw error;

      if (data?.success) {
        onSuccess();
      } else {
        toast.error(t.invalidCode);
        setCode("");
      }
    } catch {
      toast.error(t.error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke("send-2fa-code");
      if (error) throw error;
      toast.success(t.resent);
    } catch {
      toast.error(t.error);
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="bg-card rounded-3xl shadow-elegant p-6 sm:p-8 w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
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

        <div className="space-y-3">
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
            variant="gradient"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.verifying}
              </>
            ) : (
              t.verify
            )}
          </Button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-accent hover:text-accent/80 hover:underline font-medium"
            >
              {isResending ? t.resending : t.resend}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
