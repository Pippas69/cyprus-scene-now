import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, BadgeCheck, ChevronRight, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import type { ActiveProfileBoost } from "@/hooks/useActiveProfileBoosts";
import { DISPLAY_CAPS } from "@/lib/personalization";

interface BoostedProfilesScrollerProps {
  profiles: ActiveProfileBoost[];
  language: "el" | "en";
  totalCount?: number;
  eventBoostBusinessIds?: Set<string>;
  offerBoostBusinessIds?: Set<string>;
}

const translations = {
  el: {
    featuredBusinesses: "Επιλεγμένες Επιχειρήσεις",
    verified: "Επαληθευμένο",
    seeAll: "Δείτε όλες",
  },
  en: {
    featuredBusinesses: "Featured Businesses",
    verified: "Verified",
    seeAll: "See all",
  },
};

export const BoostedProfilesScroller = ({ 
  profiles, 
  language,
  totalCount,
  eventBoostBusinessIds,
  offerBoostBusinessIds,
}: BoostedProfilesScrollerProps) => {
  const t = translations[language];

  if (!profiles || profiles.length === 0) return null;

  const hasMoreProfiles = totalCount && totalCount > DISPLAY_CAPS.PROFILES;

  return (
    <div className="w-full">
      {/* No header - profiles display directly below paid content */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-1">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/business/${profile.business_id}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 min-w-[100px] group"
              >
                {/* Avatar with premium ring for premium tier */}
                <div className={`relative ${profile.boost_tier === 'premium' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full' : ''}`}>
                  <Avatar className="h-14 w-14">
                    <AvatarImage 
                      src={profile.businesses.logo_url || undefined} 
                      alt={profile.businesses.name} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile.businesses.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <BusinessBoostBadges
                    hasEventBoost={eventBoostBusinessIds?.has(profile.business_id)}
                    hasOfferBoost={offerBoostBusinessIds?.has(profile.business_id)}
                    studentDiscountPercent={(profile.businesses as any)?.student_discount_percent}
                    studentDiscountMode={(profile.businesses as any)?.student_discount_mode}
                    language={language}
                  />
                  {profile.businesses.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                    </div>
                  )}
                </div>

                {/* Premium indicator */}
                {profile.boost_tier === 'premium' && (
                  <div className="absolute top-1 right-1">
                    <Sparkles className="h-3 w-3 text-accent" />
                  </div>
                )}

                {/* Business name */}
                <span className="text-xs font-medium text-center line-clamp-1 max-w-[80px] group-hover:text-primary transition-colors">
                  {profile.businesses.name}
                </span>

                {/* City */}
                <span className="text-[10px] text-muted-foreground">
                  {profile.businesses.city}
                </span>

                {/* Category badge */}
                {profile.businesses.category?.[0] && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {profile.businesses.category[0]}
                  </Badge>
                )}
              </Link>
            </motion.div>
          ))}
          
          {/* View all arrow */}
          <div className="flex items-center justify-center min-w-[40px] text-muted-foreground">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default BoostedProfilesScroller;
