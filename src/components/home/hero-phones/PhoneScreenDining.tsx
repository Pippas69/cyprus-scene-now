import { Star, MapPin, Clock, Heart, Share2, ChevronRight } from "lucide-react";
import diningHero from "@/assets/dining-hero.jpg";

interface Props {
  language: "el" | "en";
}

const t = {
  el: {
    venue: "The Meze House",
    type: "Εστιατόριο · Μεσογειακή",
    rating: "4.9",
    reviews: "324 κριτικές",
    location: "Λεμεσός, Παλιό Λιμάνι",
    hours: "12:00 – 00:00",
    reserve: "Κράτηση Τραπεζιού",
    desc: "Αυθεντική μεσογειακή κουζίνα με θέα θάλασσα. Φρέσκα θαλασσινά, χειροποίητα ζυμαρικά και εκλεκτά κρασιά.",
    tables: "12 διαθέσιμα τραπέζια",
  },
  en: {
    venue: "The Meze House",
    type: "Restaurant · Mediterranean",
    rating: "4.9",
    reviews: "324 reviews",
    location: "Limassol, Old Port",
    hours: "12:00 – 00:00",
    reserve: "Reserve a Table",
    desc: "Authentic Mediterranean cuisine with sea views. Fresh seafood, handmade pasta and fine wines.",
    tables: "12 tables available",
  },
};

const PhoneScreenDining = ({ language }: Props) => {
  const txt = t[language];

  return (
    <div className="w-full h-full bg-[#0a1929] flex flex-col text-white overflow-hidden select-none pointer-events-none">
      {/* Cover image - same 42% as event screen */}
      <div className="relative h-[42%] overflow-hidden">
        <img src={diningHero} alt="Restaurant" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1929] via-[#0a1929]/25 to-black/35" />

        {/* Decorative glow */}
        <div className="absolute top-[20%] left-[12%] w-20 h-20 rounded-full bg-seafoam/20 blur-2xl" />

        {/* Back & share */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
          <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur flex items-center justify-center border border-white/15">
            <span className="text-white/80 text-[10px]">←</span>
          </div>
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur flex items-center justify-center border border-white/15">
              <Heart className="w-3 h-3 text-white/80" />
            </div>
            <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur flex items-center justify-center border border-white/15">
              <Share2 className="w-3 h-3 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-3 space-y-3 overflow-hidden">
        <div>
          <h2 className="text-[15px] font-bold leading-tight">{txt.venue}</h2>
          <p className="text-[10px] text-white/45 mt-0.5">{txt.type}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                fill={s <= 4 ? "#3ec3b7" : "none"}
                stroke="#3ec3b7"
                strokeWidth={s <= 4 ? 0 : 1.5}
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-[#3ec3b7]">{txt.rating}</span>
          <span className="text-[9px] text-white/35">({txt.reviews})</span>
        </div>

        {/* Location & hours */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#3ec3b7] flex-shrink-0" />
            <span className="text-[11px] text-white/60">{txt.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[#3ec3b7] flex-shrink-0" />
            <span className="text-[11px] text-white/60">{txt.hours}</span>
          </div>
        </div>

        {/* Tables available */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[#3ec3b7] to-[#1a3d5c] border border-[#0a1929]" />
            ))}
          </div>
          <span className="text-[10px] text-white/40">{txt.tables}</span>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">{txt.desc}</p>

        {/* CTA */}
        <div className="w-full h-9 rounded-xl bg-gradient-to-r from-[#3ec3b7] to-[#2da89e] flex items-center justify-center gap-1.5">
          <span className="text-[12px] font-semibold text-white">{txt.reserve}</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/80" />
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto px-6 pb-3 pt-2 bg-gradient-to-t from-black/45 to-transparent">
        <div className="mx-auto h-1 w-20 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export default PhoneScreenDining;
