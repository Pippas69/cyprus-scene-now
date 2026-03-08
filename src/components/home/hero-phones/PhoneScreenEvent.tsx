import { Heart, Calendar, MapPin, Share2, Clock } from "lucide-react";

interface Props {
  language: "el" | "en";
}

const t = {
  el: {
    title: "Summer Vibes Festival",
    venue: "Guaba Beach Bar",
    date: "Σάβ, 14 Ιουν",
    time: "22:00 – 04:00",
    price: "€15",
    desc: "Το απόλυτο beach party event με τους καλύτερους DJs. Live μουσική, cocktails και ατελείωτη διασκέδαση.",
    going: "248 θα πάνε",
    interested: "1.2K ενδιαφέρονται",
    getTickets: "Αγορά Εισιτηρίων",
  },
  en: {
    title: "Summer Vibes Festival",
    venue: "Guaba Beach Bar",
    date: "Sat, Jun 14",
    time: "22:00 – 04:00",
    price: "€15",
    desc: "The ultimate beach party event with the best DJs. Live music, cocktails and endless entertainment.",
    going: "248 going",
    interested: "1.2K interested",
    getTickets: "Get Tickets",
  },
};

const PhoneScreenEvent = ({ language }: Props) => {
  const txt = t[language];

  return (
    <div className="w-full h-full bg-[#0a1929] flex flex-col text-white overflow-hidden select-none pointer-events-none">
      {/* Cover image area */}
      <div className="relative h-[38%] bg-gradient-to-br from-[#1a3d5c] via-[#0f2b45] to-[#0a1929]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1929] via-transparent to-transparent" />
        {/* Decorative circles */}
        <div className="absolute top-[20%] left-[15%] w-16 h-16 rounded-full bg-[#3ec3b7]/10 blur-xl" />
        <div className="absolute top-[35%] right-[20%] w-20 h-20 rounded-full bg-seafoam/8 blur-2xl" />
        {/* Back & share */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
          <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <span className="text-white/80 text-[10px]">←</span>
          </div>
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Heart className="w-3 h-3 text-white/80" />
            </div>
            <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Share2 className="w-3 h-3 text-white/80" />
            </div>
          </div>
        </div>
        {/* Price badge */}
        <div className="absolute bottom-3 right-4">
          <span className="px-2.5 py-1 rounded-lg bg-[#3ec3b7] text-[11px] font-bold text-white">{txt.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-3 space-y-3 overflow-hidden">
        <h2 className="text-[15px] font-bold leading-tight">{txt.title}</h2>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#3ec3b7] flex-shrink-0" />
            <span className="text-[11px] text-white/60">{txt.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-[#3ec3b7] flex-shrink-0" />
            <span className="text-[11px] text-white/60">{txt.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[#3ec3b7] flex-shrink-0" />
            <span className="text-[11px] text-white/60">{txt.time}</span>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[#3ec3b7] to-[#1a3d5c] border border-[#0a1929]" />
            ))}
          </div>
          <span className="text-[10px] text-white/40">{txt.going} · {txt.interested}</span>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">{txt.desc}</p>

        {/* CTA */}
        <div className="w-full h-9 rounded-xl bg-gradient-to-r from-[#3ec3b7] to-[#2da89e] flex items-center justify-center">
          <span className="text-[12px] font-semibold text-white">{txt.getTickets}</span>
        </div>
      </div>

      {/* Bottom nav mock */}
      <div className="px-6 pb-2 pt-2 flex items-center justify-around border-t border-white/5">
        {["🏠", "🗺️", "📅", "🎫", "⚙️"].map((icon, i) => (
          <span key={i} className={`text-[14px] ${i === 0 ? "opacity-100" : "opacity-30"}`}>{icon}</span>
        ))}
      </div>
    </div>
  );
};

export default PhoneScreenEvent;
