import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import FeaturedEventCard from "./FeaturedEventCard";
import { SkeletonGroup, ContentReveal } from "@/components/ui/skeleton";

interface HeroCarouselProps {
  language: "el" | "en";
  user: any;
}

const HeroCarousel = ({ language, user }: HeroCarouselProps) => {
  const { data: featuredEvents, isLoading } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          businesses!inner (
            name,
            logo_url,
            verified,
            city
          ),
          realtime_stats (
            interested_count,
            going_count
          )
        `)
        .eq("businesses.verified", true)
        .gte("start_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Sort by engagement score
      return (data || []).sort((a, b) => {
        const aScore = 
          (a.realtime_stats?.[0]?.interested_count || 0) + 
          (a.realtime_stats?.[0]?.going_count || 0) * 2;
        const bScore = 
          (b.realtime_stats?.[0]?.interested_count || 0) + 
          (b.realtime_stats?.[0]?.going_count || 0) * 2;
        return bScore - aScore;
      });
    },
  });

  const translations = {
    el: {
      featured: "Προβεβλημένες Εκδηλώσεις",
    },
    en: {
      featured: "Featured Events",
    },
  };

  const t = translations[language];

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{t.featured}</h2>
        <div className="relative w-full h-[350px] md:h-[500px] rounded-2xl overflow-hidden">
          <SkeletonGroup count={1} className="h-full" itemClassName="h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!featuredEvents || featuredEvents.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{t.featured}</h2>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {featuredEvents.map((event) => (
            <CarouselItem key={event.id}>
              <FeaturedEventCard event={event} language={language} user={user} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
};

export default HeroCarousel;
