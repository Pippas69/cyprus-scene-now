import { motion } from "framer-motion";
import heroPhoneLeft from "@/assets/hero-phone-premium-left.png";
import heroPhoneRight from "@/assets/hero-phone-premium-right.png";

interface HeroSectionProps {
  language: "el" | "en";
}

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

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-[5.5rem] sm:pt-[6.5rem]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80')"
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-seafoam/10 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="flex flex-col items-center space-y-4 sm:space-y-5 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center px-5 py-2 rounded-full border border-seafoam/30 bg-seafoam/10 backdrop-blur-sm">
              <span className="text-seafoam text-xs sm:text-sm font-medium tracking-widest uppercase">
                ΦEAR OF MISSING OUT
              </span>
            </span>
          </motion.div>

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

          <div className="flex items-end justify-center gap-3 sm:gap-5 md:gap-6 -mt-1 sm:-mt-2">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.div
                animate={{ x: [0, -6, 0, 6, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="w-[210px] sm:w-[250px] md:w-[295px] lg:w-[330px]"
              >
                <img
                  alt="ΦΟΜΟ app premium screen - Event details"
                  className="w-full h-auto object-contain"
                  style={{ imageRendering: "auto" }}
                  draggable={false}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  src={heroPhoneRight}
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
            >
              <motion.div
                animate={{ x: [0, 6, 0, -6, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-[210px] sm:w-[250px] md:w-[295px] lg:w-[330px]"
              >
                <img
                  alt="ΦΟΜΟ app premium screen - Events feed"
                  className="w-full h-auto object-contain"
                  style={{ imageRendering: "auto" }}
                  draggable={false}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  src={heroPhoneLeft}
                />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col items-center gap-1.5 -mt-1"
          >
            <div className="flex gap-1">
              <span className="w-6 h-1 rounded-full bg-seafoam/50" />
              <span className="w-2 h-1 rounded-full bg-seafoam/25" />
              <span className="w-2 h-1 rounded-full bg-seafoam/15" />
            </div>
          </motion.div>

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

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
