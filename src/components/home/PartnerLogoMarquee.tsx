import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const PARTNER_NAMES = [
  "Kaliva on the Beach",
  "Blue Martini",
  "Amnesia",
  "SugarwaveCy",
  "Mr. Mellow",
  "Legacy",
  "Eterna",
  "Baristro",
  "Crosta Nostra",
];

const GRADIENTS = [
  "from-cyan-500 to-blue-600",
  "from-blue-400 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
  "from-orange-400 to-red-600",
  "from-teal-400 to-cyan-600",
];

interface PartnerData {
  name: string;
  initials: string;
  gradient: string;
  logo_url: string | null;
}

const PartnerLogoMarquee = () => {
  const [partners, setPartners] = useState<PartnerData[]>(
    PARTNER_NAMES.map((name, i) => ({
      name,
      initials: name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
      gradient: GRADIENTS[i % GRADIENTS.length],
      logo_url: null,
    }))
  );

  useEffect(() => {
    const fetchLogos = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, logo_url")
        .in("name", PARTNER_NAMES);

      if (data && data.length > 0) {
        const logoMap = new Map(data.map(b => [b.name, b.logo_url]));
        setPartners(prev =>
          prev.map(p => ({ ...p, logo_url: logoMap.get(p.name) ?? p.logo_url }))
        );
      }
    };
    fetchLogos();
  }, []);

  const marqueeItems = [...partners, ...partners];

  return (
    <section className="relative py-8 sm:py-12 overflow-hidden bg-transparent">
      <div className="relative z-10">
        <p className="text-center text-white/50 font-playfair text-xs sm:text-sm tracking-[0.25em] uppercase mb-6 sm:mb-8">
          Ήδη στο ΦΟΜΟ
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-8 sm:gap-12 whitespace-nowrap"
            >
              {marqueeItems.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                  <Avatar className={`w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-500 shadow-lg shadow-black/20`}>
                    <AvatarImage src={partner.logo_url || undefined} alt={partner.name} />
                    <AvatarFallback className={`bg-gradient-to-br ${partner.gradient} text-white font-semibold text-xs sm:text-sm tracking-wide`}>
                      {partner.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] sm:text-xs text-white/35 group-hover:text-white/55 transition-colors duration-500 font-medium">
                    {partner.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogoMarquee;
