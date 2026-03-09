import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/hooks/useLanguage";

const PARTNER_SEARCH = [
  { display: "Kaliva on the Beach", search: "%kaliva%", gradient: "from-cyan-500 to-blue-600" },
  { display: "Blue Martini", search: "%blue martini%", gradient: "from-blue-400 to-indigo-600" },
  { display: "Amnesia", search: "%amnesia%", gradient: "from-purple-500 to-pink-600" },
  { display: "SugarwaveCy", search: "%sugarwave%", gradient: "from-pink-400 to-rose-600" },
  { display: "Mr. Mellow", search: "%mellow%", gradient: "from-amber-400 to-orange-600" },
  { display: "Legacy", search: "%legacy%", gradient: "from-emerald-400 to-teal-600" },
  { display: "Eterna", search: "%eterna%", gradient: "from-violet-400 to-purple-600" },
  { display: "Baristro", search: "%baristro%", gradient: "from-orange-400 to-red-600" },
  { display: "Crosta Nostra", search: "%crosta%", gradient: "from-teal-400 to-cyan-600" },
];

interface PartnerData {
  name: string;
  initials: string;
  gradient: string;
  logo_url: string | null;
}

const HEADING = "Trusted By";

const PartnerLogoMarquee = () => {

  const [partners, setPartners] = useState<PartnerData[]>(
    PARTNER_SEARCH.map((p) => ({
      name: p.display,
      initials: p.display.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
      gradient: p.gradient,
      logo_url: null,
    }))
  );

  useEffect(() => {
    const fetchLogos = async () => {
      const promises = PARTNER_SEARCH.map(p =>
        supabase
          .from("businesses")
          .select("name, logo_url")
          .ilike("name", p.search)
          .not("logo_url", "is", null)
          .limit(1)
          .maybeSingle()
      );
      const results = await Promise.all(promises);

      setPartners(prev =>
        prev.map((partner, i) => ({
          ...partner,
          logo_url: results[i].data?.logo_url ?? partner.logo_url,
        }))
      );
    };
    fetchLogos();
  }, []);

  const marqueeItems = [...partners, ...partners];

  return (
    <section className="relative py-8 sm:py-12 overflow-hidden bg-transparent">
      <div className="relative z-10">
        <p className="text-center text-white/50 font-playfair text-xs sm:text-sm tracking-[0.25em] uppercase mb-6 sm:mb-8">
          {t.heading}
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
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-500 shadow-lg shadow-black/20">
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
