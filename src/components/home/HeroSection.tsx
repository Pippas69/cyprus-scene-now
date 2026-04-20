import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Newspaper, MapPin } from "lucide-react";
import heroPhoneLoop from "@/assets/hero-phone-loop.mp4";

interface HeroSectionProps {
  language: "el" | "en";
}

const featureItems = [
  {
    icon: Calendar,
    labelEl: "Events",
    labelEn: "Events",
    path: "/events",
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

const PhoneMockup = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => undefined);
      }
    };

    // Lazy-start: only load + play when the video is near the viewport.
    // This avoids fetching ~3.4MB during initial page load.
    const startLoad = () => {
      if (video.preload !== "auto") {
        video.preload = "auto";
        try { video.load(); } catch { /* noop */ }
      }
      if (video.readyState >= 2) {
        playVideo();
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              startLoad();
              observer?.disconnect();
              break;
            }
          }
        },
        { rootMargin: "200px" }
      );
      observer.observe(video);
    } else {
      startLoad();
    }

    video.addEventListener("loadeddata", playVideo);
    return () => {
      observer?.disconnect();
      video.removeEventListener("loadeddata", playVideo);
    };
  }, []);

  return (
    <div className="w-[164px] sm:w-[182px] md:w-[204px] lg:w-[224px] xl:w-[236px] shrink-0">
      <div
        className="relative rounded-[2rem] sm:rounded-[2.2rem] bg-gradient-to-b from-foreground/30 via-foreground/10 to-foreground/5 p-[4px] ring-1 ring-foreground/10 shadow-2xl shadow-black/30"
        style={{ aspectRatio: "9/17" }}
      >
        <div className="absolute -left-[2px] top-[18%] h-[8%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -left-[2px] top-[30%] h-[12%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -left-[2px] top-[44%] h-[12%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -right-[2px] top-[32%] h-[14%] w-[3px] rounded-r-sm bg-foreground/20" />

        <div className="relative h-full w-full overflow-hidden rounded-[1.8rem] sm:rounded-[2rem] bg-background">
          <video
            ref={videoRef}
            className="h-full w-full object-cover brightness-110 contrast-110 saturate-125"
            src={heroPhoneLoop}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-transparent to-background/10" />

          {/* iOS Status Bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[10%] pt-[6%] text-foreground">
            <span className="text-[7px] sm:text-[8px] font-semibold leading-none">9:41</span>
            {/* Dynamic Island */}
            <div className="h-[8px] sm:h-[10px] w-[22%] rounded-full bg-black" />
            {/* Signal + WiFi + Battery */}
            <div className="flex items-center gap-[3px]">
              <svg className="h-[7px] w-[10px] sm:h-[8px] sm:w-[12px]" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="7" width="3" height="4" rx="0.5" opacity="0.3"/>
                <rect x="4.5" y="5" width="3" height="6" rx="0.5" opacity="0.5"/>
                <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" opacity="0.7"/>
                <rect x="13.5" y="0" width="3" height="11" rx="0.5"/>
              </svg>
              <svg className="h-[7px] w-[10px] sm:h-[8px] sm:w-[11px]" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 3.6c1.8 0 3.4.7 4.6 1.9l1.2-1.2C12.2 2.7 10.2 1.8 8 1.8S3.8 2.7 2.2 4.3l1.2 1.2C4.6 4.3 6.2 3.6 8 3.6z" opacity="0.5"/>
                <path d="M8 6.6c1.1 0 2.1.4 2.9 1.2l1.2-1.2C10.7 5.2 9.4 4.6 8 4.6s-2.7.6-4.1 1.9l1.2 1.2C5.9 7 6.9 6.6 8 6.6z" opacity="0.7"/>
                <circle cx="8" cy="10" r="1.5"/>
              </svg>
              <svg className="h-[7px] w-[14px] sm:h-[8px] sm:w-[16px]" viewBox="0 0 27 13" fill="currentColor">
                <rect x="0" y="0.5" width="22" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="23" y="4" width="2.5" height="5" rx="1" opacity="0.4"/>
                <rect x="1.5" y="2" width="19" height="9" rx="1.5"/>
              </svg>
            </div>
          </div>

          {/* ΦΟΜΟ branding at bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-[8%]">
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/60 to-transparent" />
            <span
              className="relative font-cinzel text-[9px] sm:text-[11px] font-bold tracking-[0.2em] text-foreground/70"
            >
              ΦΟΜΟ
            </span>
            <span className="relative font-inter text-[5px] sm:text-[6px] font-light tracking-[0.15em] text-seafoam/50 mt-[1px]">
              CYPRUS
            </span>
          </div>

          {/* Home indicator bar */}
          <div className="pointer-events-none absolute bottom-[3%] left-1/2 h-[3px] w-[28%] -translate-x-1/2 rounded-full bg-foreground/30 z-20" />
        </div>
      </div>
    </div>
  );
};

