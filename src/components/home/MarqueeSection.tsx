import { motion } from "framer-motion";

const MarqueeSection = () => {
  const topItems = [
    "Η #1 εφαρμογή εκδηλώσεων στην Κύπρο",
    "Discover what's happening",
    "Exclusive QR discounts",
    "Real-time event updates",
    "Join trending events",
  ];

  const bottomItems = [
    "Never miss out again",
    "Αποκλειστικές εκπτώσεις",
    "Live social discovery",
    "Βρες που αξίζει να είσαι",
    "Connect with your city",
  ];

  return (
    <section className="relative -mt-8 sm:-mt-10 md:-mt-12 pb-6 sm:pb-8 md:pb-12 overflow-hidden">
      {/* Gradient from white (top) to seafoam (bottom) - covering the marquee */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-[#c5f0ea] to-[#4dd4c4]" />

      <div className="py-3 sm:py-4 md:py-6 relative z-10">
        {/* Top marquee - left to right */}
        <div className="relative flex overflow-hidden mb-3 sm:mb-4 md:mb-6">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-4 sm:gap-6 md:gap-8 whitespace-nowrap"
          >
            {[...topItems, ...topItems].map((item, i) => (
              <span
                key={i}
                className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-foreground/80 flex items-center gap-2 sm:gap-3 md:gap-4"
              >
                {item}
                <span className="text-seafoam">✦</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom marquee - right to left */}
        <div className="relative flex overflow-hidden">
          <motion.div
            animate={{ x: ["-50%", "0%"] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="flex gap-4 sm:gap-6 md:gap-8 whitespace-nowrap"
          >
            {[...bottomItems, ...bottomItems].map((item, i) => (
              <span
                key={i}
                className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-foreground/80 flex items-center gap-2 sm:gap-3 md:gap-4"
              >
                {item}
                <span className="text-aegean">✦</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MarqueeSection;
