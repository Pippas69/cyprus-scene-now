import { useState, useEffect } from "react";

const images = [
  "/images/hero-phone-1.png",
  "/images/hero-phone-2.png",
  "/images/hero-phone-3.png",
  "/images/hero-phone-4.png",
  "/images/hero-phone-5.png",
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
    <div className="relative mx-auto w-[200px] sm:w-[220px]">
      {/* Phone Frame - smaller, seafoam gradient border */}
      <div className="rounded-[2rem] p-[3px] bg-gradient-to-br from-seafoam via-seafoam/80 to-aegean shadow-2xl shadow-seafoam/15">
        <div className="relative rounded-[1.8rem] overflow-hidden bg-aegean">
          <div className="relative w-full" style={{ aspectRatio: "9/19.5" }}>
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt="ΦΟΜΟ app"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700 ease-in-out"
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
              i === current ? "bg-seafoam w-4" : "bg-white/30 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PhoneMockupCarousel;
