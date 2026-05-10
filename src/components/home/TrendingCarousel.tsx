import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrendingCarouselProps {
  language: "en" | "el";
  compact?: boolean;
}

interface Venue {
  id: string;
  name: string;
  category: string[] | null;
  city: string | null;
  cover_url: string | null;
  description: string | null;
}

const CATEGORY_GRADIENTS: Record<string, { grad: string; glow: string }> = {
  nightclub:   { grad: "linear-gradient(155deg, #0a001a 0%, #1c0040 50%, #0a0020 100%)", glow: "#A855F7" },
  club:        { grad: "linear-gradient(155deg, #0a001a 0%, #1c0040 50%, #0a0020 100%)", glow: "#A855F7" },
  bar:         { grad: "linear-gradient(155deg, #001a12 0%, #003a28 50%, #000e08 100%)", glow: "#4CAF50" },
  restaurant:  { grad: "linear-gradient(155deg, #1a0a00 0%, #3d1800 50%, #1a0800 100%)", glow: "#FF8C42" },
  cafe:        { grad: "linear-gradient(155deg, #1a0c00 0%, #3d2000 50%, #241000 100%)", glow: "#D4A453" },
  fitness:     { grad: "linear-gradient(155deg, #001824 0%, #003c5a 50%, #001428 100%)", glow: "#7EC8F0" },
  gym:         { grad: "linear-gradient(155deg, #001824 0%, #003c5a 50%, #001428 100%)", glow: "#7EC8F0" },
  theatre:     { grad: "linear-gradient(155deg, #18001a 0%, #3c0040 50%, #100018 100%)", glow: "#E040FB" },
  default:     { grad: "linear-gradient(155deg, #001530 0%, #0d3b66 50%, #001020 100%)", glow: "#4ECDC4" },
};

const getGradient = (categories: string[] | null) => {
  if (!categories?.length) return CATEGORY_GRADIENTS.default;
  const cat = categories[0].toLowerCase();
  return (
    Object.entries(CATEGORY_GRADIENTS).find(([k]) => cat.includes(k))?.[1]
    ?? CATEGORY_GRADIENTS.default
  );
};

const fetchVenues = async (): Promise<Venue[]> => {
  const { data } = await supabase
    .from("public_businesses_safe")
    .select("id, name, category, city, cover_url, description")
    .eq("verified", true)
    .not("name", "is", null)
    .order("created_at", { ascending: false })
    .limit(14);

  if (!data) return [];
  return data as Venue[];
};

const labels = {
  en: { eyebrow: "Trending", title: "Trending\nNow", view: "Visit" },
  el: { eyebrow: "Trending", title: "Trending\nτώρα", view: "Επίσκεψη" },
};

