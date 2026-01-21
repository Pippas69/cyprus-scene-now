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
        <div className="flex gap-1.5 sm:gap-2 pb-1">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/business/${profile.business_id}`}
                className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 min-w-[80px] sm:min-w-[100px] group"
              >
                {/* Avatar with premium ring for premium tier */}
                <div className={`relative ${profile.boost_tier === 'premium' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full' : ''}`}>
                  <Avatar className="h-10 w-10 sm:h-14 sm:w-14">
                    <AvatarImage 
                      src={profile.businesses.logo_url || undefined} 
                      alt={profile.businesses.name} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {profile.businesses.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Only show event/offer boost badges, NOT student discount */}
                  <BusinessBoostBadges
                    hasEventBoost={eventBoostBusinessIds?.has(profile.business_id)}
                    hasOfferBoost={offerBoostBusinessIds?.has(profile.business_id)}
                    showStudentDiscount={false}
                    language={language}
                  />
                  {profile.businesses.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-background rounded-full p-0.5">
                      <BadgeCheck className="h-3 w-3 sm:h-4 sm:w-4 text-primary fill-primary/20" />
                    </div>
                  )}
                </div>

                {/* Premium indicator */}
                {profile.boost_tier === 'premium' && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-accent" />
                  </div>
                )}

                {/* Business name + City - combined on one line */}
                <span className="text-[10px] sm:text-xs font-medium text-center line-clamp-1 max-w-[70px] sm:max-w-[90px] group-hover:text-primary transition-colors">
                  {profile.businesses.name}
                </span>

                {/* City only - no category */}
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                  {profile.businesses.city}
                </span>
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
