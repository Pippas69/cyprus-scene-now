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
    <section className="py-8 overflow-hidden">
      <p className="text-center text-foreground font-playfair text-2xl sm:text-3xl italic font-bold tracking-wide mb-5">
        Trusted By
      </p>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-[#0D3B66] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-[#0D3B66] to-transparent z-10 pointer-events-none" />

        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-10 sm:gap-14 whitespace-nowrap"
          >
            {marqueeItems.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="text-sm sm:text-base font-playfair italic text-foreground/40 tracking-wide flex-shrink-0"
              >
                {name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogoMarquee;
