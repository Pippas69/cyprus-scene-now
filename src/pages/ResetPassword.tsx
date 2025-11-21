import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLanguage } from "@/hooks/useLanguage";
import { validationTranslations } from "@/translations/validationTranslations";
import { toastTranslations } from "@/translations/toastTranslations";

const createResetPasswordSchema = (language: 'el' | 'en') => {
  const v = validationTranslations[language];
  
  return z.object({
    password: z.string().min(6, { message: v.passwordTooShort }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: v.passwordsNoMatch,
    path: ["confirmPassword"],
  });
};

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = toastTranslations[language];

  const resetPasswordSchema = createResetPasswordSchema(language);
  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(createResetPasswordSchema(language)),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.success,
        description: language === 'el' ? "Ο κωδικός σας άλλαξε επιτυχώς" : "Your password has been changed successfully",
      });
      setTimeout(() => navigate("/login"), 2000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {language === 'el' ? 'Νέος Κωδικός' : 'New Password'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'el' ? 'Εισάγετε τον νέο σας κωδικό' : 'Enter your new password'}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'el' ? 'Νέος Κωδικός' : 'New Password'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{language === 'el' ? 'Επιβεβαίωση Κωδικού' : 'Confirm Password'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (language === 'el' ? "Αποθήκευση..." : "Saving...") 
                  : (language === 'el' ? "Αλλαγή Κωδικού" : "Change Password")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
