import { motion } from "framer-motion";
import { Compass, Ticket, Megaphone } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: [
      { icon: Compass, title: "Εξερεύνησε venues & events", subtitle: "Χάρτης, κατηγορίες, αξιολογήσεις — ό,τι χρειάζεσαι για να βρεις το επόμενο στέκι σου" },
      { icon: Ticket, title: "Κρατήσεις, εισιτήρια & προσφορές", subtitle: "Ένα tap σε χωρίζει από τραπέζι, είσοδο ή αποκλειστικό deal" },
      { icon: Megaphone, title: "Εργαλεία για επιχειρήσεις", subtitle: "Ορατότητα σε χιλιάδες, analytics σε πραγματικό χρόνο και πλήρη διαχείριση" },
    ],
    en: [
      { icon: Compass, title: "Discover venues & events", subtitle: "Maps, categories, reviews — everything you need to find your next spot" },
      { icon: Ticket, title: "Reservations, tickets & deals", subtitle: "One tap away from a table, entry, or an exclusive deal" },
      { icon: Megaphone, title: "Tools for businesses", subtitle: "Visibility to thousands, real-time analytics, and full management" },
    ],
  };

  const features = text[language];

  return (
    <section className="relative py-10 sm:py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-seafoam/10 flex items-center justify-center mb-1">
                <feature.icon className="w-[18px] h-[18px] text-seafoam" />
              </div>
              <h3 className="text-white font-semibold text-sm sm:text-[15px]">
                {feature.title}
              </h3>
              <p className="text-white/40 text-xs sm:text-[13px] leading-relaxed max-w-[260px]">
                {feature.subtitle}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
