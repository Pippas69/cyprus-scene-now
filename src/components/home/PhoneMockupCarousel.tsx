import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-[240px]">
      {/* Phone Frame - fixed size, never changes */}
      <div className="rounded-[2.5rem] border-[5px] border-white/20 bg-black shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-20" />

        {/* Fixed screen area */}
        <div className="relative w-full" style={{ aspectRatio: "9/19.5" }}>
          {/* All images stacked, only opacity changes */}
          {images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="ΦΟΜΟ app"
              className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === current ? 1 : 0 }}
            />
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-seafoam w-5" : "bg-white/30 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhoneMockupCarousel;
