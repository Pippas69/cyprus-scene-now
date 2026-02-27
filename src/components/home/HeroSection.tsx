import { motion } from "framer-motion";
import Typewriter from "@/components/ui/typewriter";
import PhoneMockupCarousel from "./PhoneMockupCarousel";

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
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D3B66]/95 via-[#0D3B66]/85 to-[#0D3B66]" />
      
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

            <h1 className="font-cinzel text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight whitespace-nowrap">
              {t.headline}{" "}
              <span className="bg-gradient-to-r from-seafoam via-[#6ee7d4] to-seafoam bg-clip-text text-transparent font-black">
                {t.headlineBold}
              </span>
            </h1>
          </motion.div>

          {/* Phone Mockup Carousel - right after headline */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="-mt-2 sm:-mt-3"
          >
            <PhoneMockupCarousel />
          </motion.div>

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
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0D3B66] to-transparent" />
    </section>);

};

export default HeroSection;