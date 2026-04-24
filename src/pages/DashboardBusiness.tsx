import { useNavigate, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { BusinessAccountSettings } from "@/components/user/BusinessAccountSettings";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EventCreationForm from "@/components/business/EventCreationForm";
import ProductionCreationForm from "@/components/business/productions/ProductionCreationForm";
import OfferCreationForm from "@/components/business/OfferCreationForm";
import EventsList from "@/components/business/EventsList";
import OffersList from "@/components/business/OffersList";
import BusinessProfileForm from "@/components/business/BusinessProfileForm";
import { ReservationDashboard } from '@/components/business/reservations';
import { FloorPlanPage } from '@/components/business/floorplan/FloorPlanPage';
import { EventAnalytics } from "@/components/business/EventAnalytics";
import { QuickStats } from "@/components/business/QuickStats";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useRealtimeEventCheckins } from "@/hooks/useRealtimeEventCheckins";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { OnboardingTour } from "@/components/business/OnboardingTour";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
// CrmDashboard now embedded in AnalyticsDashboard
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import BillingSmsPage from "@/pages/BillingSmsPage";
import BoostManagement from "@/components/business/BoostManagement";
import BudgetTracker from "@/components/business/BudgetTracker";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessFAB } from "@/components/business/BusinessFAB";
import { SidebarMobileClose } from "@/components/SidebarMobileClose";
import { BusinessPostsList } from "@/components/business/posting/BusinessPostsList";
import { BusinessPostForm } from "@/components/business/posting/BusinessPostForm";
import { Button } from "@/components/ui/button";
import { toastTranslations } from "@/translations/toastTranslations";
import { Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { UnifiedQRScanner } from "@/components/business/UnifiedQRScanner";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import { PromotersDashboard } from "@/components/business/promoters/PromotersDashboard";
import { SmsPausedBanner } from "@/components/business/SmsPausedBanner";

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const toastT = toastTranslations[language];
  const scrollRef = useRef<HTMLElement | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [businessCoverUrl, setBusinessCoverUrl] = useState<string | null>(null);
  const [businessCategories, setBusinessCategories] = useState<string[]>([]);
  const [floorPlanEnabled, setFloorPlanEnabled] = useState(false);
  const [promotersEnabled, setPromotersEnabled] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const translations = {
    el: {
      businessDashboard: "Διαχείριση Επιχείρησης",
      pendingVerification: "Εκκρεμεί Επαλήθευση",
      verificationMessage:
        "Η επιχείρησή σας βρίσκεται υπό επαλήθευση. Θα ειδοποιηθείτε όταν ολοκληρωθεί η διαδικασία.",
      contactSupport: "Επικοινωνήστε με την υποστήριξη εάν έχετε ερωτήσεις.",
    },
    en: {
      businessDashboard: "Business Dashboard",
      pendingVerification: "Pending Verification",
      verificationMessage:
        "Your business is currently under verification. You will be notified once the process is complete.",
      contactSupport: "Contact support if you have any questions.",
    },
  };

  const t = translations[language];

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // Listen for instant promoters_enabled toggle from settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
      if (detail && typeof detail.enabled === 'boolean') {
        setPromotersEnabled(detail.enabled);
      }
    };
    window.addEventListener('fomo:promoters-enabled-changed', handler as EventListener);
    return () => window.removeEventListener('fomo:promoters-enabled-changed', handler as EventListener);
  }, []);

  // Prevent double page scrollbars in business dashboard (keep only internal main scroll)
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  // Always jump to top when switching dashboard sections
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof (el as any).scrollTo === 'function') {
      (el as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handlePaymentParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const subscriptionStatus = urlParams.get('subscription');
      const boostStatus = urlParams.get('boost');

      if (subscriptionStatus === 'success') {
        toast.success(language === 'el' ? 'Η συνδρομή ολοκληρώθηκε επιτυχώς!' : 'Subscription successful!');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (subscriptionStatus === 'canceled') {
        toast.info(language === 'el' ? 'Η συνδρομή ακυρώθηκε' : 'Subscription canceled');
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (boostStatus === 'success') {
        let activated = false;
        let lastError: any = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            lastError = new Error('No active session yet');
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }

          const { error } = await supabase.functions.invoke("activate-pending-boost");
          if (!error) {
            activated = true;
            break;
          }

          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 700));
        }

        if (activated) {
          toast.success(language === 'el' ? 'Το boost ενεργοποιήθηκε επιτυχώς!' : 'Boost activated successfully!');
        } else {
          console.error('Boost activation failed after payment:', lastError);
          toast.error(
            language === 'el'
              ? 'Η πληρωμή ολοκληρώθηκε, αλλά η ενεργοποίηση του boost απέτυχε. Προσπαθήστε ξανά.'
              : 'Payment completed, but boost activation failed. Please try again.'
          );
        }

        window.history.replaceState({}, '', window.location.pathname);
      } else if (boostStatus === 'canceled') {
        supabase.functions.invoke("cancel-pending-boost").catch(() => {});
        toast.info(language === 'el' ? 'Η πληρωμή boost ακυρώθηκε' : 'Boost payment canceled');
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    void handlePaymentParams();
  }, [language]);
  
  // Enable real-time notifications
  useRealtimeNotifications(businessId, userId);

  // Live updates: dashboard KPIs refresh instantly on any ticket/reservation/scan change
  useRealtimeEventCheckins(businessId);

  // Onboarding tour
  const { onboardingCompleted, completeOnboarding, isLoading: onboardingLoading } = useOnboardingStatus(businessId);
  const { data: subscriptionData } = useSubscriptionPlan(businessId);
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Prefetch key dashboard data in the background so tabs load instantly
  useEffect(() => {
    if (!businessId) return;

    // Prefetch events list
    queryClient.prefetchQuery({
      queryKey: ['business-events', businessId],
      queryFn: async () => {
        const { data: eventsData, error } = await supabase
          .from('events')
          .select('*')
          .eq('business_id', businessId)
          .order('start_at', { ascending: true });
        if (error) throw error;
        if (!eventsData || eventsData.length === 0) return [];
        
        const eventIds = eventsData.map((e) => e.id);
        const [countsResult, tiersResult, soldResult] = await Promise.all([
          supabase.rpc('get_event_rsvp_counts_bulk', { p_event_ids: eventIds }),
          supabase.from('ticket_tiers').select('id, event_id, quantity_total, active').in('event_id', eventIds).eq('active', true),
          supabase.rpc('get_event_walk_in_ticket_sold_counts', { p_event_ids: eventIds }),
        ]);
        
        const countsMap = new Map();
        countsResult.data?.forEach((c: any) => {
          countsMap.set(c.event_id, { interested_count: Number(c.interested_count) || 0, going_count: Number(c.going_count) || 0 });
        });

        const tiersByEvent = new Map<string, number>();
        tiersResult.data?.forEach((t: any) => {
          tiersByEvent.set(t.event_id, (tiersByEvent.get(t.event_id) || 0) + (t.quantity_total || 0));
        });

        const soldByEvent = new Map<string, number>();
        soldResult.data?.forEach((s: any) => {
          soldByEvent.set(s.event_id, Number(s.sold_count) || 0);
        });

        return eventsData.map((event) => ({
          ...event,
          interested_count: countsMap.get(event.id)?.interested_count || 0,
          going_count: countsMap.get(event.id)?.going_count || 0,
          is_sold_out: (tiersByEvent.get(event.id) || 0) > 0 && (soldByEvent.get(event.id) || 0) >= (tiersByEvent.get(event.id) || 0),
        }));
      },
      staleTime: 3 * 60 * 1000,
    });

    // Prefetch business stats
    queryClient.prefetchQuery({
      queryKey: ['business-stats', businessId],
      staleTime: 3 * 60 * 1000,
    });

    // Prefetch subscription status
    queryClient.prefetchQuery({
      queryKey: ['subscription-status'],
      queryFn: async () => {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch business category data (used by ReservationDashboard)
    queryClient.prefetchQuery({
      queryKey: ['business-category', businessId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('businesses')
          .select('ticket_reservation_linked, category')
          .eq('id', businessId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch reservation dashboard events
    queryClient.prefetchQuery({
      queryKey: ['reservation-dashboard-events', businessId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_at, end_at, event_type, pay_at_door')
          .eq('business_id', businessId)
          .not('event_type', 'in', '("free","free_entry")')
          .is('archived_at', null)
          .order('start_at', { ascending: true });
        if (error) throw error;
        return data || [];
      },
      staleTime: 3 * 60 * 1000,
    });
  }, [businessId, queryClient]);

  // Show onboarding tour for new businesses
  useEffect(() => {
    if (!loading && !onboardingLoading && verified && onboardingCompleted === false) {
      setShowOnboarding(true);
    }
  }, [loading, onboardingLoading, verified, onboardingCompleted]);

  const handleOnboardingComplete = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  };

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(toastT.mustLogin);
        navigate("/login");
        return;
      }

      setUserId(user.id);

      // Fetch business and profile data in parallel
      const [businessResult, profileResult] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, verified, name, logo_url, cover_url, category, floor_plan_enabled, promoters_enabled")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", user.id)
          .single()
      ]);

      // If user doesn't own a business, redirect to feed
      if (!businessResult.data || businessResult.error) {
        toast.error(toastT.businessOnlyAccess);
        navigate("/feed");
        return;
      }

      setVerified(businessResult.data.verified ?? false);
      setBusinessId(businessResult.data.id);
      setBusinessName(businessResult.data.name ?? "");
      setBusinessLogoUrl(businessResult.data.logo_url ?? null);
      setBusinessCoverUrl(businessResult.data.cover_url ?? null);
      setBusinessCategories(businessResult.data.category || []);
      setFloorPlanEnabled(!!businessResult.data.floor_plan_enabled);
      setPromotersEnabled(!!(businessResult.data as any).promoters_enabled);

      // Set user profile data with defensive defaults
      setUserName(profileResult.data?.name || user.email?.split('@')[0] || 'User');
      setUserAvatarUrl(profileResult.data?.avatar_url || null);
    } catch (error) {
      console.warn("Error fetching verification status:", error);
      toast.error(toastT.error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show pending verification screen
  if (!verified) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">{t.businessDashboard}</h1>
            <LanguageToggle />
          </div>

          <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {t.pendingVerification}
              </h2>
              <p className="text-muted-foreground mb-4">{t.verificationMessage}</p>
              <p className="text-sm text-muted-foreground">{t.contactSupport}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for verified businesses
  return (
    <>
      <OnboardingTour 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete}
        language={language}
      />
      <SidebarProvider>
      <SidebarMobileClose />
      <div className="h-screen w-full flex overflow-hidden">
        <BusinessSidebar businessCategories={businessCategories} floorPlanEnabled={floorPlanEnabled} promotersEnabled={promotersEnabled} planSlug={subscriptionData?.plan} />
        
        <div className="flex-1 flex flex-col min-h-0 min-w-0 max-w-full">
          {/* Header - Mobile optimized */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                <SidebarTrigger className="flex-shrink-0" />
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-base">
                      {businessName?.charAt(0)?.toUpperCase() || 'B'}
                    </AvatarFallback>
                    {businessLogoUrl && (
                      <AvatarImage 
                        src={businessLogoUrl} 
                        alt={businessName} 
                      />
                    )}
                  </Avatar>
                  <div className="min-w-0 hidden xs:block">
                    <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{businessName}</h1>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{t.businessDashboard}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Unified QR Scanner - next to business avatar */}
                {businessId && (
                  <UnifiedQRScanner businessId={businessId} language={language} />
                )}
                
                {/* Search - all device sizes */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label={language === 'el' ? 'Αναζήτηση' : 'Search'}>
                      <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="top" className="h-full">
                    <GlobalSearch language={language} fullscreen resultTypes={['business', 'event', 'offer']} />
                  </SheetContent>
                </Sheet>
                
                {/* Language Toggle - all device sizes */}
                <LanguageToggle />
                
                {/* User Profile Dropdown - Unified 3 options: My Account, Notifications, Sign Out */}
                {userId && (
                  <UserAccountDropdown
                    userId={userId}
                    userName={userName}
                    avatarUrl={userAvatarUrl}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Main Content - with proper mobile padding */}
          <main
            ref={(node) => {
              scrollRef.current = node as unknown as HTMLElement | null;
            }}
className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-0 sm:px-2"
            style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
          >
            <Routes>
              <Route index element={
                (() => {
                  const normalizedCats = businessCategories.map(c => c.toLowerCase());
                  const noOffersCats = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];
                  const isDiningBar = !normalizedCats.some(c => noOffersCats.includes(c));
                  const defaultPath = isDiningBar ? '/dashboard-business/reservations' : '/dashboard-business/events';
                  return <Navigate to={defaultPath} replace />;
                })()
              } />
              <Route path="analytics" element={businessId ? <AnalyticsDashboard businessId={businessId} /> : null} />
              <Route path="promoters" element={businessId && promotersEnabled ? <PromotersDashboard businessId={businessId} /> : <Navigate to="/dashboard-business/settings" replace />} />
              {/* Posts feature hidden but kept in code
              <Route path="posts" element={businessId ? <div className="px-3 sm:px-0"><BusinessPostsList businessId={businessId} language={language} /></div> : null} />
              <Route path="posts/new" element={businessId ? <div className="px-3 sm:px-0"><BusinessPostForm businessId={businessId} businessName={businessName} businessCategory={[]} language={language} /></div> : null} />
              */}
              <Route path="events" element={businessId ? <div className="px-3 sm:px-0"><EventsList businessId={businessId} /></div> : null} />
              <Route path="events/new" element={businessId ? (
                <div className="px-3 sm:px-0">
                {['theatre', 'music', 'dance', 'kids'].some(c => businessCategories.map(bc => bc.toLowerCase()).includes(c))
                  ? <ProductionCreationForm businessId={businessId} />
                  : <EventCreationForm businessId={businessId} />}
                </div>
              ) : null} />
              <Route path="offers" element={businessId ? <div className="px-3 sm:px-0"><OffersList businessId={businessId} /></div> : null} />
              <Route path="offers/new" element={businessId ? <div className="px-3 sm:px-0"><OfferCreationForm businessId={businessId} /></div> : null} />
              <Route path="reservations" element={businessId ? <ReservationDashboard businessId={businessId} language={language} /> : null} />
              <Route path="floor-plan" element={businessId ? <div className="px-3 sm:px-0"><FloorPlanPage businessId={businessId} /></div> : null} />
              {/* CRM is now integrated into analytics page - redirect for backwards compatibility */}
              <Route path="crm" element={<Navigate to="/dashboard-business/analytics" replace />} />
              <Route path="subscription" element={<div className="px-3 sm:px-0"><SubscriptionPlans embedded /></div>} />
              <Route path="billing-sms" element={<Navigate to="/dashboard-business/settings" replace />} />
              <Route path="boosts" element={businessId ? <div className="px-3 sm:px-0"><BoostManagement businessId={businessId} /></div> : null} />
              <Route path="settings" element={userId && businessId ? <div className="px-3 sm:px-0"><BusinessAccountSettings userId={userId} businessId={businessId} language={language} /></div> : null} />
            </Routes>
          </main>

          {/* Floating Action Button */}
          <BusinessFAB businessCategories={businessCategories} />
        </div>
      </div>
      </SidebarProvider>
    </>
  );
};

export default DashboardBusiness;
