import { motion } from "framer-motion";
import { TrendingUp, Target, Sparkles, ArrowRight } from "lucide-react";

interface ValueSectionProps {
  language: "el" | "en";
}

const ValueSection = ({ language }: ValueSectionProps) => {
  const text = {
    el: {
      title: "Πώς το ΦΟΜΟ σε βοηθάει",
      subtitle: "Μια πλατφόρμα, άπειρες δυνατότητες",
      values: [
        {
          icon: Target,
          title: "Στοχευμένη Ανακάλυψη",
          description: "Βρείτε ακριβώς αυτό που ψάχνετε — εκδηλώσεις, προσφορές και εμπειρίες προσαρμοσμένες στα ενδιαφέροντά σας.",
        },
        {
          icon: TrendingUp,
          title: "Αύξηση Εμπειριών",
          description: "Ζήστε περισσότερα, ανακαλύψτε νέα μέρη και δημιουργήστε αναμνήσεις που θα θυμάστε.",
        },
        {
          icon: Sparkles,
          title: "Αποκλειστικά Προνόμια",
          description: "Πρόσβαση σε προσφορές και εκπτώσεις που δεν θα βρείτε πουθενά αλλού.",
        },
      ],
    },
    en: {
      title: "How ΦΟΜΟ helps you",
      subtitle: "One platform, endless possibilities",
      values: [
        {
          icon: Target,
          title: "Targeted Discovery",
          description: "Find exactly what you're looking for — events, offers and experiences tailored to your interests.",
        },
        {
          icon: TrendingUp,
          title: "Enhanced Experiences",
          description: "Live more, discover new places and create memories you'll cherish.",
        },
        {
          icon: Sparkles,
          title: "Exclusive Perks",
          description: "Access offers and discounts you won't find anywhere else.",
        },
      ],
    },
  };

  const t = text[language];

  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Gradient background - white at bottom transitioning to seafoam at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-seafoam/10 to-seafoam/20" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {t.values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ y: -8 }}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-seafoam/20 hover:shadow-lg hover:border-seafoam/40 transition-all duration-300"
            >
              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-seafoam/5 to-aegean/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-seafoam to-aegean flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="font-poppins text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
                
                <motion.div
                  className="flex items-center gap-1 mt-4 text-seafoam font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <span>{language === "el" ? "Μάθε περισσότερα" : "Learn more"}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueSection;
