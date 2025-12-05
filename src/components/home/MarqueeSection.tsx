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
    <section className="py-8 bg-muted/30 overflow-hidden border-y border-border">
      {/* Top marquee - left to right */}
      <div className="relative flex overflow-hidden mb-4">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-8 whitespace-nowrap"
        >
          {[...topItems, ...topItems].map((item, i) => (
            <span
              key={i}
              className="text-lg md:text-xl font-medium text-foreground/70 flex items-center gap-4"
            >
              {item}
              <span className="text-sunset-coral">✦</span>
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
              className="text-lg md:text-xl font-medium text-foreground/70 flex items-center gap-4"
            >
              {item}
              <span className="text-seafoam">✦</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MarqueeSection;
