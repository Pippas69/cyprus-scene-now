import { motion } from "framer-motion";
import { MapPin, Users, QrCode } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: {
      title: "Γιατί ΦΟΜΟ;",
      features: [
        {
          icon: MapPin,
          title: "Ανακαλύψτε",
          description: "Βρείτε εκδηλώσεις κοντά σας σε πραγματικό χρόνο. Από beach parties μέχρι wine tastings.",
          color: "sunset-coral",
        },
        {
          icon: Users,
          title: "Συμμετέχετε",
          description: "Δείτε ποιοι πάνε, κάντε RSVP με ένα tap και μην χάσετε τίποτα.",
          color: "aegean",
        },
        {
          icon: QrCode,
          title: "Κερδίστε",
          description: "Αποκλειστικές εκπτώσεις QR από συνεργαζόμενες επιχειρήσεις. Σκανάρετε και εξοικονομήστε.",
          color: "seafoam",
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
          color: "sunset-coral",
        },
        {
          icon: Users,
          title: "Join",
          description: "See who's going, RSVP with one tap, and never miss out.",
          color: "aegean",
        },
        {
          icon: QrCode,
          title: "Save",
          description: "Exclusive QR discounts from partner businesses. Scan and save.",
          color: "seafoam",
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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-card rounded-3xl p-8 shadow-sm border border-border hover:shadow-xl transition-all duration-300"
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br from-${feature.color}/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl bg-${feature.color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 text-${feature.color}`} />
                </div>
                
                <h3 className="font-poppins text-2xl font-bold mb-3 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
