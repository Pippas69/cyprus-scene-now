import { Heart, Calendar, MapPin, Share2, Clock } from "lucide-react";
import summerVibesImage from "@/assets/hero-summer-vibes.jpg";

interface Props {
  language: "el" | "en";
}

const t = {
  el: {
    title: "Summer Vibes",
    type: "Event · Beach Party",
    venue: "Kaliva on the Beach",
    date: "Σάβ, 14 Ιουν",
    time: "22:00 – 04:00",
    price: "€15",
    desc: "Το απόλυτο beach party event με τους καλύτερους DJs. Live μουσική, cocktails και ατελείωτη διασκέδαση.",
    going: "248 θα πάνε",
    interested: "1.2K ενδιαφέρονται",
    getTickets: "Αγορά Εισιτηρίων",
  },
  en: {
    title: "Summer Vibes",
    type: "Event · Beach Party",
    venue: "Kaliva on the Beach",
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
      <div className="relative h-[42%] overflow-hidden">
        <img src={summerVibesImage} alt="Summer Vibes Festival" className="absolute inset-0 h-full w-full object-cover" />
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

        {/* Price badge */}
        <div className="absolute bottom-3 right-4">
          <span className="px-2.5 py-1 rounded-lg bg-accent text-[11px] font-bold text-accent-foreground">{txt.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-3 space-y-3 overflow-hidden">
        <div>
          <h2 className="text-[15px] font-bold leading-tight">{txt.title}</h2>
          <p className="text-[10px] text-white/45 mt-0.5">{txt.type}</p>
        </div>

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
            {[0, 1, 2].map((i) => (
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

      {/* Bottom close */}
      <div className="mt-auto px-6 pb-3 pt-2 bg-gradient-to-t from-black/45 to-transparent">
        <div className="mx-auto h-1 w-20 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export default PhoneScreenEvent;

