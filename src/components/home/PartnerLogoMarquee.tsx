import { motion } from "framer-motion";

const PARTNERS = [
  "Kaliva on the Beach",
  "Blue Martini",
  "Amnesia",
  "SugarwaveCy",
  "Mr. Mellow",
  "Legacy",
  "Eterna",
  "Baristro",
  "Crosta Nostra",
];

const PartnerLogoMarquee = () => {
  const marqueeItems = [...PARTNERS, ...PARTNERS];

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      {/* Smooth gradient - no hard line */}
      <div className="absolute inset-0 bg-[#0f4475] pointer-events-none" />

      <div className="relative z-10">
        <p className="text-center text-white/80 font-playfair text-xl sm:text-2xl italic font-semibold tracking-widest uppercase mb-8">
          Trusted By
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#0f4475] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#0f4475] to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-12 sm:gap-16 whitespace-nowrap"
            >
              {marqueeItems.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="text-sm sm:text-base font-playfair italic text-white/30 tracking-wider flex-shrink-0 hover:text-white/50 transition-colors duration-500"
                >
                  {name}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogoMarquee;
