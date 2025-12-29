import { motion } from "framer-motion";
import { Search, MousePointerClick, Smartphone } from "lucide-react";

interface HowItWorksSectionProps {
  language: "el" | "en";
}

const HowItWorksSection = ({ language }: HowItWorksSectionProps) => {
  const text = {
    el: {
      title: "Πώς Λειτουργεί",
      steps: [
        {
          icon: Search,
          number: "01",
          title: "Περιηγηθείτε",
          description: "Εξερευνήστε εκδηλώσεις στο feed ή στον χάρτη. Φιλτράρετε κατά κατηγορία, τοποθεσία ή ημερομηνία.",
        },
        {
          icon: MousePointerClick,
          number: "02",
          title: "Επιλέξτε",
          description: "Κάντε RSVP σε εκδηλώσεις ή αποκτήστε προσφορές. Δείτε ποιοι άλλοι θα πάνε.",
        },
        {
          icon: Smartphone,
          number: "03",
          title: "Απολαύστε",
          description: "Δείξτε το QR code σας στο μαγαζί και απολαύστε την έκπτωσή σας.",
        },
      ],
    },
    en: {
      title: "How It Works",
      steps: [
        {
          icon: Search,
          number: "01",
          title: "Browse",
          description: "Explore events in the feed or on the map. Filter by category, location, or date.",
        },
        {
          icon: MousePointerClick,
          number: "02",
          title: "Choose",
          description: "RSVP to events or grab offers. See who else is going.",
        },
        {
          icon: Smartphone,
          number: "03",
          title: "Enjoy",
          description: "Show your QR code at the venue and enjoy your discount.",
        },
      ],
    },
  };

  const t = text[language];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-cinzel text-4xl md:text-5xl font-bold text-center mb-16 text-foreground"
        >
          {t.title}
        </motion.h2>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-aegean via-seafoam to-seafoam" />

          <div className="grid md:grid-cols-3 gap-12">
            {t.steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center relative"
              >
                {/* Step circle */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative mx-auto mb-6"
                >
                  <div className={`w-20 h-20 rounded-full bg-background shadow-lg border-2 ${
                    index === 0 ? "border-aegean" : index === 1 ? "border-seafoam" : "border-seafoam"
                  } flex items-center justify-center mx-auto`}>
                    <step.icon className={`w-8 h-8 ${
                      index === 0 ? "text-aegean" : index === 1 ? "text-seafoam" : "text-seafoam"
                    }`} />
                  </div>
                  <span className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${
                    index === 0 ? "bg-aegean" : index === 1 ? "bg-seafoam" : "bg-seafoam"
                  } text-white text-sm font-bold flex items-center justify-center`}>
                    {step.number.slice(-1)}
                  </span>
                </motion.div>

                <h3 className="font-poppins text-xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
