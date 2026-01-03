import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      title: "Γίνε ο πρώτος που θα μάθει!",
      subtitle: "Εγγράψου στη λίστα αναμονής και απόκτησε πρόσβαση πριν από όλους",
      firstName: "Όνομα",
      lastName: "Επώνυμο",
      email: "Email",
      password: "Κωδικός",
      button: "Εγγραφή στη Λίστα",
      success: "Επιτυχής εγγραφή! Θα σε ειδοποιήσουμε σύντομα.",
      errorExists: "Αυτό το email χρησιμοποιείται ήδη",
      errorGeneric: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
      passwordHint: "Τουλάχιστον 6 χαρακτήρες",
    },
    en: {
      title: "Be the first to know!",
      subtitle: "Join the waitlist and get early access before everyone else",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      password: "Password",
      button: "Join Waitlist",
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
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            is_waitlist: true,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t.errorExists);
        } else {
          toast.error(t.errorGeneric);
        }
        return;
      }

      // Update the profile to mark as waitlist (the trigger should handle it but we ensure it)
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ is_waitlist: true })
          .eq("id", data.user.id);
      }

      setIsSuccess(true);
      toast.success(t.success);
      
      // Sign out immediately so they don't get redirected
      await supabase.auth.signOut();
      
    } catch (err) {
      toast.error(t.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-20 bg-gradient-to-br from-aegean via-ocean to-seafoam">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-cinzel text-3xl font-bold text-white mb-4">
              {t.success}
            </h2>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-aegean via-ocean to-seafoam">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-sand" />
            <span className="text-white/90 text-sm font-medium">
              {language === "el" ? "Πρόσβαση Νωρίς" : "Early Access"}
            </span>
          </div>

          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-white mb-4">
            {t.title}
          </h2>
          <p className="text-white/80 mb-8">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder={t.firstName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-sand"
                disabled={isLoading}
              />
              <Input
                type="text"
                placeholder={t.lastName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-sand"
                disabled={isLoading}
              />
            </div>
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-sand"
              disabled={isLoading}
            />
            <div>
              <Input
                type="password"
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-sand"
                disabled={isLoading}
              />
              <p className="text-white/50 text-xs mt-1 text-left">{t.passwordHint}</p>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sand hover:bg-sand/90 text-aegean font-semibold py-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t.button
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistSignup;
