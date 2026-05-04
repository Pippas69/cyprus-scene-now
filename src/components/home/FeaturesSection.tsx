import { motion } from "framer-motion";
import { Compass, Ticket, Megaphone, ArrowRight } from "lucide-react";
import { Card3D } from "@/components/ui/scroll-3d";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const features = {
  el: [
    {
      number: "01",
      icon: Compass,
      title: "Εξερεύνησε venues & events",
      subtitle: "Ανακάλυψε clubs, bars, εστιατόρια και events γύρω σου μέσα από τον χάρτη. Δες τι παίζει κοντά σου, κλείσε εισιτήρια ή κράτηση.",
      accent: "hsl(var(--seafoam))",
    },
    {
      number: "02",
      icon: Ticket,
      title: "Κρατήσεις, εισιτήρια & προσφορές",
      subtitle: "Κλείσε τραπέζι, αγόρασε εισιτήρια, απόκτησε αποκλειστικές προσφορές και φοιτητικές εκπτώσεις — όλα σε δευτερόλεπτα.",
      accent: "hsl(var(--golden))",
    },
    {
      number: "03",
      icon: Megaphone,
      title: "Εργαλεία για επιχειρήσεις",
      subtitle: "Σύστημα κρατήσεων, εισιτηρίων και προσφορών. Ορατότητα σε χιλιάδες χρήστες, real-time analytics και boost προβολής.",
      accent: "hsl(var(--primary))",
    },
  ],
  en: [
    {
      number: "01",
      icon: Compass,
      title: "Discover venues & events",
      subtitle: "Explore clubs, bars, restaurants and events near you via the map. See what's happening, book tickets or reserve a table.",
      accent: "hsl(var(--seafoam))",
    },
    {
      number: "02",
      icon: Ticket,
      title: "Reservations, tickets & deals",
      subtitle: "Book a table, grab event tickets, unlock exclusive offers and student discounts — all in one place, in seconds.",
      accent: "hsl(var(--golden))",
    },
    {
      number: "03",
      icon: Megaphone,
      title: "Tools for businesses",
      subtitle: "Reservation system, ticketing and deals engine. Visibility to thousands, real-time analytics and boost promotions.",
      accent: "hsl(var(--primary))",
    },
  ],
};

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const items = features[language];

  return (
    <section className="relative py-20 sm:py-28 bg-background overflow-hidden">
      {/* Subtle top separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {items.map((feature, index) => (
            <motion.div
              key={feature.number}
              style={{ perspective: 1000 }}
              initial={{ opacity: 0, y: 48, rotateX: 18, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.13, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card3D>
                <div className="relative h-full flex flex-col gap-4 p-6 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/12 transition-colors duration-300 overflow-hidden group">
                  {/* Large faded number watermark */}
                  <span
                    className="absolute -top-3 -right-1 font-urbanist font-black text-8xl sm:text-9xl leading-none select-none pointer-events-none opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500"
                    style={{ color: feature.accent }}
                  >
                    {feature.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${feature.accent} 12%, transparent)` }}
                  >
                    <feature.icon className="w-5 h-5" style={{ color: feature.accent }} />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-2 flex-1">
                    <h3 className="text-white font-semibold text-base sm:text-[15px] leading-snug">
                      {feature.title}
                    </h3>
                    <p className="text-white/38 text-xs sm:text-[13px] leading-relaxed">
                      {feature.subtitle}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className="absolute bottom-0 left-6 right-6 h-[1.5px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                    style={{ background: `linear-gradient(90deg, transparent, ${feature.accent}, transparent)` }}
                  />
                </div>
              </Card3D>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </section>
  );
};

export default FeaturesSection;
