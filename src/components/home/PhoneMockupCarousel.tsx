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
    <div className="relative mx-auto w-[240px]">
      {/* Phone Frame - seafoam border, no notch */}
      <div
        className="rounded-[2rem] overflow-hidden shadow-2xl shadow-seafoam/20"
        style={{
          padding: "4px",
          background: "linear-gradient(135deg, #4ECDC4, #3ec3b7, #4ECDC4)",
        }}
      >
        <div className="rounded-[1.75rem] overflow-hidden bg-[#0D3B66]">
          {/* Fixed screen area */}
          <div className="relative w-full" style={{ aspectRatio: "9/19" }}>
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt="ΦΟΜΟ app"
                className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === current ? 1 : 0 }}
              />
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
