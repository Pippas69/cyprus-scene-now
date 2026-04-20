import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getOptimizedImageUrl } from "@/lib/imageLoader";

interface PartnerData {
  name: string;
  initials: string;
  logo_url: string | null;
}

const PartnerLogoMarquee = () => {
  const [partners, setPartners] = useState<PartnerData[]>([]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from("public_businesses_safe")
        .select("name, logo_url")
        .not("logo_url", "is", null)
        .order("created_at", { ascending: true })
        .limit(18);

      if (data) {
        setPartners(
          data.map((b) => ({
            name: b.name.trim(),
            initials: b.name.trim().split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
            logo_url: b.logo_url,
          }))
        );
      }
    };
    fetchBusinesses();
  }, []);

  const marqueeItems = [...partners, ...partners];

  // Reserve vertical space even before data loads to prevent CLS (layout shift).
  // Approx height: title (~24px) + mb-8 (32px) + avatar row (~96px incl. label) + py.
  if (partners.length === 0) {
    return <section aria-hidden="true" className="relative py-8 sm:py-12 min-h-[200px] sm:min-h-[220px] bg-transparent" />;
  }

  return (
    <section className="relative py-8 sm:py-12 overflow-visible bg-transparent min-h-[200px] sm:min-h-[220px]">
      <div className="relative z-10">
        <p className="text-center text-white font-bold text-base sm:text-lg md:text-xl tracking-wider uppercase mb-6 sm:mb-8">
          TRUSTED BY TOP
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden py-2">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-6 sm:gap-10 md:gap-12 whitespace-nowrap"
            >
              {marqueeItems.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 md:w-[72px] md:h-[72px] ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-500 shadow-lg shadow-black/20">
                    <AvatarImage src={partner.logo_url ? getOptimizedImageUrl(partner.logo_url, 144) : undefined} alt={partner.name} />
                    <AvatarFallback className="bg-muted text-white font-semibold text-xs sm:text-sm tracking-wide">
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
