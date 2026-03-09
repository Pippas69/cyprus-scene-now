import { motion } from "framer-motion";
import { Compass, Ticket, Megaphone } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: [
      { icon: Compass, title: "Εξερεύνησε venues & events γύρω σου" },
      { icon: Ticket, title: "Κρατήσεις, εισιτήρια & προσφορές σε ένα tap" },
      { icon: Megaphone, title: "Εργαλεία ορατότητας για επιχειρήσεις" },
    ],
    en: [
      { icon: Compass, title: "Discover venues & events near you" },
      { icon: Ticket, title: "Reservations, tickets & deals in one tap" },
      { icon: Megaphone, title: "Visibility tools for businesses" },
    ],
  };

  const features = text[language];

  return (
    <section className="relative py-10 sm:py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-6 sm:gap-12 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-seafoam/10 flex items-center justify-center">
                <feature.icon className="w-4 h-4 text-seafoam" />
              </div>
              <span className="text-white/70 text-sm sm:text-[15px] font-medium whitespace-nowrap">
                {feature.title}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
