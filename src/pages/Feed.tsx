import { useState, useEffect, useRef } from "react";
import { MapPin, RefreshCw, Filter, ArrowUp, GraduationCap } from "lucide-react";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { motion } from "framer-motion";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import SmartSearchBar from "@/components/feed/SmartSearchBar";
import FeedSidebar from "@/components/feed/FeedSidebar";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import { FilterChips } from "@/components/feed/FilterChips";
import { BoostedProfilesScroller } from "@/components/feed/BoostedProfilesScroller";
import { Badge } from "@/components/ui/badge";
import { FeaturedEventsScroller } from "@/components/feed/FeaturedEventsScroller";
import { FeaturedOffersScroller } from "@/components/feed/FeaturedOffersScroller";
import { BusinessDirectorySection } from "@/components/feed/BusinessDirectorySection";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PullIndicator } from "@/components/ui/pull-indicator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { useActiveProfileBoosts } from "@/hooks/useActiveProfileBoosts";
import { hapticFeedback } from "@/lib/haptics";
import { 
  getPersonalizedScore, 
  getRotationSeed,
  getOfferBoostScore,
  DISPLAY_CAPS,
  type ActiveBoost, 
  type OfferBoost 
} from "@/lib/personalization";
import type { User } from "@supabase/supabase-js";

interface FeedProps {
  showNavbar?: boolean;
}

