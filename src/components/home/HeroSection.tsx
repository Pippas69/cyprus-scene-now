import { useEffect, useState } from "react";
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
  const [processedPhonesSrc, setProcessedPhonesSrc] = useState("/images/hero-phones.png");

  useEffect(() => {
    let isMounted = true;
    const image = new Image();
    image.src = "/images/hero-phones.png";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx || !isMounted) return;

      ctx.drawImage(image, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;
      const visited = new Uint8Array(width * height);
      const stack: number[] = [];

      const isBgPixel = (idx: number) => {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 20) return true;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isGray = max - min <= 18;
        const isLight = r >= 190 && g >= 190 && b >= 190;

        return isGray && isLight;
      };

      const pushIfBg = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const pixelIndex = y * width + x;
        if (visited[pixelIndex]) return;

        const dataIndex = pixelIndex * 4;
        if (!isBgPixel(dataIndex)) return;

        visited[pixelIndex] = 1;
        stack.push(pixelIndex);
      };

      for (let x = 0; x < width; x++) {
        pushIfBg(x, 0);
        pushIfBg(x, height - 1);
      }

      for (let y = 0; y < height; y++) {
        pushIfBg(0, y);
        pushIfBg(width - 1, y);
      }

      while (stack.length > 0) {
        const pixelIndex = stack.pop()!;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const dataIndex = pixelIndex * 4;

        data[dataIndex + 3] = 0;

        pushIfBg(x + 1, y);
        pushIfBg(x - 1, y);
        pushIfBg(x, y + 1);
        pushIfBg(x, y - 1);
      }

      ctx.putImageData(imgData, 0, 0);
      if (isMounted) setProcessedPhonesSrc(canvas.toDataURL("image/png"));
    };

    return () => {
      isMounted = false;
    };
  }, []);

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
        <div className="flex flex-col items-center space-y-2 sm:space-y-3 max-w-4xl mx-auto">
          
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
            className="space-y-1">

            <h1 className="text-[clamp(1.15rem,4.5vw,2.8rem)] font-bold text-white/90 leading-tight whitespace-nowrap">
              {t.headline}{" "}
              <span className="text-seafoam font-black">
                {t.headlineBold}
              </span>
            </h1>
          </motion.div>

          {/* Hero phones image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="-mt-7 sm:-mt-8 md:-mt-7"
          >
            <img
              src={processedPhonesSrc}
              alt="ΦΟΜΟ app - Event και Κράτηση Θέσης"
              className="w-[108vw] max-w-none sm:w-[96vw] sm:max-w-[560px] md:max-w-[660px] lg:max-w-[760px] mx-auto drop-shadow-2xl"
              draggable={false}
            />
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
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0f4475] to-transparent" />
    </section>);

};

export default HeroSection;