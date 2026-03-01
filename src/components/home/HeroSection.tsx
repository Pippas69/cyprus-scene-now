import { motion } from "framer-motion";
import Typewriter from "@/components/ui/typewriter";

interface HeroSectionProps {
  language: "el" | "en";
}

const HeroSection = ({ language }: HeroSectionProps) => {
  const phrases = {
    el: ["δες που αξίζει να είσαι", "απλά εν τες ξέρεις", "τζαιρός να τες μάθεις"],
    en: ["see where it's worth being", "you just don't know them yet", "time to discover them"]
  };

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
      {/* Cinematic background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80')"
        }} />

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
      
      {/* Subtle seafoam glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-seafoam/10 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="flex flex-col items-center space-y-4 sm:space-y-5 max-w-4xl mx-auto">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>

            <span className="inline-flex items-center px-5 py-2 rounded-full border border-seafoam/30 bg-seafoam/10 backdrop-blur-sm">
              <span className="text-seafoam text-xs sm:text-sm font-medium tracking-widest uppercase">
                ΦEAR OF MISSING OUT
              </span>
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-2">

            <h1 className="text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight whitespace-nowrap">
              {t.headline}{" "}
              <span className="text-seafoam font-black">
                {t.headlineBold}
              </span>
            </h1>
          </motion.div>

          {/* Hero phones */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 -mt-2 sm:-mt-3">
            {/* Phone 1 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.div
                animate={{ x: [0, -8, 0, 8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="w-[160px] sm:w-[200px] md:w-[240px] lg:w-[260px]"
              >
                <div className="rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-[3px] border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(78,205,196,0.1)]">
                  <img
                    src="/images/hero-phone-1.png"
                    alt="ΦΟΜΟ app - Event"
                    className="w-full h-auto object-contain"
                    draggable={false}
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Phone 2 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
            >
              <motion.div
                animate={{ x: [0, 8, 0, -8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-[160px] sm:w-[200px] md:w-[240px] lg:w-[260px]"
              >
                <div className="rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-[3px] border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(78,205,196,0.1)]">
                  <img
                    src="/images/hero-phone-2.png"
                    alt="ΦΟΜΟ app - Κράτηση Θέσης"
                    className="w-full h-auto object-contain"
                    draggable={false}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Subtext - after phone */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-white/50 text-sm sm:text-base md:text-lg max-w-lg">
            {t.subText}
          </motion.p>

































        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>);

};

export default HeroSection;