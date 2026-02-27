import { motion } from "framer-motion";
import { Target, TrendingUp, Sparkles } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: {
      title: "Γιατί ΦΟΜΟ;",
      subtitle: "Μια πλατφόρμα, άπειρες δυνατότητες",
      features: [
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
      title: "Why ΦΟΜΟ?",
      subtitle: "One platform, endless possibilities",
      features: [
        {
          icon: Target,
          title: "Targeted Discovery",
          description: "Find exactly what you're looking for — events, offers and experiences tailored to your interests.",
        },
        {
          icon: TrendingUp,
          title: "Enhanced Experiences",
          description: "Live more, discover new places and create memories you'll remember.",
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
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-aegean">
      {/* Subtle texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--seafoam)/0.08),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            {t.title}
          </h2>
          <p className="text-white/50 text-sm sm:text-base md:text-lg max-w-md mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {t.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 hover:border-seafoam/30 transition-all duration-500"
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-seafoam/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-seafoam/15 flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-seafoam/25 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-seafoam" />
                </div>
                
                <h3 className="font-poppins text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
