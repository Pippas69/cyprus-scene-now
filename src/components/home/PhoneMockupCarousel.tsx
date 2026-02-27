import { useState, useEffect } from "react";

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
    <div className="relative mx-auto w-[250px] sm:w-[260px]">
      {/* Phone Frame */}
      <div className="rounded-[2rem] p-[4px] bg-gradient-to-br from-seafoam via-seafoam/90 to-aegean shadow-2xl shadow-seafoam/20">
        <div className="relative rounded-[1.75rem] overflow-hidden bg-aegean">
          {/* Fixed screen area */}
          <div className="relative w-full aspect-[9/19]">
            {images.map((src, i) => (
              <div key={src} className="absolute inset-0">
                {/* Fill layer */}
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover object-center blur-sm scale-110 transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === current ? 0.35 : 0 }}
                />
                {/* Sharp layer (no crop) */}
                <img
                  src={src}
                  alt="ΦΟΜΟ app"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === current ? 1 : 0 }}
                />
              </div>
            ))}
          </div>
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
