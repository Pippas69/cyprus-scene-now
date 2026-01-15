import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BadgeCheck, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanTierIndex, getCityDistance, type PlanSlug } from "@/lib/personalization";

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  category: string[];
  city: string;
  verified: boolean | null;
  description: string | null;
  student_discount_percent?: number | null;
  student_discount_mode?: "once" | "unlimited" | string | null;
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  hasProfileBoost?: boolean;
  planSlug?: PlanSlug | string | null;
  planTierIndex?: number;
}

interface AllBusinessesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "el" | "en";
  selectedCity?: string | null;
  userCity?: string | null;
}

const translations = {
  el: {
    title: "Όλες οι Επιχειρήσεις",
    searchPlaceholder: "Αναζήτηση επιχειρήσεων...",
    noResults: "Δεν βρέθηκαν επιχειρήσεις",
    verified: "Επαληθευμένο",
  },
  en: {
    title: "All Businesses",
    searchPlaceholder: "Search businesses...",
    noResults: "No businesses found",
    verified: "Verified",
  },
};

export const AllBusinessesDialog = ({ 
  open, 
  onOpenChange,
  language,
  selectedCity,
  userCity = null,
}: AllBusinessesDialogProps) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState("");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['all-businesses-dialog', selectedCity, userCity],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('businesses')
        .select('id, name, logo_url, category, city, verified, description, student_discount_percent, student_discount_mode')
        .eq('verified', true);
      
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }
      
      const { data: businessList, error } = await query.limit(100);
      if (error) throw error;
      if (!businessList?.length) return [];

      const businessIds = businessList.map(b => b.id);

      // Fetch active boosts and subscription plans in parallel
      const [eventBoostsRes, offerBoostsRes, profileBoostsRes, subscriptionsRes] = await Promise.all([
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
        supabase
          .from('business_subscriptions')
          .select('business_id, subscription_plans(slug)')
          .in('business_id', businessIds)
          .eq('status', 'active'),
      ]);

      const hasEventBoost = new Set(eventBoostsRes.data?.map(b => b.business_id) || []);
      const hasOfferBoost = new Set(offerBoostsRes.data?.map(b => b.business_id) || []);
      const hasProfileBoost = new Set(profileBoostsRes.data?.map(b => b.business_id) || []);
      
      // Map subscription plans to businesses
      const subscriptionMap = new Map<string, string>();
      subscriptionsRes.data?.forEach((sub: any) => {
        if (sub.subscription_plans?.slug) {
          subscriptionMap.set(sub.business_id, sub.subscription_plans.slug);
        }
      });

      // Build businesses with plan tier index
      const businessesWithTiers = businessList.map(business => {
        const planSlug = subscriptionMap.get(business.id) || 'free';
        const planTierIndex = getPlanTierIndex(planSlug);
        
        return {
          ...business,
          hasEventBoost: hasEventBoost.has(business.id),
          hasOfferBoost: hasOfferBoost.has(business.id),
          hasProfileBoost: hasProfileBoost.has(business.id),
          planSlug,
          planTierIndex,
        };
      });

      // STRICT SORTING: Plan hierarchy first (Elite>Pro>Basic>Free), then proximity
      // NO ROTATION. NO RANDOMNESS.
      return businessesWithTiers.sort((a, b) => {
        // PRIMARY: Plan tier (Elite=0, Pro=1, Basic=2, Free=3)
        if (a.planTierIndex !== b.planTierIndex) {
          return a.planTierIndex - b.planTierIndex;
        }
        
        // SECONDARY: Geographic proximity (within same plan tier)
        const distanceA = getCityDistance(userCity, a.city);
        const distanceB = getCityDistance(userCity, b.city);
        return distanceA - distanceB;
      }) as Business[];
    },
    enabled: open,
    staleTime: 60000
  });

  const filteredBusinesses = businesses?.filter(business => 
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.category?.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase())) ||
    business.city.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleBusinessClick = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Business List */}
        <ScrollArea className="h-[50vh] px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>{t.noResults}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBusinesses.map((business, index) => (
                <motion.div
                  key={business.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Link
                    to={`/business/${business.id}`}
                    onClick={handleBusinessClick}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
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

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                        {business.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {business.city}
                        {business.description && ` • ${business.description.substring(0, 50)}...`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                      {business.category?.slice(0, 2).map((cat, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AllBusinessesDialog;
