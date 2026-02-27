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
      subText: "Η #1 εφαρμογή εξόδου στην Κύπρο."
    },
    en: {
      subText: "Cyprus's #1 event discovery platform."
    }
  };

  const t = text[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
        <div className="flex flex-col items-center space-y-6 sm:space-y-8 max-w-4xl mx-auto">
          
          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-2">

            <h1 className="font-inter text-[clamp(1.1rem,4.5vw,2.5rem)] font-bold leading-tight tracking-tight whitespace-nowrap">
              <span className="bg-gradient-to-r from-seafoam via-[#6ee7d4] to-seafoam bg-clip-text text-transparent">
                ΦEAR OF MISSING OUT
              </span>
            </h1>
          </motion.div>

          {/* Typewriter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}>

            <p className="font-urbanist text-lg sm:text-xl md:text-2xl min-h-[1.5em]">
              






            </p>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/50 text-sm sm:text-base md:text-lg max-w-lg">

            {t.subText}
          </motion.p>

          {/* App Store buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-row gap-3 sm:gap-4 pt-2">

            <button
              type="button"
              onClick={() => console.log("App Store clicked")}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 hover:scale-105">

              <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-current flex-shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[8px] sm:text-[10px] opacity-70">Download on the</span>
                <span className="text-sm sm:text-base font-semibold -mt-0.5">App Store</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => console.log("Google Play clicked")}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 hover:scale-105">

              <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-current flex-shrink-0">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[8px] sm:text-[10px] opacity-70">GET IT ON</span>
                <span className="text-sm sm:text-base font-semibold -mt-0.5">Google Play</span>
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0D3B66] to-transparent" />
    </section>);

};

export default HeroSection;