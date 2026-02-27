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
    <div className="relative mx-auto w-[300px] sm:w-[330px]">
      {/* Phone Frame - iPhone-style rounded with seafoam/aegean gradient border */}
      <div className="rounded-[2.8rem] p-[3px] bg-gradient-to-br from-seafoam via-seafoam/80 to-aegean shadow-2xl shadow-seafoam/15">
        <div className="relative rounded-[2.6rem] overflow-hidden bg-[#0a1628]">
          <div className="relative w-full" style={{ aspectRatio: "9/16" }}>
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt="ΦΟΜΟ app"
                draggable={false}
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === current ? 1 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dots - only show when multiple images */}
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
