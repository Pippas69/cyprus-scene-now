import { motion } from "framer-motion";

interface FeaturesSectionProps {
  language: "el" | "en";
}

const FeaturesSection = ({ language }: FeaturesSectionProps) => {
  const text = {
    el: {
      features: [
      {
        label: "Για Εσένα",
        title: "Εξερεύνησε Ότι Σου Ταιριάζει",
        description: "Βρες venues, clubs και οτιδήποτε ταιριάζει στο στυλ σου. Εξερεύνησε τον χάρτη, δες τι συμβαίνει γύρω σου και μην χάσεις ποτέ ξανά κάτι που αξίζει να επισκεφτείς."
      },
      {
        label: "Πρόσβαση",
        title: "Εισιτήρια, Κρατήσεις, Προσφορές",
        description: "Κλείσε τραπέζι, αγόρασε εισιτήρια και απέκτησε πρόσβαση σε αποκλειστικές προσφορές — Όλα μέσα από ένα μέρος, χωρίς κόπο. Μπες, Κλείσε και Έφυγες."
      },
      {
        label: "Για Επιχειρήσεις",
        title: "Μέγιστη Ορατότητα & Εργαλεία",
        description: "Γίνε ορατός σε χιλιάδες χρήστες. Σύστημα κρατήσεων, εισιτηρίων, προσφορών και προβολή στον χάρτη — όλα σε μία πλατφόρμα, σχεδιασμένα για την ανάπτυξή σου."
      }]

    },
    en: {
      features: [
      {
        label: "For You",
        title: "Discover New Worlds",
        description: "Find events, clubs and venues that match your style. Explore the map, see what's happening around you, and never miss out on something worth experiencing."
      },
      {
        label: "Access",
        title: "Tickets, Reservations & Deals",
        description: "Book a table, grab tickets and unlock exclusive offers — all in one place, effortlessly."
      },
      {
        label: "For Businesses",
        title: "Maximum Visibility & Tools",
        description: "Get seen by thousands of users. Reservations, ticketing, deals and map placement — all on one platform, designed for your growth."
      }]

    }
  };

  const t = text[language];

  return (
    <section className="relative py-8 sm:py-10 md:py-14 overflow-hidden bg-[#0D3B66]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--seafoam)/0.08),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {t.features.map((feature, index) =>
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 hover:border-seafoam/30 transition-all duration-500">

              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-seafoam/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                


                
                <h3 className="font-poppins text-lg sm:text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

};

export default FeaturesSection;