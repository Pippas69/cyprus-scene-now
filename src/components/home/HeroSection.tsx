import { motion } from "framer-motion";
import Typewriter from "@/components/ui/typewriter";
import ParticleBackground from "@/components/ui/particle-background";

interface HeroSectionProps {
  language: "el" | "en";
}

const HeroSection = ({ language }: HeroSectionProps) => {
  const phrases = {
    el: ["δες που αξίζει να είσαι", "απλά εν τες ξέρεις", "τζαιρός να τες μάθεις"],
    en: ["see where it's worth being", "you just don't know them yet", "time to discover them"],
  };

  const text = {
    el: {
      tagline: "ΦΟΒΟΣ OF MISSING OUT",
      heroMain: "Επιλογές υπάρχουν,",
      subText: '"Μα ένειξερω που να πάω πόψε"',
      downloadCta: "Κατέβαστο τζαι μάθε.",
    },
    en: {
      tagline: "Fear OF MISSING OUT",
      heroMain: "Options exist,",
      subText: '"But I don\'t know where to go tonight"',
      downloadCta: "Download it and find out",
    },
  };

  const t = text[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-seafoam/5">
      {/* Particle background */}
      <ParticleBackground particleCount={25} className="z-0" />
      
      {/* Premium floating decorative shapes */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-seafoam/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 right-[15%] w-40 h-40 rounded-full bg-aegean/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-32 left-[20%] w-24 h-24 rounded-full bg-seafoam/15 blur-2xl"
      />
      
      {/* Small floating circles */}
      <motion.div
        animate={{ y: [0, -30, 0], x: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-[30%] left-[5%] w-4 h-4 rounded-full bg-seafoam/60"
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-[20%] right-[10%] w-3 h-3 rounded-full bg-aegean/60"
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute bottom-[40%] right-[5%] w-5 h-5 rounded-full bg-seafoam/60"
      />

      <div className="container mx-auto px-3 sm:px-4 py-12 sm:py-16 md:py-20">
        <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 md:space-y-8">
          {/* Tagline badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-seafoam/15 to-aegean/15 border border-seafoam/30 shadow-lg">
              <span className="font-cinzel font-bold text-xs sm:text-base md:text-lg tracking-wider bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent uppercase">
                {language === 'el' ? 'ΦΟΒΟΣ' : 'FEAR'}
              </span>
              <span className="font-cinzel font-bold text-xs sm:text-base md:text-lg tracking-wider bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent uppercase">
                OF MISSING OUT
              </span>
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-3 sm:space-y-4"
          >
            <h1 className="font-cinzel text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black bg-gradient-to-r from-aegean via-foreground to-aegean bg-clip-text text-transparent leading-tight tracking-tight px-2">
              {t.heroMain}
            </h1>
            <div className="relative inline-block">
              <h2 className="font-cinzel text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold min-h-[1.2em] px-2">
                <Typewriter 
                  phrases={phrases[language]} 
                  typingSpeed={70}
                  deletingSpeed={40}
                  pauseDuration={2500}
                  className="bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent"
                />
              </h2>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-seafoam via-aegean to-seafoam rounded-full"
              />
            </div>
          </motion.div>

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-1 pt-2 sm:pt-4 px-4"
          >
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground italic">
              {t.subText}
            </p>
            <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground">
              {t.downloadCta}
            </p>
          </motion.div>

          {/* App Store buttons - Side by side on mobile with smaller size */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-row gap-2 sm:gap-3 md:gap-4 justify-center pt-2 sm:pt-4"
          >
            {/* App Store Button */}
            <button
              type="button"
              onClick={() => console.log("App Store clicked")}
              className="group relative flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-seafoam to-aegean text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 fill-current flex-shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[7px] sm:text-[8px] md:text-[10px] opacity-90">Download on the</span>
                <span className="text-xs sm:text-sm md:text-lg font-semibold -mt-0.5">App Store</span>
              </div>
            </button>

            {/* Google Play Button */}
            <button
              type="button"
              onClick={() => console.log("Google Play clicked")}
              className="group relative flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2.5 sm:px-3 md:px-5 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-seafoam to-aegean text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 fill-current flex-shrink-0">
                <path d="M3.609 1.814L13.445 12l-9.836 10.186c-.245-.244-.391-.555-.391-.9V2.714c0-.346.146-.656.391-.9z"/>
                <path d="M17.87 8.262l-4.425 3.738 4.425 3.738 4.13-2.428c.78-.458.78-1.638 0-2.096l-4.13-2.952z"/>
                <path d="M3.609 22.186c.244.244.555.391.9.391.19 0 .38-.042.56-.125l12.801-6.452-4.425-3.738L3.609 22.186z"/>
                <path d="M13.445 12L3.609 1.814C3.798 1.66 4.027 1.577 4.26 1.577c.19 0 .38.042.56.125l12.8 6.452-4.175 3.846z"/>
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[7px] sm:text-[8px] md:text-[10px] opacity-90">GET IT ON</span>
                <span className="text-xs sm:text-sm md:text-lg font-semibold -mt-0.5">Google Play</span>
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
