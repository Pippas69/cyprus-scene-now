import { Calendar, MapPin, Users, Clock, ChevronRight } from "lucide-react";

interface Props {
  language: "el" | "en";
}

const t = {
  el: {
    title: "Κράτηση Θέσης",
    event: "Opening Party!",
    venue: "Kaliva on the beach",
    date: "29 Μαΐ, 2026",
    time: "21:00",
    guests: "4 άτομα",
    type: "VIP Table",
    confirm: "Επιβεβαίωση",
    status: "Επιβεβαιωμένη",
  },
  en: {
    title: "Seat Reservation",
    event: "Opening Party!",
    venue: "Kaliva on the beach",
    date: "May 29, 2026",
    time: "21:00",
    guests: "4 guests",
    type: "VIP Table",
    confirm: "Confirm",
    status: "Confirmed",
  },
};

const PhoneScreenReservation = ({ language }: Props) => {
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

      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-[15px] font-bold tracking-tight">{txt.title}</h2>
        <p className="text-[11px] text-white/50 mt-0.5">{txt.event}</p>
      </div>

      {/* Status badge */}
      <div className="px-5 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3ec3b7]/20 text-[#3ec3b7] text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ec3b7]" />
          {txt.status}
        </span>
      </div>

      {/* Details card */}
      <div className="mx-4 rounded-xl bg-white/[0.06] border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#3ec3b7]/15 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-[#3ec3b7]" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Venue</p>
            <p className="text-[12px] font-medium">{txt.venue}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#3ec3b7]/15 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-[#3ec3b7]" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{language === "el" ? "Ημερομηνία" : "Date"}</p>
            <p className="text-[12px] font-medium">{txt.date} · {txt.time}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#3ec3b7]/15 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#3ec3b7]" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{language === "el" ? "Παρέα" : "Party"}</p>
            <p className="text-[12px] font-medium">{txt.guests} · {txt.type}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-4">
        <div className="w-full h-9 rounded-xl bg-gradient-to-r from-[#3ec3b7] to-[#2da89e] flex items-center justify-center gap-1.5">
          <span className="text-[12px] font-semibold text-white">{txt.confirm}</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/80" />
        </div>
      </div>

      {/* Bottom close */}
      <div className="mt-auto px-6 pb-3 pt-3 bg-gradient-to-t from-black/45 to-transparent">
        <div className="mx-auto h-1 w-20 rounded-full bg-white/30" />
      </div>
    </div>
  );
};

export default PhoneScreenReservation;
