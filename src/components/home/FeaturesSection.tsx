import { motion } from "framer-motion";
import { Compass, Ticket, Megaphone } from "lucide-react";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: [
      { icon: Compass, title: "Εξερεύνησε venues & events", subtitle: "Ανακάλυψε clubs, bars, εστιατόρια και events γύρω σου μέσα από τον χάρτη. Δες τι παίζει κοντά σου, κλείσε εισιτήρια ή κράτηση και μη χάσεις ποτέ ξανά κάτι που σ' ενδιαφέρει" },
      { icon: Ticket, title: "Κρατήσεις, εισιτήρια & προσφορές", subtitle: "Κλείσε τραπέζι σε εστιατόριο ή club, αγόρασε εισιτήρια για events, απόκτησε αποκλειστικές προσφορές και φοιτητικές εκπτώσεις — όλα από ένα μέρος, σε δευτερόλεπτα" },
      { icon: Megaphone, title: "Εργαλεία για επιχειρήσεις", subtitle: "Σύστημα κρατήσεων, εισιτηρίων και προσφορών. Ορατότητα σε χιλιάδες χρήστες, real-time analytics, boost προβολής και πλήρης διαχείριση της παρουσίας σου" },
    ],
    en: [
      { icon: Compass, title: "Discover venues & events", subtitle: "Explore clubs, bars, restaurants and events near you via the map. See what's happening, book tickets or reserve a table, and never miss out on what matters to you" },
      { icon: Ticket, title: "Reservations, tickets & deals", subtitle: "Book a table at a restaurant or club, grab event tickets, unlock exclusive offers and student discounts — all in one place, in seconds" },
      { icon: Megaphone, title: "Tools for businesses", subtitle: "Reservation system, ticketing and deals engine. Visibility to thousands, real-time analytics, boost promotions and full control of your presence" },
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
              className="flex flex-col items-center text-center gap-3 h-full"
            >
              <div className="w-10 h-10 rounded-full bg-seafoam/10 flex items-center justify-center mb-1">
                <feature.icon className="w-[18px] h-[18px] text-seafoam" />
              </div>
              <h3 className="text-white font-semibold text-sm sm:text-[15px]">
                {feature.title}
              </h3>
              <p className="text-white/40 text-xs sm:text-[13px] leading-relaxed max-w-[260px] text-left">
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
