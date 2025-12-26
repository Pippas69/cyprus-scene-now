import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, QrCode } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const text = {
    el: {
      title: "Γιατί ΦΟΜΟ;",
      features: [
        {
          icon: MapPin,
          title: "Ανακαλύψτε",
          description: "Βρείτε εκδηλώσεις κοντά σας σε πραγματικό χρόνο. Από beach parties μέχρι wine tastings.",
          detail: "Με χάρτη και GPS εντοπισμό",
          color: "sunset-coral",
          gradient: "from-sunset-coral to-sunset-coral/60",
        },
        {
          icon: Users,
          title: "Συμμετέχετε",
          description: "Δείτε ποιοι πάνε, κάντε RSVP με ένα tap και μην χάσετε τίποτα.",
          detail: "Συνδεθείτε με φίλους",
          color: "aegean",
          gradient: "from-aegean to-aegean/60",
        },
        {
          icon: QrCode,
          title: "Κερδίστε",
          description: "Αποκλειστικές εκπτώσεις QR από συνεργαζόμενες επιχειρήσεις. Σκανάρετε και εξοικονομήστε.",
          detail: "Αποκλειστικές προσφορές",
          color: "seafoam",
          gradient: "from-seafoam to-seafoam/60",
        },
      ],
    },
    en: {
      title: "Why ΦΟΜΟ?",
      features: [
        {
          icon: MapPin,
          title: "Discover",
          description: "Find events near you in real-time. From beach parties to wine tastings.",
          detail: "With map and GPS tracking",
          color: "sunset-coral",
          gradient: "from-sunset-coral to-sunset-coral/60",
        },
        {
          icon: Users,
          title: "Join",
          description: "See who's going, RSVP with one tap, and never miss out.",
          detail: "Connect with friends",
          color: "aegean",
          gradient: "from-aegean to-aegean/60",
        },
        {
          icon: QrCode,
          title: "Save",
          description: "Exclusive QR discounts from partner businesses. Scan and save.",
          detail: "Exclusive offers",
          color: "seafoam",
          gradient: "from-seafoam to-seafoam/60",
        },
      ],
    },
  };

  const t = text[language];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-seafoam/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sunset-coral/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-cinzel text-4xl md:text-5xl font-bold text-center mb-16 text-foreground"
        >
          {t.title}
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {t.features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              whileHover={{ y: -12, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative bg-card rounded-3xl p-8 shadow-sm border border-border hover:shadow-xl transition-all duration-300"
              style={{ perspective: 1000, transformStyle: "preserve-3d" }}
            >
              {/* Glow ring effect on hover */}
              <motion.div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 blur-xl transition-opacity duration-500`}
                animate={{ opacity: hoveredIndex === index ? 0.15 : 0 }}
              />
              
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br from-${feature.color}/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                {/* Icon container with animation */}
                <motion.div 
                  className={`w-16 h-16 rounded-2xl bg-${feature.color}/10 flex items-center justify-center mb-6 transition-all duration-300`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  animate={{
                    y: hoveredIndex === index ? [0, -4, 0] : 0,
                  }}
                  transition={{
                    y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                  }}
                >
                  <feature.icon className={`w-8 h-8 text-${feature.color}`} />
                </motion.div>
                
                <h3 className="font-poppins text-2xl font-bold mb-3 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Reveal detail on hover */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: hoveredIndex === index ? 1 : 0,
                    height: hoveredIndex === index ? "auto" : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className={`inline-flex items-center gap-2 text-sm font-medium text-${feature.color} pt-2 border-t border-border/50`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {feature.detail}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
