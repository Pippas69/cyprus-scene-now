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
    <div className="relative mx-auto w-[300px] sm:w-[330px]">
      {/* Phone Frame - iPhone-style rounded with seafoam/aegean gradient border */}
      <div className="rounded-[2.8rem] p-[3px] bg-gradient-to-br from-seafoam via-seafoam/80 to-aegean shadow-2xl shadow-seafoam/15">
        <div className="relative rounded-[2.6rem] overflow-hidden bg-background">
            <div className="relative w-full" style={{ aspectRatio: "9/14" }}>
              {images.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt="ΦΟΜΟ app"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === current ? 1 : 0 }}
                />
              ))}
              {/* Overlay text for first slide */}
              <div
                className="absolute inset-0 flex flex-col justify-between pointer-events-none transition-opacity duration-700 ease-in-out"
                style={{ opacity: current === 0 ? 1 : 0 }}
              >
                <div className="pt-3 px-4">
                  <h3 className="text-sm font-bold text-seafoam tracking-wide">Explore Events</h3>
                </div>
                <div className="pb-3 px-4 text-center">
                  <span className="text-[10px] font-semibold text-white/60 tracking-widest">2026 ΦΟΜΟ</span>
                </div>
              </div>
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
              i === current ? "bg-seafoam w-4" : "bg-white/30 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhoneMockupCarousel;
