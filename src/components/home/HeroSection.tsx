import { motion } from "framer-motion";
import { ReactNode } from "react";
import PhoneScreenReservation from "./hero-phones/PhoneScreenReservation";
import PhoneScreenEvent from "./hero-phones/PhoneScreenEvent";
import PhoneScreenMap from "./hero-phones/PhoneScreenMap";

interface HeroSectionProps {
  language: "el" | "en";
}

const PhoneMockup = ({ children }: { children: ReactNode }) => (
  <div className="w-[240px] sm:w-[280px] md:w-[330px] lg:w-[370px] flex-shrink-0 px-1 sm:px-2 py-2 sm:py-3">
    <div
      className="relative rounded-[2.2rem] sm:rounded-[2.8rem] bg-gradient-to-b from-[hsl(0_0%_14%)] via-[hsl(0_0%_7%)] to-[hsl(0_0%_3%)] p-[4px] sm:p-[5px] ring-1 ring-white/12 shadow-[0_30px_80px_-20px_hsl(0_0%_0%/0.9),inset_0_1px_0_hsl(0_0%_100%/0.18)]"
      style={{ aspectRatio: "9/19.5" }}
    >
      {/* Hardware buttons */}
      <div className="absolute -left-[2px] top-[18%] w-[3px] h-[8%] bg-[hsl(0_0%_8%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[30%] w-[3px] h-[12%] bg-[hsl(0_0%_8%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[44%] w-[3px] h-[12%] bg-[hsl(0_0%_8%)] rounded-l-sm" />
      <div className="absolute -right-[2px] top-[32%] w-[3px] h-[14%] bg-[hsl(0_0%_8%)] rounded-r-sm" />

      <div className="relative w-full h-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-[hsl(0_0%_0%)]">
        {children}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[hsl(0_0%_0%/0.55)] to-transparent" />
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-[hsl(0_0%_100%/0.35)]" />
      </div>
    </div>
  </div>
);

const HeroSection = ({ language }: HeroSectionProps) => {
  const text = {
    el: {
      headline: "Αν συμβαίνει,",
      headlineBold: "είναι στο ΦΟΜΟ.",
      subText: "Η #1 εφαρμογή εξόδου στην Κύπρο."
    },
    en: {
      headline: "If it's happening,",
      headlineBold: "it's on ΦΟΜΟ.",
      subText: "Cyprus's #1 event discovery platform."
    }
  };

  const t = text[language];

  // 3 unique screens, duplicated for seamless loop
  const screens = [
    <PhoneScreenReservation language={language} />,
    <PhoneScreenEvent language={language} />,
    <PhoneScreenMap language={language} />,
  ];
  const marqueeScreens = [...screens, ...screens, ...screens, ...screens];

  return (
    <section className="relative flex items-start justify-center overflow-hidden pt-[5.5rem] sm:pt-[6.5rem]">

      <div className="relative z-10 w-full">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-4 sm:space-y-5 max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            />

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-2"
            >
              <h1 className="text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight whitespace-nowrap">
                {t.headline}{" "}
                <span className="text-seafoam font-black">{t.headlineBold}</span>
              </h1>
            </motion.div>

            {/* Decorative dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-seafoam/40" />
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/50" />
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/30" />
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/50" />
              </div>
              <span className="text-[10px] sm:text-xs text-white/30 tracking-[0.3em] uppercase font-medium">live preview</span>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/50" />
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/30" />
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam/50" />
              </div>
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-seafoam/40" />
            </motion.div>
          </div>
        </div>

        {/* Phone marquee - full width, edge to edge fade */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-4 sm:mt-6"
        >

          <div className="flex overflow-x-hidden overflow-y-visible py-2">
            <div
              className="flex items-end gap-4 sm:gap-6 md:gap-8 will-change-transform [transform:translate3d(0,0,0)]"
              style={{
                animation: "hero-marquee 40s linear infinite",
                backfaceVisibility: "hidden",
              }}
            >
              {marqueeScreens.map((screen, index) => (
                <PhoneMockup key={`phone-${index}`}>{screen}</PhoneMockup>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Subtext */}
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-4 sm:space-y-5 mt-4 sm:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col items-center gap-1.5"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-white/50 text-sm sm:text-base md:text-lg max-w-lg"
            >
              {t.subText}
            </motion.p>
          </div>
        </div>
      </div>

      
      <style>{`
        @keyframes hero-marquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
