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
    <section className="relative py-12 bg-gradient-to-b from-seafoam/5 via-aegean/8 to-seafoam/5 overflow-hidden">
      {/* Top Wave Dividers - Multiple layered waves */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        {/* First wave layer - lighter */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="relative block w-full h-16 md:h-24"
        >
          <path
            d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,0 L0,0 Z"
            className="fill-background"
          />
        </svg>
        {/* Second wave layer - overlapping */}
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute top-4 md:top-6 left-0 w-full h-12 md:h-16"
        >
          <path
            d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,0 1440,40 L1440,0 L0,0 Z"
            className="fill-background/60"
          />
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

      {/* Bottom Wave Dividers - Multiple layered waves */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
        {/* First wave layer - lighter */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="relative block w-full h-16 md:h-24"
        >
          <path
            d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,0 L0,0 Z"
            className="fill-background"
          />
        </svg>
        {/* Second wave layer - overlapping */}
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute top-4 md:top-6 left-0 w-full h-12 md:h-16"
        >
          <path
            d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,0 1440,40 L1440,0 L0,0 Z"
            className="fill-background/60"
          />
        </svg>
      </div>
    </section>
  );
};

export default MarqueeSection;
