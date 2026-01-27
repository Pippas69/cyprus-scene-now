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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative py-10 sm:py-14 md:py-20 overflow-hidden">
      {/* Solid seafoam background - continues from MarqueeSection */}
      <div className="absolute inset-0 bg-[#4dd4c4]" />
      
      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10 md:mb-12"
        >
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-5xl font-bold text-aegean mb-2 sm:mb-4 tracking-tight">
            {t.title}
          </h2>
          <p className="text-aegean/70 text-sm sm:text-base md:text-lg px-2">
            {t.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6"
        >
          {t.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              {/* Icon container */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-seafoam to-aegean flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
              </div>
              
              <h3 className="font-poppins text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 text-foreground">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
