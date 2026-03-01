import { motion } from "framer-motion";

interface HeroSectionProps {
  language: "el" | "en";
}

const PhoneMockup = ({ src, alt }: {src: string;alt: string;}) =>
<div className="w-[210px] sm:w-[250px] md:w-[295px] lg:w-[330px] flex-shrink-0">
    <div
    className="relative rounded-[2.2rem] sm:rounded-[2.8rem] bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] p-[4px] sm:p-[5px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(78,205,196,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]"
    style={{ aspectRatio: "9/19.5" }}>

      <div className="absolute -left-[2px] top-[18%] w-[3px] h-[8%] bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[30%] w-[3px] h-[12%] bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-[2px] top-[44%] w-[3px] h-[12%] bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -right-[2px] top-[32%] w-[3px] h-[14%] bg-[#2a2a2a] rounded-r-sm" />

      <div className="relative w-full h-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-black">
        <img
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        src={src} />

        <div className="absolute bottom-[6px] sm:bottom-[8px] left-1/2 -translate-x-1/2 w-[80px] sm:w-[100px] h-[4px] bg-white/30 rounded-full z-20" />
      </div>
    </div>
  </div>;


const PHONES = [
{ src: "/lovable-uploads/88997d31-4129-4023-a62a-6fca7477ec31.png", alt: "ΦΟΜΟ app - Event Detail" },
{ src: "/lovable-uploads/hero-phone-reservation.jpg", alt: "ΦΟΜΟ app - Reservation Overview" }];


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
  // Duplicate phones for seamless infinite loop
  const marqueePhones = [...PHONES, ...PHONES, ...PHONES, ...PHONES];

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-[5.5rem] sm:pt-[6.5rem]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80')"
        }} />

      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-seafoam/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full">
        <div className="container mx-auto px-4 text-center">
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

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-2">

              <h1 className="text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight whitespace-nowrap">
                {t.headline}{" "}
                <span className="text-seafoam font-black">{t.headlineBold}</span>
              </h1>
            </motion.div>

            {/* Decorative dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="flex items-center gap-2 sm:gap-3">

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
          </div>
        </div>

        {/* Phone marquee - full width, edge to edge fade */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-4 sm:mt-6">

          {/* Edge fade overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 md:w-48 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 md:w-48 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="flex items-end gap-4 sm:gap-6 md:gap-8">

              {marqueePhones.map((phone, index) =>
              <PhoneMockup key={`phone-${index}`} src={phone.src} alt={phone.alt} />
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Subtext & swipe dots */}
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-4 sm:space-y-5 mt-4 sm:mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col items-center gap-1.5">

              




            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-white/50 text-sm sm:text-base md:text-lg max-w-lg">

              {t.subText}
            </motion.p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>);

};

export default HeroSection;