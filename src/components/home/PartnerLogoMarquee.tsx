import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PartnerLogoMarqueeProps {
  language: "el" | "en";
}

const FALLBACK_BUSINESSES: Business[] = [
  { id: "1", name: "Kaliva", logo_url: null },
  { id: "2", name: "Blue Martini", logo_url: null },
  { id: "3", name: "Crosta Nostra", logo_url: null },
  { id: "4", name: "Sugar Wave", logo_url: null },
  { id: "5", name: "Eterna", logo_url: null },
  { id: "6", name: "Amnesia", logo_url: null },
];

const PartnerLogoMarquee = ({ language }: PartnerLogoMarqueeProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const title = language === "el" ? "Μας Εμπιστεύονται" : "Trusted By";

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, logo_url")
          .eq("verified", true)
          .limit(12);

        if (error) throw error;
        setBusinesses(data && data.length >= 4 ? data : FALLBACK_BUSINESSES);
      } catch {
        setBusinesses(FALLBACK_BUSINESSES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  // Double for seamless loop
  const marqueeItems = [...businesses, ...businesses];

  if (isLoading) return null;

  return (
    <section className="py-10 overflow-hidden bg-background/50">
      <p className="text-center text-muted-foreground font-poppins text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-6">
        {title}
      </p>

      <div className="relative">
        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-background/50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-background/50 to-transparent z-10 pointer-events-none" />

        {/* Marquee */}
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-10 sm:gap-14 whitespace-nowrap"
          >
            {marqueeItems.map((business, index) => (
              <div
                key={`${business.id}-${index}`}
                className="flex-shrink-0 group cursor-default"
              >
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="h-10 sm:h-12 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-muted-foreground/40 group-hover:text-foreground/80 transition-colors duration-300 tracking-wide">
                    {business.name}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogoMarquee;
