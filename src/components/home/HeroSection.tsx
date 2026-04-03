import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Newspaper, MapPin } from "lucide-react";

interface HeroSectionProps {
  language: "el" | "en";
}

const featureItems = [
  {
    icon: Calendar,
    labelEl: "Events",
    labelEn: "Events",
    path: "/feed",
  },
  {
    icon: Newspaper,
    labelEl: "Feed",
    labelEn: "Feed",
    path: "/feed",
  },
  {
    icon: MapPin,
    labelEl: "Map",
    labelEn: "Map",
    path: "/map",
  },
];

const PhoneMockup = () => (
  <div className="w-[260px] sm:w-[290px] md:w-[320px] lg:w-[340px]">
    <div
      className="relative rounded-[2.5rem] sm:rounded-[2.8rem] bg-gradient-to-b from-[hsl(0_0%_18%)] via-[hsl(0_0%_9%)] to-[hsl(0_0%_4%)] p-[5px] ring-1 ring-white/10 shadow-2xl shadow-black/40"
      style={{ aspectRatio: "9/19.5" }}
    >
      {/* Hardware buttons */}
      <div className="absolute -left-[2px] top-[18%] w-[3px] h-[8%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[30%] w-[3px] h-[12%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[44%] w-[3px] h-[12%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -right-[2px] top-[32%] w-[3px] h-[14%] bg-[hsl(0_0%_10%)] rounded-r-sm" />

      <div className="relative w-full h-full rounded-[2.2rem] sm:rounded-[2.5rem] overflow-hidden bg-black">
        {/* Video placeholder - will be replaced with actual video */}
        <div className="w-full h-full bg-gradient-to-b from-[hsl(0_0%_5%)] via-[hsl(0_0%_3%)] to-black flex items-center justify-center">
          <div className="text-center space-y-3 px-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10">
              <div className="w-0 h-0 border-l-[10px] border-l-white/40 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
            </div>
            <p className="text-white/30 text-xs font-inter">Video</p>
          </div>
        </div>

        {/* Bottom fade + home indicator */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/30" />
      </div>
    </div>
  </div>
);

const HeroSection = ({ language }: HeroSectionProps) => {
  const navigate = useNavigate();

  const text = {
    el: {
      headline: "Αν συμβαίνει,",
      headlineBold: "είναι στο ΦΟΜΟ.",
      subText: "Η #1 εφαρμογή εξόδου στην Κύπρο.",
    },
    en: {
      headline: "If it's happening,",
      headlineBold: "it's on ΦΟΜΟ.",
      subText: "Cyprus's #1 event discovery platform.",
    },
  };

  const t = text[language];

  return (
    <section className="relative overflow-hidden pt-[5.5rem] sm:pt-[6.5rem] pb-12 sm:pb-16 lg:pb-20">
      {/* Subtle gradient background - dark navy base with very subtle shifts */}
      <div className="absolute inset-0 bg-[hsl(207_72%_12%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_90%,hsl(200_50%_16%),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_15%,hsl(207_60%_18%),transparent)]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Headline + tagline - centered on all screens */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-3"
          >
            <h1 className="text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight">
              {t.headline}{" "}
              <span className="text-seafoam font-black">{t.headlineBold}</span>
            </h1>
            <span className="block text-[10px] sm:text-xs text-seafoam/40 tracking-[0.35em] uppercase font-medium">
              ΦEAR OF MISSING OUT
            </span>
          </motion.div>
        </div>

        {/* Phone + Features layout */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <PhoneMockup />
          </motion.div>

          {/* Feature icons - stacked vertically */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex lg:flex-col items-center gap-8 lg:gap-10"
          >
            {featureItems.map((item, index) => (
              <motion.button
                key={item.labelEn}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="group flex flex-col items-center gap-3 cursor-pointer"
              >
                {/* Circle with icon */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20">
                  {/* Outer arc accent */}
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-45 group-hover:rotate-0 transition-transform duration-500"
                    viewBox="0 0 80 80"
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="37"
                      fill="none"
                      stroke="hsl(174 62% 56% / 0.5)"
                      strokeWidth="2.5"
                      strokeDasharray="58 175"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Circle bg */}
                  <div className="absolute inset-1.5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-seafoam/10 group-hover:border-seafoam/30 transition-all duration-300">
                    <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-seafoam" strokeWidth={1.5} />
                  </div>
                </div>
                {/* Label */}
                <span className="text-white/70 text-sm font-inter font-medium group-hover:text-white transition-colors">
                  {language === "el" ? item.labelEl : item.labelEn}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center text-white/50 text-sm sm:text-base mt-8 sm:mt-10"
        >
          {t.subText}
        </motion.p>
      </div>
    </section>
  );
};

export default HeroSection;
