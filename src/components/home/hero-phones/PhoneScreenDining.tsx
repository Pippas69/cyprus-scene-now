import { Star, MapPin, Clock, Users, ChevronRight, Utensils } from "lucide-react";

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
    capacity: "Διαθέσιμα τραπέζια",
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
    capacity: "Tables available",
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

      {/* Cover image area */}
      <div className="relative h-[28%] bg-gradient-to-br from-[#1a3a2a] via-[#0f2620] to-[#0a1929] overflow-hidden">
        {/* Decorative food/ambiance pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-3 left-4 w-14 h-14 rounded-full bg-[#c8956c]/40 blur-xl" />
          <div className="absolute bottom-2 right-6 w-20 h-12 rounded-full bg-[#3ec3b7]/20 blur-xl" />
          <div className="absolute top-6 right-10 w-8 h-8 rounded-full bg-[#e8c170]/30 blur-lg" />
        </div>
        {/* Utensils icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Utensils className="w-8 h-8 text-[#e8c170]" />
          </div>
        </div>
        {/* Popular badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full bg-[#e8c170]/20 text-[#e8c170] text-[8px] font-bold uppercase tracking-wider">
            {txt.popular}
          </span>
        </div>
      </div>

      {/* Venue info */}
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[15px] font-bold tracking-tight">{txt.venue}</h2>
        <p className="text-[10px] text-white/45 mt-0.5">{txt.type}</p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                fill={s <= 4 ? "#e8c170" : "none"}
                stroke={s <= 4 ? "#e8c170" : "#e8c170"}
                strokeWidth={s === 5 ? 1.5 : 0}
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-[#e8c170]">{txt.rating}</span>
          <span className="text-[9px] text-white/35">({txt.reviews})</span>
        </div>
      </div>

      {/* Details row */}
      <div className="mx-4 flex items-center gap-3 py-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[#3ec3b7]" />
          <span className="text-[9px] text-white/50">{txt.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
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
              <span className="text-[10px] text-[#e8c170] font-semibold">{item.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-3">
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
