import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Sparkles, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RippleButton } from "@/components/ui/ripple-button";
import { toast } from "sonner";

interface NewsletterSectionProps {
  language: "en" | "el";
}

const NewsletterSection = ({ language }: NewsletterSectionProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const content = {
    en: {
      title: "Never Miss an Event",
      subtitle: "Get weekly updates on the hottest events, exclusive offers, and insider tips delivered to your inbox.",
      placeholder: "Enter your email",
      button: "Subscribe",
      success: "You're subscribed!",
      successMessage: "Welcome to ΦΟΜΟ! Check your inbox for confirmation.",
    },
    el: {
      title: "Μη Χάσεις Καμία Εκδήλωση",
      subtitle: "Λάβε εβδομαδιαίες ενημερώσεις για τις πιο hot εκδηλώσεις, αποκλειστικές προσφορές και insider tips.",
      placeholder: "Εισάγετε το email σας",
      button: "Εγγραφή",
      success: "Εγγραφήκατε!",
      successMessage: "Καλώς ήρθατε στο ΦΟΜΟ! Ελέγξτε τα εισερχόμενά σας.",
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    setEmail("");
    
    toast.success(content[language].successMessage);
    
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-aegean/10 via-seafoam/5 to-seafoam/10" />
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-aegean/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-seafoam/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aegean/10 text-aegean mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Newsletter</span>
          </div>

          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            {content[language].title}
          </h2>
          
          <p className="text-muted-foreground text-lg mb-8">
            {content[language].subtitle}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={content[language].placeholder}
                className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-aegean"
                required
              />
            </div>
            
            <RippleButton
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="h-12 px-8 bg-gradient-ocean hover:opacity-90 text-white font-medium"
              rippleColor="rgba(255, 255, 255, 0.3)"
            >
              {isSuccess ? (
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  {content[language].success}
                </span>
              ) : isSubmitting ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                </span>
              ) : (
                content[language].button
              )}
            </RippleButton>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            {language === "en"
              ? "We respect your privacy. Unsubscribe at any time."
              : "Σεβόμαστε την ιδιωτικότητά σας. Διαγραφή ανά πάσα στιγμή."}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