const TrendingCarousel = ({ language, compact = false }: TrendingCarouselProps) => {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const t = labels[language];

  const { data: venues = [] } = useQuery({
    queryKey: ["home", "trending-venues"],
    queryFn: fetchVenues,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || venues.length === 0) return;
    const onScroll = () => {
      const cardW = el.scrollWidth / venues.length;
      setActiveIdx(Math.round(el.scrollLeft / cardW));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [venues.length]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el || venues.length === 0) return;
    const cardW = el.scrollWidth / venues.length;
    el.scrollTo({ left: cardW * idx, behavior: "smooth" });
  }, [venues.length]);

  const scrollBy = useCallback((dir: "prev" | "next") => {
    const next = dir === "next"
      ? Math.min(activeIdx + 1, venues.length - 1)
      : Math.max(activeIdx - 1, 0);
    scrollTo(next);
  }, [activeIdx, venues.length, scrollTo]);

  if (venues.length === 0) return null;

  const titleLines = t.title.split("\n");

  return (
    <section className={`${compact ? "pt-10 pb-14" : "py-16 sm:py-24"} bg-background overflow-hidden`}>
      <div className="px-6 sm:px-10 lg:px-16">

        {/* Header */}
        <div className="flex items-end justify-between mb-10 sm:mb-14">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7 }}
              className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
            >
              {t.eyebrow}
            </motion.p>
            <h2
              className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.045em]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              {titleLines.map((line, i) => (
                <motion.span
                  key={i}
                  className="block overflow-hidden pb-[0.15em]"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                >
                  <motion.span
                    className="block"
                    style={{ transformOrigin: "0% 100%" }}
                    variants={{
                      hidden: { y: "110%", rotateZ: 7 },
                      visible: { y: "0%", rotateZ: 0, transition: { duration: 1.05, ease: [0.215, 0.61, 0.355, 1], delay: 0.05 + i * 0.08 } },
                    }}
                  >
                    {line}
                  </motion.span>
                </motion.span>
              ))}
            </h2>
          </div>

          {/* Arrow controls */}
          <div className="flex items-center gap-2 pb-1.5">
            <button
              onClick={() => scrollBy("prev")}
              disabled={activeIdx === 0}
              aria-label="Previous"
              className="w-9 h-9 rounded-full ring-1 ring-white/[0.1] flex items-center justify-center text-white/30 hover:text-white hover:ring-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy("next")}
              disabled={activeIdx >= venues.length - 1}
              aria-label="Next"
              className="w-9 h-9 rounded-full ring-1 ring-white/[0.1] flex items-center justify-center text-white/30 hover:text-white hover:ring-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {venues.map((venue, i) => {
            const { grad, glow } = getGradient(venue.category);
            const cat = venue.category?.[0] ?? null;

            return (
              <motion.article
                key={venue.id}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 4) * 0.06 }}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden group flex flex-col"
                style={{
                  width: "clamp(220px, 28vw, 300px)",
                  scrollSnapAlign: "start",
                }}
              >
                {/* Image / gradient */}
                <div className="relative overflow-hidden" style={{ height: "200px" }}>
                  {venue.cover_url ? (
                    <img
                      src={venue.cover_url}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
                      style={{ background: grad }}
                    >
                      <div aria-hidden className="absolute top-6 left-8 w-24 h-24 rounded-full opacity-35 blur-2xl" style={{ background: glow }} />
                      <div aria-hidden className="absolute bottom-4 right-6 w-16 h-16 rounded-full opacity-25 blur-xl" style={{ background: glow }} />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                  {/* Category chip */}
                  {cat && (
                    <div className="absolute top-3 left-3">
                      <span className="font-inter text-[10px] font-medium tracking-[0.08em] uppercase text-[#4ECDC4] bg-[#07111E]/80 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {cat}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 bg-background/80 border border-white/[0.06] p-5">
                  <h3
                    className="font-urbanist font-bold text-white leading-tight tracking-[-0.02em] mb-1.5"
                    style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)" }}
                  >
                    {venue.name}
                  </h3>

                  {venue.city && (
                    <p className="flex items-center gap-1 font-inter text-[12px] text-white/30 mb-3">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {venue.city}
                    </p>
                  )}

                  {venue.description && (
                    <p className="font-inter text-[13px] text-white/38 leading-relaxed line-clamp-2 flex-1 mb-4">
                      {venue.description}
                    </p>
                  )}

                  <Link
                    to={`/business/${venue.id}`}
                    className="mt-auto inline-flex items-center justify-center rounded-[12px] bg-[#FEFAF6]/[0.07] hover:bg-[#FEFAF6]/[0.12] border border-white/[0.08] hover:border-white/[0.16] text-white/70 hover:text-white font-inter text-[12px] font-medium py-2.5 transition-all duration-200"
                  >
                    {t.view}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Dot indicators */}
        {venues.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center gap-1.5 mt-8"
            role="tablist"
            aria-label="Carousel position"
          >
            {venues.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === activeIdx}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? "w-6 h-1.5 bg-[#7EC8F0]"
                    : "w-1.5 h-1.5 bg-white/15 hover:bg-white/30"
                }`}
              />
            ))}
          </motion.div>
        )}

      </div>
    </section>
  );
};

export default TrendingCarousel;
