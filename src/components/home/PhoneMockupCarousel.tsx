import { useState, useEffect } from "react";

const images = [
  "/images/hero-phone-1.png",
];

const PhoneMockupCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px]">
      {/* Single clean phone image - no extra frame */}
      <div className="relative w-full">
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="ΦΟΜΟ app"
            draggable={false}
            className="w-full h-auto transition-opacity duration-700 ease-in-out"
            style={{
              opacity: i === current ? 1 : 0,
              position: i === 0 ? "relative" : "absolute",
              inset: i === 0 ? undefined : 0,
              imageRendering: "auto",
            }}
          />
        ))}
      </div>

      {/* Dots - only show if multiple images */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "bg-seafoam w-4" : "bg-white/30 w-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhoneMockupCarousel;
