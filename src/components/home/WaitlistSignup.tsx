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
      passwordHint: "Τουλάχιστον 6 χαρακτήρες"
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
      passwordHint: "At least 6 characters"
    }
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
            is_waitlist: true
          }
        }
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
        await supabase.
        from("profiles").
        update({ is_waitlist: true }).
        eq("id", data.user.id);
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md mx-auto text-center">

            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-seafoam/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-seafoam" />
            </div>
            <h2 className="font-cinzel text-3xl font-bold text-foreground mb-4">
              {t.success}
            </h2>
          </motion.div>
        </div>
      </section>);

  }

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white dark:bg-white">
      <div className="container mx-auto px-3 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-seafoam/80 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full mb-5 sm:mb-6 md:mb-8">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span className="text-white font-medium text-sm sm:text-base">
              {t.badge}
            </span>
          </div>

          {/* Title */}
          


          
          {/* Subtitle */}
          <p className="text-[#555] text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 px-4">{t.subtitle}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-5 max-w-xl mx-auto px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                type="text"
                placeholder={t.firstName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 sm:h-12 md:h-14 !bg-white border border-[#ddd] !text-[#2E2E2E] placeholder:!text-[#999] focus:ring-2 focus:ring-seafoam/30 rounded-full px-4 sm:px-5 md:px-6 text-sm sm:text-base"
                disabled={isLoading} />

              <Input
                type="text"
                placeholder={t.lastName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 sm:h-12 md:h-14 !bg-white border border-[#ddd] !text-[#2E2E2E] placeholder:!text-[#999] focus:ring-2 focus:ring-seafoam/30 rounded-full px-4 sm:px-5 md:px-6 text-sm sm:text-base"
                disabled={isLoading} />

            </div>
            <Input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 sm:h-12 md:h-14 !bg-white border border-[#ddd] !text-[#2E2E2E] placeholder:!text-[#999] focus:ring-2 focus:ring-seafoam/30 rounded-full px-4 sm:px-5 md:px-6 text-sm sm:text-base"
              disabled={isLoading} />

            <div>
              <Input
                type="password"
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 sm:h-12 md:h-14 !bg-white border border-[#ddd] !text-[#2E2E2E] placeholder:!text-[#999] focus:ring-2 focus:ring-seafoam/30 rounded-full px-4 sm:px-5 md:px-6 text-sm sm:text-base"
                disabled={isLoading} />

              <p className="text-[#777] text-xs sm:text-sm mt-1.5 sm:mt-2 text-left ml-3 sm:ml-4">{t.passwordHint}</p>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 sm:h-12 md:h-14 bg-gradient-to-r from-seafoam to-aegean hover:opacity-90 text-white font-semibold text-sm sm:text-base md:text-lg rounded-full transition-all duration-300">

              {isLoading ?
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> :

              <>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  {t.button}
                </>
              }
            </Button>
          </form>
        </motion.div>
      </div>
    </section>);

};

export default WaitlistSignup;