const Feed = ({ showNavbar = true }: FeedProps = {}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showStudentDiscounts, setShowStudentDiscounts] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const startYRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  
  useScrollMemory();

  const translations = {
    el: {
      title: "Ανακαλύψτε το ΦΟΜΟ",
      subtitle: "Δείτε τι συμβαίνει τώρα στην Κύπρο",
    },
    en: {
      title: "Discover ΦΟΜΟ",
      subtitle: "See what's happening now in Cyprus",
    }
  };
  const t = translations[language];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch personalization data for logged-in users
  const { data: personalizedData } = useQuery({
    queryKey: ['personalized-events', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [profileRes, rsvpsRes, favoritesRes] = await Promise.all([
        supabase.from('profiles').select('city, interests').eq('id', user.id).single(), 
        supabase.from('rsvps').select('event_id, events(category, start_at)').eq('user_id', user.id).limit(50), 
        supabase.from('favorites').select('event_id, events(category)').eq('user_id', user.id)
      ]);
      return {
        profile: profileRes.data,
        rsvps: rsvpsRes.data || [],
        favorites: favoritesRes.data || []
      };
    },
    enabled: !!user
  });

  // Fetch active event boosts
  const { data: activeBoosts } = useQuery({
    queryKey: ['active-boosts'],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('event_boosts')
        .select('event_id, targeting_quality, boost_tier, business_id')
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now);
      
      if (error) {
        console.error('Error fetching active boosts:', error);
        return [];
      }
      return data as (ActiveBoost & { business_id: string })[];
    },
    staleTime: 60000
  });

  // Derive business IDs with active event boosts
  const eventBoostBusinessIds = new Set(activeBoosts?.map(b => b.business_id) || []);

  // Fetch boosted events only (events that have active boosts)
  const { data: boostedEvents } = useQuery({
    queryKey: ['boosted-events', selectedCity, user?.id, activeBoosts?.map(b => b.event_id).join(',')],
    queryFn: async () => {
      if (!activeBoosts || activeBoosts.length === 0) return [];
      
      const boostedEventIds = activeBoosts.map(b => b.event_id);
      
      let query = supabase
        .from('events')
        .select(`*, businesses!inner(name, logo_url, verified, city)`)
        .in('id', boostedEventIds)
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString());
      
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }
      
      // Apply category filter if selected
      if (selectedCategories.length > 0) {
        query = query.overlaps('category', selectedCategories);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Apply personalization scoring
      const rotationSeed = getRotationSeed(user?.id);
      return (data || [])
        .map(event => ({
          ...event,
          boostScore: getPersonalizedScore(
            event, 
            personalizedData?.profile || null, 
            personalizedData?.rsvps || [], 
            personalizedData?.favorites || [],
            activeBoosts,
            rotationSeed
          )
        }))
        .sort((a, b) => b.boostScore - a.boostScore)
        .slice(0, 10);
    },
    enabled: !!activeBoosts,
    staleTime: 60000
  });

  // Fetch boosted offers
  const { data: offerBoosts } = useQuery({
    queryKey: ['active-offer-boosts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_boosts')
        .select('discount_id, targeting_quality, commission_percent, business_id')
        .eq('active', true);
      
      if (error) {
        console.error('Error fetching offer boosts:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000
  });

  // Derive business IDs with active offer boosts
  const offerBoostBusinessIds = new Set(offerBoosts?.map(b => b.business_id) || []);

  const { data: boostedOffers } = useQuery({
    queryKey: ['boosted-offers', selectedCity, offerBoosts?.map(b => b.discount_id).join(',')],
    queryFn: async () => {
      if (!offerBoosts || offerBoosts.length === 0) return [];
      
      const boostedOfferIds = offerBoosts.map(b => b.discount_id);
      const now = new Date().toISOString();
      
      let query = supabase
        .from('discounts')
        .select(`
          id, title, description, percent_off, original_price_cents, 
          start_at, end_at, business_id, terms, max_per_user,
          businesses!inner (name, logo_url, city, verified)
        `)
        .in('id', boostedOfferIds)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now);
      
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Apply personalization scoring
      const rotationSeed = getRotationSeed(user?.id);
      const boosts: OfferBoost[] = offerBoosts.map(b => ({
        discount_id: b.discount_id,
        targeting_quality: b.targeting_quality,
        boost_tier: b.targeting_quality >= 5 ? 'premium' : 'standard'
      }));
      
      return (data || [])
        .map(offer => ({
          ...offer,
          boostScore: getOfferBoostScore(
            offer,
            personalizedData?.profile || null,
            boosts,
            rotationSeed
          )
        }))
        .sort((a, b) => b.boostScore - a.boostScore)
        .slice(0, DISPLAY_CAPS.OFFERS);
    },
    enabled: !!offerBoosts,
    staleTime: 60000
  });

  // Fetch active profile boosts
  const { data: profileBoosts } = useActiveProfileBoosts({
    selectedCity,
    userProfile: personalizedData?.profile || null,
    userId: user?.id || null
  });

  // Fetch businesses with student discounts
  const { data: studentDiscountBusinesses } = useQuery({
    queryKey: ['student-discount-businesses', selectedCity, showStudentDiscounts],
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select('id, name, logo_url, city, category, student_discount_percent, student_discount_mode')
        .eq('verified', true)
        .eq('student_discount_enabled', true)
        .gt('student_discount_percent', 0);
      
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }
      
      const { data, error } = await query.limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: showStudentDiscounts,
    staleTime: 60000
  });

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) startYRef.current = e.touches[0].pageY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const diff = e.touches[0].pageY - startYRef.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff, 100));
      if (diff > 80) {
        setIsPulling(true);
        hapticFeedback.light();
      }
    }
  };
  
  const handleTouchEnd = () => {
    if (isPulling) {
      hapticFeedback.medium();
      queryClient.invalidateQueries({ queryKey: ['boosted-events'] });
      queryClient.invalidateQueries({ queryKey: ['boosted-offers'] });
      queryClient.invalidateQueries({ queryKey: ['active-profile-boosts'] });
    }
    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedCity(null);
  };
  
  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };
  
  const handleRemoveCity = () => {
    setSelectedCity(null);
  };
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className="min-h-screen bg-background flex max-w-full overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Desktop Sidebar */}
      {showNavbar && <FeedSidebar language={language} user={user} />}

      <div className="flex-1 overflow-x-hidden max-w-full">
        <OfflineIndicator />
      
        <div className="md:hidden">
          {pullDistance > 0 && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-background">
              <PullIndicator progress={pullDistance} isRefreshing={isPulling} />
            </div>
          )}
        </div>
      
        {/* Mobile header when inside UserLayout */}
        {!showNavbar && (
          <div className="sticky top-0 z-40 bg-background border-b shadow-sm overflow-hidden">
            <div className="px-3 py-3 space-y-3 max-w-full">
              <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
              </div>
              <HierarchicalCategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
              {(selectedCategories.length > 0 || selectedCity) && (
                <FilterChips
                  categories={selectedCategories}
                  quickFilters={[]}
                  selectedCity={selectedCity}
                  onRemoveCategory={handleRemoveCategory}
                  onRemoveQuickFilter={() => {}}
                  onRemoveCity={handleRemoveCity}
                  onClearAll={handleClearFilters}
                  language={language}
                />
              )}
            </div>
          </div>
        )}

        {showNavbar && (
          <div className="sticky top-0 z-40 bg-background border-b shadow-sm">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 overflow-hidden">
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-bold mb-1 text-foreground">{t.title}</h1>
                  <p className="text-muted-foreground text-sm">{t.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
                  <HierarchicalCategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
                  <Badge
                    variant={showStudentDiscounts ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 font-semibold text-sm min-h-[40px] px-4 flex items-center gap-2 ${
                      showStudentDiscounts 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
                    }`}
                    onClick={() => setShowStudentDiscounts(!showStudentDiscounts)}
                  >
                    <GraduationCap size={16} />
                    {language === 'el' ? 'Φοιτητική Έκπτωση' : 'Student Discount'}
                  </Badge>
                </div>
                <FilterChips
                  categories={selectedCategories}
                  quickFilters={[]}
                  selectedCity={selectedCity}
                  onRemoveCategory={handleRemoveCategory}
                  onRemoveQuickFilter={() => {}}
                  onRemoveCity={handleRemoveCity}
                  onClearAll={handleClearFilters}
                  language={language}
                />
              </div>
            </div>
          </div>
        )}

        {/* Smart Search Bar */}
        {showNavbar && (
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 -mt-4 mb-6 relative z-30">
            <SmartSearchBar
              language={language}
              onSearch={() => {}}
              className="max-w-4xl mx-auto"
            />
          </div>
        )}

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-hidden">
          <div className="space-y-8">
            {/* Student Discount Businesses Section */}
            {showStudentDiscounts && studentDiscountBusinesses && studentDiscountBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    {language === 'el' ? 'Επιχειρήσεις με Φοιτητική Έκπτωση' : 'Businesses with Student Discounts'}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {studentDiscountBusinesses.map((business) => (
                    <a
                      key={business.id}
                      href={`/business/${business.id}`}
                      className="block bg-card rounded-xl p-4 border hover:shadow-lg transition-all hover:scale-[1.02]"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        {business.logo_url ? (
                          <img 
                            src={business.logo_url} 
                            alt={business.name} 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                              {business.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                            {business.name}
                          </h3>
                          <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            🎓 {business.student_discount_percent}% {language === 'el' ? 'έκπτωση' : 'off'}
                          </Badge>
                          {business.student_discount_mode === 'once' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'el' ? 'Πρώτη επίσκεψη' : 'First visit only'}
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {showStudentDiscounts && (!studentDiscountBusinesses || studentDiscountBusinesses.length === 0) && (
              <div className="text-center py-12 bg-card rounded-xl border">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === 'el' 
                    ? 'Δεν βρέθηκαν επιχειρήσεις με φοιτητική έκπτωση στην περιοχή σου' 
                    : 'No businesses with student discounts found in your area'}
                </p>
              </div>
            )}

            {/* Featured Events Scroller */}
            {!showStudentDiscounts && boostedEvents && boostedEvents.length > 0 && (
              <FeaturedEventsScroller 
                events={boostedEvents} 
                language={language} 
              />
            )}

            {/* Featured Offers Scroller */}
            {!showStudentDiscounts && boostedOffers && boostedOffers.length > 0 && (
              <FeaturedOffersScroller 
                offers={boostedOffers} 
                language={language} 
              />
            )}

            {/* Boosted Profiles Scroller - Featured Businesses */}
            {!showStudentDiscounts && profileBoosts && profileBoosts.length > 0 && (
              <BoostedProfilesScroller 
                profiles={profileBoosts} 
                language={language}
                eventBoostBusinessIds={eventBoostBusinessIds}
                offerBoostBusinessIds={offerBoostBusinessIds}
              />
            )}

            {/* All Businesses Directory */}
            {!showStudentDiscounts && (
              <BusinessDirectorySection 
                language={language} 
                selectedCity={selectedCity}
              />
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        {showScrollTop && (
          <FloatingActionButton
            icon={<ArrowUp size={24} />}
            onClick={scrollToTop}
            actions={[
              {
                icon: <Filter size={20} />,
                label: language === 'el' ? 'Φίλτρα' : 'Filters',
                onClick: () => {
                  const filtersEl = document.querySelector('[data-filters]');
                  filtersEl?.scrollIntoView({ behavior: 'smooth' });
                }
              },
            ]}
            position="bottom-right"
            size="large"
            variant="primary"
            pulse={false}
          />
        )}
      </div>
    </div>
  );
};

export default Feed;
