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
    <section className="relative py-12 bg-gradient-to-r from-seafoam/5 via-aegean/5 to-seafoam/5 overflow-hidden">
      {/* Top Wave Divider */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-8 md:h-12 fill-background"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
        </svg>
      </div>

      <div className="py-6">
        {/* Top marquee - left to right */}
        <div className="relative flex overflow-hidden mb-6">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-8 whitespace-nowrap"
          >
            {[...topItems, ...topItems].map((item, i) => (
              <span
                key={i}
                className="text-lg md:text-xl font-medium text-foreground/80 flex items-center gap-4"
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
            className="flex gap-8 whitespace-nowrap"
          >
            {[...bottomItems, ...bottomItems].map((item, i) => (
              <span
                key={i}
                className="text-lg md:text-xl font-medium text-foreground/80 flex items-center gap-4"
              >
                {item}
                <span className="text-aegean">✦</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-8 md:h-12 fill-background"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
        </svg>
      </div>
    </section>
  );
};

export default MarqueeSection;
