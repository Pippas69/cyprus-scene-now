import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/images/hero-phone-1.png",
  "/images/hero-phone-2.png",
  "/images/hero-phone-3.png",
  "/images/hero-phone-4.png",
];

const PhoneMockupCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto" style={{ width: "min(260px, 60vw)" }}>
      {/* Phone Frame */}
      <div className="relative rounded-[2.5rem] border-[6px] border-white/20 bg-[#0D3B66] shadow-2xl shadow-black/40 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-20" />
        
        {/* Screen */}
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2rem] bg-[#0D3B66]">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current]}
              alt="ΦΟΜΟ app screenshot"
              className="absolute inset-0 w-full h-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "bg-seafoam w-6"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhoneMockupCarousel;
