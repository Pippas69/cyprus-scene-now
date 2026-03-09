import { Search, MapPin, Star } from "lucide-react";

interface Props {
  language: "el" | "en";
}

const t = {
  el: {
    search: "Αναζήτηση τοποθεσίας...",
    nearYou: "Κοντά σου",
    venues: [
      { name: "Guaba Beach Bar", type: "Beach Club", rating: "4.8", distance: "0.3 km" },
      { name: "Privilege Lounge", type: "Bar & Lounge", rating: "4.6", distance: "0.8 km" },
      { name: "Soho Club", type: "Night Club", rating: "4.5", distance: "1.2 km" },
    ],
  },
  en: {
    search: "Search location...",
    nearYou: "Near you",
    venues: [
      { name: "Guaba Beach Bar", type: "Beach Club", rating: "4.8", distance: "0.3 km" },
      { name: "Privilege Lounge", type: "Bar & Lounge", rating: "4.6", distance: "0.8 km" },
      { name: "Soho Club", type: "Night Club", rating: "4.5", distance: "1.2 km" },
    ],
  },
};

const PhoneScreenMap = ({ language }: Props) => {
  const txt = t[language];

  return (
    <div className="w-full h-full bg-[#0a1929] flex flex-col text-white overflow-hidden select-none pointer-events-none">
      {/* Status bar mock */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="text-[9px] font-medium opacity-60">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-sm border border-white/40" />
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[11px] text-white/30">{txt.search}</span>
        </div>
      </div>

      {/* Map area */}
      <div className="relative mx-4 h-[40%] rounded-xl bg-gradient-to-br from-[#112940] via-[#0d2035] to-[#0a192a] border border-white/5 overflow-hidden">
        {/* Road grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-[25%] left-0 right-0 h-px bg-white/[0.04]" />
          <div className="absolute top-[50%] left-0 right-0 h-px bg-white/[0.04]" />
          <div className="absolute top-[75%] left-0 right-0 h-px bg-white/[0.04]" />
          <div className="absolute left-[30%] top-0 bottom-0 w-px bg-white/[0.04]" />
          <div className="absolute left-[60%] top-0 bottom-0 w-px bg-white/[0.04]" />
        </div>

        {/* Map pins */}
        <div className="absolute top-[30%] left-[25%]">
          <div className="w-6 h-6 rounded-full bg-[#3ec3b7] flex items-center justify-center shadow-lg shadow-[#3ec3b7]/30">
            <MapPin className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="absolute top-[55%] left-[55%]">
          <div className="w-5 h-5 rounded-full bg-[#3ec3b7]/60 flex items-center justify-center">
            <MapPin className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div className="absolute top-[20%] right-[20%]">
          <div className="w-5 h-5 rounded-full bg-[#3ec3b7]/60 flex items-center justify-center">
            <MapPin className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div className="absolute top-[65%] left-[15%]">
          <div className="w-4 h-4 rounded-full bg-[#3ec3b7]/40 flex items-center justify-center">
            <MapPin className="w-2 h-2 text-white" />
          </div>
        </div>

        {/* User location */}
        <div className="absolute top-[45%] left-[45%]">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg">
            <div className="absolute -inset-2 rounded-full bg-blue-500/20 animate-ping" />
          </div>
        </div>
      </div>

      {/* Venue list */}
      <div className="px-4 pt-3 flex-1 overflow-hidden">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">{txt.nearYou}</p>
        <div className="space-y-2">
          {txt.venues.map((venue, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3ec3b7]/20 to-[#1a3d5c]/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#3ec3b7]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{venue.name}</p>
                <p className="text-[9px] text-white/40">{venue.type} · {venue.distance}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-medium text-white/60">{venue.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom close */}
      <div className="mt-auto px-6 pb-3 pt-3 bg-gradient-to-t from-black/45 to-transparent">
        <div className="mx-auto h-1 w-20 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export default PhoneScreenMap;