const HeroSection = ({ language }: HeroSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background pb-10 sm:pb-14">
      <div className="absolute left-[8%] top-[4.5rem] h-40 w-40 rounded-full bg-seafoam/[0.06] blur-3xl sm:h-56 sm:w-56" />
      <div className="absolute right-[10%] top-[12rem] h-44 w-44 rounded-full bg-foreground/[0.04] blur-3xl sm:h-64 sm:w-64" />
      <div className="absolute bottom-[8%] left-[24%] h-44 w-44 rounded-full bg-seafoam/[0.05] blur-3xl sm:h-72 sm:w-72" />

      <div className="relative z-10">
        <div className="container mx-auto px-4 pt-20 sm:pt-24 lg:pt-28">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute left-[18%] top-1/2 -z-10 h-44 w-44 -translate-y-1/2 rounded-full bg-seafoam/[0.08] blur-[80px] sm:h-64 sm:w-64" />
            <div className="absolute right-[18%] top-1/2 -z-10 h-36 w-36 -translate-y-1/2 rounded-full bg-foreground/[0.04] blur-[70px] sm:h-52 sm:w-52" />

            {/* ΦEAR OF MISSING OUT! heading with glow */}
            <div className="relative mb-8 sm:mb-10 flex items-center justify-center">
              {/* Circular seafoam radial glow behind text */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square h-40 sm:h-56 lg:h-64 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--seafoam) / 0.15) 0%, hsl(var(--seafoam) / 0.06) 40%, transparent 70%)",
                }}
              />
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2, delay: 0.5 }}
                className="relative font-inter text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-wide text-center text-foreground"
                style={{
                  textShadow: "0 0 30px hsl(var(--seafoam) / 0.25), 0 0 60px hsl(var(--seafoam) / 0.1)",
                }}
              >
                ΦEAR OF MISSING OUT!
              </motion.h1>
            </div>

            <div className="flex items-center justify-center gap-6 sm:gap-10 lg:gap-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
              >
                <PhoneMockup />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="flex flex-col items-center gap-6 sm:gap-8"
              >
                {featureItems.map((item, index) => (
                  <motion.button
                    key={item.labelEn}
                    onClick={() => navigate(item.path)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.35 + index * 0.08 }}
                    className="group flex cursor-pointer flex-col items-center gap-2"
                  >
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                      <svg
                        className="absolute inset-0 h-full w-full -rotate-45 text-seafoam/50 transition-transform duration-500 group-hover:rotate-0"
                        viewBox="0 0 80 80"
                      >
                        <circle
                          cx="40"
                          cy="40"
                          r="37"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray="58 175"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="absolute inset-1.5 flex items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 transition-all duration-300 group-hover:border-seafoam/30 group-hover:bg-seafoam/10">
                        <item.icon className="h-4 w-4 text-seafoam sm:h-5 sm:w-5" strokeWidth={1.5} />
                      </div>
                    </div>

                    <span className="font-inter text-[11px] sm:text-sm font-medium text-foreground/70 transition-colors group-hover:text-foreground">
                      {language === "el" ? item.labelEl : item.labelEn}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
