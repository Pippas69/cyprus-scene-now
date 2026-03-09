import { motion } from "framer-motion";

const PARTNERS = [
  { name: "Kaliva on the Beach", initials: "KB", gradient: "from-cyan-500 to-blue-600" },
  { name: "Blue Martini", initials: "BM", gradient: "from-blue-400 to-indigo-600" },
  { name: "Amnesia", initials: "AM", gradient: "from-purple-500 to-pink-600" },
  { name: "SugarwaveCy", initials: "SW", gradient: "from-pink-400 to-rose-600" },
  { name: "Mr. Mellow", initials: "MM", gradient: "from-amber-400 to-orange-600" },
  { name: "Legacy", initials: "LG", gradient: "from-emerald-400 to-teal-600" },
  { name: "Eterna", initials: "ET", gradient: "from-violet-400 to-purple-600" },
  { name: "Baristro", initials: "BA", gradient: "from-orange-400 to-red-600" },
  { name: "Crosta Nostra", initials: "CN", gradient: "from-teal-400 to-cyan-600" },
];

const PartnerLogoMarquee = () => {
  const marqueeItems = [...PARTNERS, ...PARTNERS];

  return (
    <section className="relative py-8 sm:py-12 overflow-hidden bg-transparent">
      <div className="relative z-10">
        <p className="text-center text-white/50 font-playfair text-xs sm:text-sm tracking-[0.25em] uppercase mb-6 sm:mb-8">
          Ήδη στο ΦΟΜΟ
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-8 sm:gap-12 whitespace-nowrap"
            >
              {marqueeItems.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${partner.gradient} flex items-center justify-center ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-500 shadow-lg shadow-black/20`}
                  >
                    <span className="text-white font-semibold text-xs sm:text-sm tracking-wide">
                      {partner.initials}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/35 group-hover:text-white/55 transition-colors duration-500 font-medium">
                    {partner.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogoMarquee;
