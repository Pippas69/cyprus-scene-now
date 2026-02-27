import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaitlistSignupProps {
  language: "el" | "en";
}

const WaitlistSignup = ({ language }: WaitlistSignupProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const text = {
    el: {
      badge: "Πρόσβαση Νωρίς",
      title: "Γίνε ο πρώτος που θα μάθει!",
      subtitle: "Εγγράψου στη λίστα αναμονής και απόκτησε πρόσβαση πριν από όλους",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      email: "Email",
      password: "Κωδικός",
      button: "Πρόσβαση Νωρίς",
      success: "Επιτυχής εγγραφή! Θα σε ειδοποιήσουμε σύντομα.",
      errorExists: "Αυτό το email χρησιμοποιείται ήδη",
      errorGeneric: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      passwordHint: "Τουλάχιστον 6 χαρακτήρες",
    },
    en: {
      badge: "Early Access",
      title: "Be the first to know!",
      subtitle: "Join the waitlist and get early access before everyone else",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      password: "Password",
      button: "Get Early Access",
      success: "You're on the list! We'll notify you soon.",
      errorExists: "This email is already registered",
      errorGeneric: "Something went wrong. Please try again.",
      passwordHint: "At least 6 characters",
    },
  };

  const t = text[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      toast.error(language === "el" ? "Συμπλήρωσε όλα τα πεδία" : "Please fill all fields");
      return;
    }
    if (password.length < 6) {
      toast.error(t.passwordHint);
      return;
    }
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { first_name: firstName.trim(), last_name: lastName.trim(), is_waitlist: true },
        },
      });
      if (error) {
        toast.error(error.message.includes("already registered") ? t.errorExists : t.errorGeneric);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").update({ is_waitlist: true }).eq("id", data.user.id);
      }
      setIsSuccess(true);
      toast.success(t.success);
      await supabase.auth.signOut();
    } catch {
      toast.error(t.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-20 bg-[#0D3B66]">
        <div className="container mx-auto px-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-seafoam/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-seafoam" />
            </div>
            <h2 className="font-cinzel text-3xl font-bold text-white mb-4">{t.success}</h2>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-[#0D3B66] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-seafoam/8 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-seafoam/15 border border-seafoam/30 backdrop-blur-sm px-5 py-2 rounded-full mb-6 sm:mb-8">
            <Sparkles className="w-4 h-4 text-seafoam" />
            <span className="text-seafoam font-medium text-sm">{t.badge}</span>
          </div>

          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            {t.title}
          </h2>
          <p className="text-white/50 text-sm sm:text-base mb-8 sm:mb-10">{t.subtitle}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder={t.firstName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-seafoam/50 focus:ring-seafoam/20"
                disabled={isLoading}
              />
              <Input
                type="text"
                placeholder={t.lastName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-seafoam/50 focus:ring-seafoam/20"
                disabled={isLoading}
              />
            </div>
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-seafoam/50 focus:ring-seafoam/20"
              disabled={isLoading}
            />
            <div>
              <PasswordInput
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-seafoam/50 focus:ring-seafoam/20"
                disabled={isLoading}
              />
              <p className="text-white/30 text-xs mt-1.5 text-left ml-1">{t.passwordHint}</p>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-seafoam to-seafoam/80 hover:from-seafoam/90 hover:to-seafoam/70 text-aegean font-semibold text-sm sm:text-base rounded-xl transition-all duration-300"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t.button}
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistSignup;
