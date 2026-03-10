import { Star, MapPin, Clock, ChevronRight } from "lucide-react";
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
    popular: "Δημοφιλές",
    menu: "Μενού",
    item1: "Σαγανάκι Θαλασσινών",
    item1price: "€14.50",
    item2: "Μοσχαρίσια Παρειά",
    item2price: "€22.00",
    item3: "Λαβράκι Σχάρας",
    item3price: "€19.50",
  },
  en: {
    venue: "The Meze House",
    type: "Restaurant · Mediterranean",
    rating: "4.9",
    reviews: "324 reviews",
    location: "Limassol, Old Port",
    hours: "12:00 – 00:00",
    reserve: "Reserve a Table",
    popular: "Popular",
    menu: "Menu",
    item1: "Seafood Saganaki",
    item1price: "€14.50",
    item2: "Braised Beef Cheek",
    item2price: "€22.00",
    item3: "Grilled Sea Bass",
    item3price: "€19.50",
  },
};

const PhoneScreenDining = ({ language }: Props) => {
  const txt = t[language];

  return (
    <div className="w-full h-full bg-[#0a1929] flex flex-col text-white overflow-hidden select-none pointer-events-none">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-[9px] font-medium opacity-60">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-sm border border-white/40" />
        </div>
      </div>

      {/* Cover photo */}
      <div className="relative h-[26%] overflow-hidden">
        <img
          src={diningHero}
          alt="Restaurant"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1929] via-[#0a1929]/40 to-transparent" />
        {/* Popular badge */}
        <div className="absolute top-2.5 right-3">
          <span className="px-2 py-0.5 rounded-full bg-[#3ec3b7]/20 text-[#3ec3b7] text-[8px] font-bold uppercase tracking-wider">
            {txt.popular}
          </span>
        </div>
      </div>

      {/* Venue info */}
      <div className="px-4 pt-2.5 pb-1.5">
        <h2 className="text-[15px] font-bold tracking-tight">{txt.venue}</h2>
        <p className="text-[10px] text-white/45 mt-0.5">{txt.type}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                fill={s <= 4 ? "#3ec3b7" : "none"}
                stroke={s <= 4 ? "#3ec3b7" : "#3ec3b7"}
                strokeWidth={s === 5 ? 1.5 : 0}
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-[#3ec3b7]">{txt.rating}</span>
          <span className="text-[9px] text-white/35">({txt.reviews})</span>
        </div>
      </div>

      {/* Location & hours - single row */}
      <div className="mx-4 flex items-center gap-3 py-1.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#3ec3b7]" />
          <span className="text-[9px] text-white/50">{txt.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#3ec3b7]" />
          <span className="text-[9px] text-white/50">{txt.hours}</span>
        </div>
      </div>

      {/* Menu preview */}
      <div className="mx-4 mt-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3">
        <p className="text-[9px] text-white/35 uppercase tracking-wider font-semibold mb-2">{txt.menu}</p>
        <div className="space-y-2">
          {[
            { name: txt.item1, price: txt.item1price },
            { name: txt.item2, price: txt.item2price },
            { name: txt.item3, price: txt.item3price },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/80">{item.name}</span>
              <span className="text-[10px] text-[#3ec3b7] font-semibold">{item.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-2.5">
        <div className="w-full h-9 rounded-xl bg-gradient-to-r from-[#3ec3b7] to-[#2da89e] flex items-center justify-center gap-1.5">
          <span className="text-[12px] font-semibold text-white">{txt.reserve}</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/80" />
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto px-6 pb-3 pt-3 bg-gradient-to-t from-black/45 to-transparent">
        <div className="mx-auto h-1 w-20 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export default PhoneScreenDining;
