import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PhoneMockup from "./PhoneMockup";
import Typewriter from "@/components/ui/typewriter";
import ParticleBackground from "@/components/ui/particle-background";

interface HeroSectionProps {
  language: "el" | "en";
}

const HeroSection = ({ language }: HeroSectionProps) => {
  const navigate = useNavigate();

  const phrases = {
    el: ["Απλά εν τες Ξέρεις", "αξίζει να είσαι", "τζι'αν γίνεται τώρα", "σε περιμένει"],
    en: ["happening now", "worth attending", "trending nearby", "waiting for you"],
  };

  const text = {
    el: {
      tagline: "Φόβος of Missing Out",
      heroMain: "Επιλογές υπάρχουν,",
      description: "Πλατφόρμα ζωντανής κοινωνικής ανακάλυψης — δείτε πού πηγαίνουν οι άνθρωποι, συμμετάσχετε σε trending εκδηλώσεις και αποκτήστε αποκλειστικές εκπτώσεις QR.",
      joinBtn: "Εγγραφή στο ΦΟΜΟ",
      exploreBtn: "Εξερεύνηση",
    },
    en: {
      tagline: "Fear of Missing Out",
      heroMain: "Discover what's",
      description: "Live social discovery platform — see where people are going, join trending events, and get exclusive QR discounts from partner businesses.",
      joinBtn: "Join ΦΟΜΟ",
      exploreBtn: "Explore",
    },
  };

  const t = text[language];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Particle background */}
      <ParticleBackground particleCount={25} className="z-0" />
      {/* Floating decorative shapes */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-sunset-coral/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 right-[15%] w-40 h-40 rounded-full bg-seafoam/20 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-32 left-[20%] w-24 h-24 rounded-full bg-aegean/20 blur-2xl"
      />
      
      {/* Small floating circles */}
      <motion.div
        animate={{ y: [0, -30, 0], x: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-[30%] left-[5%] w-4 h-4 rounded-full bg-sunset-coral/60"
      />
      <motion.div
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-[20%] right-[10%] w-3 h-3 rounded-full bg-seafoam/60"
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute bottom-[40%] right-[5%] w-5 h-5 rounded-full bg-aegean/60"
      />

      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full bg-sunset-coral/10 text-sunset-coral font-medium text-sm mb-6">
                {t.tagline}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-2"
            >
              <h1 className="font-cinzel text-5xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight">
                {t.heroMain}
              </h1>
              <div className="relative inline-block">
                <h1 className="font-cinzel text-5xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sunset-coral via-aegean to-seafoam">
                  <Typewriter 
                    phrases={phrases[language]} 
                    typingSpeed={70}
                    deletingSpeed={40}
                    pauseDuration={2500}
                  />
                </h1>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-sunset-coral to-seafoam rounded-full origin-left"
                />
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              {t.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="text-lg px-8 py-6 bg-gradient-to-r from-sunset-coral to-aegean hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-white"
              >
                {t.joinBtn}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/feed")}
                className="text-lg px-8 py-6 border-2 hover:bg-muted/50 transition-all duration-300"
              >
                {t.exploreBtn}
              </Button>
            </motion.div>
          </div>

          {/* Right content - Phone mockup */}
          <div className="hidden lg:flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
