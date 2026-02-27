import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/images/hero-phone-1.png",
  "/images/hero-phone-2.png",
  "/images/hero-phone-3.png",
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
    <div className="relative mx-auto" style={{ width: "min(220px, 50vw)" }}>
      {/* Phone Frame */}
      <div className="relative rounded-[2rem] border-4 border-white/15 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-b-xl z-20" />
        
        {/* Screen - image fills entirely */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current]}
              alt="ΦΟΜΟ app screenshot"
              className="w-full h-auto block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? "bg-seafoam w-5"
                : "bg-white/30 w-1.5 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhoneMockupCarousel;
