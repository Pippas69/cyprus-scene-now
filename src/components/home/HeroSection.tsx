import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Newspaper, MapPin, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import LanguageToggle from "@/components/LanguageToggle";
import fomoLogo from "@/assets/fomo-logo-white.png";
import type { User } from "@supabase/supabase-js";

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
  <div className="w-[180px] sm:w-[200px] md:w-[220px] lg:w-[240px]">
    <div
      className="relative rounded-[2rem] sm:rounded-[2.2rem] bg-gradient-to-b from-[hsl(0_0%_18%)] via-[hsl(0_0%_9%)] to-[hsl(0_0%_4%)] p-[4px] ring-1 ring-white/10 shadow-2xl shadow-black/40"
      style={{ aspectRatio: "9/17" }}
    >
      {/* Hardware buttons */}
      <div className="absolute -left-[2px] top-[18%] w-[3px] h-[8%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[30%] w-[3px] h-[12%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[44%] w-[3px] h-[12%] bg-[hsl(0_0%_10%)] rounded-l-sm" />
      <div className="absolute -right-[2px] top-[32%] w-[3px] h-[14%] bg-[hsl(0_0%_10%)] rounded-r-sm" />

      <div className="relative w-full h-full rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden bg-black">
        {/* Video - placeholder until real video is provided */}
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster=""
        >
          {/* Video source will be added when user provides the video file */}
        </video>
        {/* Fallback overlay when no video */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[hsl(0_0%_5%)] via-[hsl(0_0%_3%)] to-black flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10">
              <div className="w-0 h-0 border-l-[8px] border-l-white/40 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
            </div>
            <p className="text-white/25 text-[10px] font-inter">Video</p>
          </div>
        </div>

        {/* Bottom home indicator */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/25" />
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
    },
    en: {
      headline: "If it's happening,",
      headlineBold: "it's on ΦΟΜΟ.",
    },
  };

  const t = text[language];

  return (
    <section className="relative overflow-hidden pt-[5.5rem] sm:pt-[6.5rem] pb-10 sm:pb-14">
      {/* Background - matches the site's existing background seamlessly */}
      <div className="absolute inset-0 bg-background" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Headline + tagline */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-2"
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

        {/* Phone (left) + Features (right) */}
        <div className="flex items-center justify-center gap-10 sm:gap-14 lg:gap-20">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <PhoneMockup />
          </motion.div>

          {/* Feature icons - always vertical, to the right of the phone */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center gap-8 sm:gap-10"
          >
            {featureItems.map((item, index) => (
              <motion.button
                key={item.labelEn}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="group flex flex-col items-center gap-2.5 cursor-pointer"
              >
                {/* Circle with icon */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18">
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
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-seafoam" strokeWidth={1.5} />
                  </div>
                </div>
                {/* Label */}
                <span className="text-white/70 text-xs sm:text-sm font-inter font-medium group-hover:text-white transition-colors">
                  {language === "el" ? item.labelEl : item.labelEn}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
