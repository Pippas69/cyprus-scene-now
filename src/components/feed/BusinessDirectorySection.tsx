import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, BadgeCheck, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AllBusinessesDialog } from "./AllBusinessesDialog";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  category: string[];
  city: string;
  verified: boolean | null;
  student_discount_percent?: number | null;
  student_discount_mode?: "once" | "unlimited" | string | null;
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  hasProfileBoost?: boolean;
}

interface BusinessDirectorySectionProps {
  language: "el" | "en";
  selectedCity?: string | null;
}

const translations = {
  el: {
    exploreBusinesses: "Εξερευνήστε Επιχειρήσεις",
    seeMore: "Δείτε περισσότερα",
    noBusinesses: "Δεν βρέθηκαν επιχειρήσεις",
  },
  en: {
    exploreBusinesses: "Explore Businesses",
    seeMore: "See more",
    noBusinesses: "No businesses found",
  },
};

export const BusinessDirectorySection = ({ 
  language,
  selectedCity 
}: BusinessDirectorySectionProps) => {
  const t = translations[language];
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['all-businesses-directory', selectedCity],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('businesses')
        .select('id, name, logo_url, category, city, verified, student_discount_percent, student_discount_mode')
        .eq('verified', true)
        .order('created_at', { ascending: false });
      
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }
      
      const { data: businessList, error } = await query.limit(12);
      if (error) throw error;
      if (!businessList?.length) return [];

      const businessIds = businessList.map(b => b.id);

      // Fetch active boosts in parallel
      const [eventBoostsRes, offerBoostsRes, profileBoostsRes] = await Promise.all([
        supabase
          .from('event_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('status', 'active')
          .lte('start_date', today)
          .gte('end_date', today),
        supabase
          .from('offer_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('active', true),
        supabase
          .from('profile_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('status', 'active')
          .lte('start_date', today)
          .gte('end_date', today),
      ]);

      const hasEventBoost = new Set(eventBoostsRes.data?.map(b => b.business_id) || []);
      const hasOfferBoost = new Set(offerBoostsRes.data?.map(b => b.business_id) || []);
      const hasProfileBoost = new Set(profileBoostsRes.data?.map(b => b.business_id) || []);

      return businessList.map(business => ({
        ...business,
        hasEventBoost: hasEventBoost.has(business.id),
        hasOfferBoost: hasOfferBoost.has(business.id),
        hasProfileBoost: hasProfileBoost.has(business.id),
      })) as Business[];
    },
    staleTime: 60000
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t.exploreBusinesses}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.exploreBusinesses}</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDialogOpen(true)}
          className="text-primary hover:text-primary/80 gap-1"
        >
          {t.seeMore}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Link
              to={`/business/${business.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage 
                    src={business.logo_url || undefined} 
                    alt={business.name} 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {business.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <BusinessBoostBadges
                  hasEventBoost={business.hasEventBoost}
                  hasOfferBoost={business.hasOfferBoost}
                  studentDiscountPercent={business.student_discount_percent}
                  studentDiscountMode={business.student_discount_mode}
                  language={language}
                />
                {business.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                  </div>
                )}
              </div>

              <span className="text-xs font-medium text-center line-clamp-1 max-w-full group-hover:text-primary transition-colors">
                {business.name}
              </span>

              <span className="text-[10px] text-muted-foreground">
                {business.city}
              </span>

              {business.category?.[0] && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {business.category[0]}
                </Badge>
              )}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <AllBusinessesDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        language={language}
        selectedCity={selectedCity}
      />
    </div>
  );
};

export default BusinessDirectorySection;
