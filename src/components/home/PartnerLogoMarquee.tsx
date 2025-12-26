import { useEffect, useState } from "react";
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

const PartnerLogoMarquee = ({ language }: PartnerLogoMarqueeProps) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const text = {
    el: { title: "Εμπιστεύονται οι Καλύτεροι της Κύπρου" },
    en: { title: "Trusted by Cyprus's Best" },
  };

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, logo_url")
          .eq("verified", true)
          .limit(12);

        if (error) throw error;
        setBusinesses(data || []);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  // Create placeholder businesses if not enough real ones
  const displayBusinesses = businesses.length >= 6 
    ? businesses 
    : [
        { id: "1", name: "Παραλία Beach Bar", logo_url: null },
        { id: "2", name: "Ouzeri Limassol", logo_url: null },
        { id: "3", name: "Κέντρο Νυχτερινό", logo_url: null },
        { id: "4", name: "Rooftop Lounge", logo_url: null },
        { id: "5", name: "Taverna Cyprus", logo_url: null },
        { id: "6", name: "Sunset Club", logo_url: null },
        { id: "7", name: "Marina Restaurant", logo_url: null },
        { id: "8", name: "Harbour Bar", logo_url: null },
      ];

  // Double the array for seamless loop
  const marqueeItems = [...displayBusinesses, ...displayBusinesses];

  if (isLoading) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <p className="text-center text-muted-foreground font-poppins text-sm uppercase tracking-widest">
          {text[language].title}
        </p>
      </div>
      
      <div className="relative">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
        
        {/* Marquee container */}
        <div className="flex animate-marquee">
          {marqueeItems.map((business, index) => (
            <div
              key={`${business.id}-${index}`}
              className="flex-shrink-0 mx-8 group"
            >
              <div className="w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden transition-all duration-300 grayscale hover:grayscale-0 group-hover:border-primary/30 group-hover:shadow-lg">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-16 h-16 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Building2 className="w-8 h-8" />
                    <span className="text-[8px] mt-1 max-w-[60px] text-center truncate">
                      {business.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default PartnerLogoMarquee;
