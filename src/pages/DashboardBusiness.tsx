import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { BusinessAccountSettings } from "@/components/user/BusinessAccountSettings";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EventCreationForm from "@/components/business/EventCreationForm";
import OfferCreationForm from "@/components/business/OfferCreationForm";
import EventsList from "@/components/business/EventsList";
import OffersList from "@/components/business/OffersList";
import BusinessProfileForm from "@/components/business/BusinessProfileForm";
import { ReservationDashboard } from '@/components/business/reservations';
import { EventAnalytics } from "@/components/business/EventAnalytics";
import { QuickStats } from "@/components/business/QuickStats";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { OnboardingTour } from "@/components/business/OnboardingTour";
import Feed from "@/pages/Feed";
import Xartis from "@/pages/Xartis";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import BoostManagement from "@/components/business/BoostManagement";
import BudgetTracker from "@/components/business/BudgetTracker";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessFAB } from "@/components/business/BusinessFAB";
import { BusinessPostsList } from "@/components/business/posting/BusinessPostsList";
import { BusinessPostForm } from "@/components/business/posting/BusinessPostForm";
import { Button } from "@/components/ui/button";
import { toastTranslations } from "@/translations/toastTranslations";
import { Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { UnifiedQRScanner } from "@/components/business/UnifiedQRScanner";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";

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
    // Handle subscription and boost success/cancel URL parameters
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
      // Activate any pending boosts (fallback for webhook delays)
      supabase.functions.invoke("activate-pending-boost").then(() => {
        toast.success(language === 'el' ? 'Το boost ενεργοποιήθηκε επιτυχώς!' : 'Boost activated successfully!');
      }).catch(() => {
        toast.success(language === 'el' ? 'Το boost ενεργοποιήθηκε επιτυχώς!' : 'Boost activated successfully!');
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (boostStatus === 'canceled') {
      // Clean up pending (unpaid) boost records
      supabase.functions.invoke("cancel-pending-boost").catch(() => {});
      toast.info(language === 'el' ? 'Η πληρωμή boost ακυρώθηκε' : 'Boost payment canceled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [language]);
  
  // Enable real-time notifications
  useRealtimeNotifications(businessId, userId);

  // Onboarding tour
  const { onboardingCompleted, completeOnboarding, isLoading: onboardingLoading } = useOnboardingStatus(businessId);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
          .select("id, verified, name, logo_url, cover_url")
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
      <div className="h-screen w-full flex overflow-hidden">
        <BusinessSidebar />
        
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
              <Route index element={<Feed showNavbar={false} />} />
              <Route path="map" element={<Xartis />} />
              <Route path="analytics" element={businessId ? <AnalyticsDashboard businessId={businessId} /> : null} />
              {/* Posts feature hidden but kept in code
              <Route path="posts" element={businessId ? <BusinessPostsList businessId={businessId} language={language} /> : null} />
              <Route path="posts/new" element={businessId ? <BusinessPostForm businessId={businessId} businessName={businessName} businessCategory={[]} language={language} /> : null} />
              */}
              <Route path="events" element={businessId ? <EventsList businessId={businessId} /> : null} />
              <Route path="events/new" element={businessId ? <EventCreationForm businessId={businessId} /> : null} />
              <Route path="offers" element={businessId ? <OffersList businessId={businessId} /> : null} />
              <Route path="offers/new" element={businessId ? <OfferCreationForm businessId={businessId} /> : null} />
              <Route path="reservations" element={businessId ? <ReservationDashboard businessId={businessId} language={language} /> : null} />
              <Route path="subscription" element={<SubscriptionPlans embedded />} />
              <Route path="boosts" element={businessId ? <BoostManagement businessId={businessId} /> : null} />
              <Route path="settings" element={userId && businessId ? <BusinessAccountSettings userId={userId} businessId={businessId} language={language} /> : null} />
            </Routes>
          </main>

          {/* Floating Action Button */}
          <BusinessFAB />
        </div>
      </div>
      </SidebarProvider>
    </>
  );
};

export default DashboardBusiness;
