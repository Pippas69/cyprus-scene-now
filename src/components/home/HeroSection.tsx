import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Newspaper, MapPin, ArrowRight, Zap, Star } from "lucide-react";
import heroPhoneLoop from "@/assets/hero-phone-loop.mp4";

interface HeroSectionProps {
  language: "el" | "en";
}

const copy = {
  el: {
    badge: "Η Νο.1 Πλατφόρμα στην Κύπρο",
    line1: "Μη Χάσεις",
    line2: "Τίποτα.",
    sub: "Events, venues και αποκλειστικά deals σε όλη την Κύπρο — όλα σε ένα μέρος.",
    cta1: "Εξερεύνησε Events",
    cta2: "Για Επιχειρήσεις",
    stats: [{ value: "500+", label: "Events" }, { value: "10K+", label: "Χρήστες" }, { value: "200+", label: "Venues" }],
    liveNow: "Live τώρα",
    topEvent: "Πάρτι Σαββάτου",
    featured: "Προτεινόμενο",
  },
  en: {
    badge: "Cyprus's #1 Discovery Platform",
    line1: "Nothing Gets",
    line2: "Past You.",
    sub: "Events, venues and exclusive deals across Cyprus — all in one place.",
    cta1: "Explore Events",
    cta2: "For Businesses",
    stats: [{ value: "500+", label: "Events" }, { value: "10K+", label: "Users" }, { value: "200+", label: "Venues" }],
    liveNow: "Live now",
    topEvent: "Saturday Party",
    featured: "Featured",
  },
};

const VideoPanel = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      video.muted = true;
      const p = video.play();
      if (p) void p.catch(() => undefined);
    };

    const startLoad = () => {
      if (video.preload !== "auto") {
        video.preload = "auto";
        try { video.load(); } catch { /* noop */ }
      }
      if (video.readyState >= 2) playVideo();
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => { for (const e of entries) if (e.isIntersecting) { startLoad(); observer?.disconnect(); break; } },
        { rootMargin: "200px" }
      );
      observer.observe(video);
    } else {
      startLoad();
    }

    video.addEventListener("loadeddata", playVideo);
    return () => { observer?.disconnect(); video.removeEventListener("loadeddata", playVideo); };
  }, []);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={heroPhoneLoop}
        autoPlay muted loop playsInline preload="none"
      />
      {/* Gradient overlays for blending */}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-transparent" />
    </div>
  );
};

const HeroSection = ({ language }: HeroSectionProps) => {
  const navigate = useNavigate();
  const t = copy[language];

  return (
    <section className="relative min-h-screen flex overflow-hidden bg-background">

      {/* ── Right half: full-bleed video ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 w-full lg:w-[52%] pointer-events-none"
      >
        <VideoPanel />

        {/* Floating UI chips on the video — visible on large screens */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="absolute bottom-32 right-8 hidden lg:flex flex-col gap-2"
        >
          {/* Live now pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-white/80 text-xs font-medium">{t.liveNow} · 24 events</span>
          </div>
          {/* Featured card chip */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-seafoam/20 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-seafoam fill-seafoam/50" />
            </div>
            <div>
              <p className="text-white/90 text-xs font-semibold">{t.topEvent}</p>
              <p className="text-white/40 text-[10px]">{t.featured}</p>
            </div>
          </div>
        </motion.div>

        {/* Nav items floating on video */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute top-1/3 right-6 hidden xl:flex flex-col gap-2"
        >
          {[{ icon: Calendar, label: "Events" }, { icon: MapPin, label: "Map" }, { icon: Newspaper, label: "Feed" }].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur-md border border-white/8 rounded-xl">
              <Icon className="w-3.5 h-3.5 text-seafoam" />
              <span className="text-white/65 text-xs">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Left half: copy ── */}
      <div className="relative z-10 w-full flex items-center">
        <div className="w-full lg:w-[54%] px-6 sm:px-10 lg:px-16 xl:px-20 pt-28 pb-20 sm:pt-32">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-seafoam/10 border border-seafoam/25 mb-7"
          >
            <Zap className="w-3 h-3 text-seafoam fill-seafoam" />
            <span className="text-seafoam text-xs font-semibold tracking-wider uppercase">{t.badge}</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="font-urbanist font-black leading-[0.9] tracking-tight text-foreground mb-6"
            style={{ fontSize: "clamp(3.2rem, 6vw, 5.5rem)" }}
          >
            {t.line1}
            <br />
            <span className="text-gradient-ocean">{t.line2}</span>
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-foreground/45 text-base sm:text-lg leading-relaxed mb-9 max-w-sm"
          >
            {t.sub}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 mb-12"
          >
            <button
              onClick={() => navigate("/feed")}
              className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-seafoam text-aegean font-bold rounded-full hover:bg-seafoam/90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-seafoam/20 text-sm sm:text-base"
            >
              {t.cta1}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/for-businesses")}
              className="flex items-center justify-center gap-2 px-7 py-3.5 border border-white/12 text-foreground/60 font-medium rounded-full hover:border-white/25 hover:text-foreground/90 transition-all duration-200 text-sm sm:text-base"
            >
              {t.cta2}
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.42 }}
            className="flex items-center gap-8"
          >
            {t.stats.map((s, i) => (
              <div key={i}>
                <p className="font-urbanist font-black text-xl text-foreground/85 leading-none">{s.value}</p>
                <p className="text-foreground/35 text-[11px] mt-1 tracking-wide">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade-to-section */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
    </section>
  );
};

export default HeroSection;
