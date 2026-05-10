import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { authTranslations } from "@/translations/authTranslations";
import { toastTranslations } from "@/translations/toastTranslations";
import { validationTranslations } from "@/translations/validationTranslations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = authTranslations[language];
  const tt = toastTranslations[language];
  const vt = validationTranslations[language];

  const forgotPasswordSchema = z.object({
    email: z.string().email({ message: vt.invalidEmail }),
  });

  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: tt.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: tt.sent, description: t.checkEmailForReset });
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:flex-col lg:justify-center lg:w-[400px] xl:w-[460px] flex-shrink-0 relative border-r border-white/[0.06] px-10 xl:px-14">
        <div className="absolute top-1/2 left-0 w-[360px] h-[360px] bg-seafoam/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
        <div className="relative z-10">
          <h1
            className="font-urbanist font-black leading-none tracking-[-0.05em] mb-4"
            style={{ fontSize: "clamp(4.5rem, 7vw, 6.5rem)" }}
          >
            <span className="text-[#7EC8F0]">Φ</span><span className="text-white">ΟΜΟ</span>
          </h1>
          <p className="font-inter text-white/45 text-base leading-relaxed">
            {language === 'el'
              ? 'Επαναφορά κωδικού πρόσβασης.'
              : 'Secure password recovery.'}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-seafoam/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 relative z-10">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backToLogin}
          </button>
          <LanguageToggle />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[420px] relative z-10">

            {/* Heading */}
            <div className="mb-8">
              <h2
                className="font-urbanist font-black text-white leading-none tracking-[-0.03em] mb-3"
                style={{ fontSize: "clamp(2.2rem, 5vw, 3rem)" }}
              >
                {t.forgotPasswordTitle}
              </h2>
              <p className="font-inter text-white/45 text-sm">
                {t.forgotPasswordDesc}
              </p>
            </div>

            {/* Card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                            <Input
                              type="email"
                              placeholder={t.emailPlaceholder}
                              {...field}
                              className="rounded-xl h-11 pl-10 placeholder:text-white/40"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t.sending : t.sendEmail}
                  </button>
                </form>
              </Form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
