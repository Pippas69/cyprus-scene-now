import { useNavigate, Routes, Route } from "react-router-dom";
import { BusinessAccountSettings } from "@/components/user/BusinessAccountSettings";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EventCreationForm from "@/components/business/EventCreationForm";
import OfferCreationForm from "@/components/business/OfferCreationForm";
import EventsList from "@/components/business/EventsList";
import OffersList from "@/components/business/OffersList";
import BusinessProfileForm from "@/components/business/BusinessProfileForm";
import { ReservationManagement } from "@/components/business/ReservationManagement";
import { EventAnalytics } from "@/components/business/EventAnalytics";
import { QRScanAnalytics } from "@/components/business/QRScanAnalytics";
import { QuickStats } from "@/components/business/QuickStats";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import Feed from "@/pages/Feed";
import Xartis from "@/pages/Xartis";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import BoostManagement from "@/components/business/BoostManagement";
import BudgetTracker from "@/components/business/BudgetTracker";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessFAB } from "@/components/business/BusinessFAB";
import { Button } from "@/components/ui/button";
import { toastTranslations } from "@/translations/toastTranslations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const toastT = toastTranslations[language];
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
      myProfile: "Το Προφίλ μου",
      settings: "Ρυθμίσεις",
      signOut: "Αποσύνδεση",
    },
    en: {
      businessDashboard: "Business Dashboard",
      pendingVerification: "Pending Verification",
      verificationMessage:
        "Your business is currently under verification. You will be notified once the process is complete.",
      contactSupport: "Contact support if you have any questions.",
      myProfile: "My Profile",
      settings: "Settings",
      signOut: "Sign Out",
    },
  };

  const t = translations[language];

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    // Handle subscription success/cancel URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      toast.success('Subscription successful!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (subscriptionStatus === 'canceled') {
      toast.info('Subscription canceled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // Enable real-time notifications
  useRealtimeNotifications(businessId, userId);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
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
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <BusinessSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {businessName?.charAt(0)?.toUpperCase() || 'B'}
                    </AvatarFallback>
                    {businessLogoUrl && (
                      <AvatarImage 
                        src={businessLogoUrl} 
                        alt={businessName} 
                      />
                    )}
                  </Avatar>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">{businessName}</h1>
                    <p className="text-xs text-muted-foreground">{t.businessDashboard}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LanguageToggle />
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                        {userAvatarUrl && (
                          <AvatarImage 
                            src={userAvatarUrl} 
                            alt={userName} 
                          />
                        )}
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/dashboard-user')}>
                      <User className="mr-2 h-4 w-4" />
                      {t.myProfile}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard-business/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t.settings}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route index element={<Feed showNavbar={false} />} />
              <Route path="map" element={<Xartis />} />
              <Route path="analytics" element={businessId ? <AnalyticsDashboard businessId={businessId} /> : null} />
              <Route path="qr-analytics" element={businessId ? <QRScanAnalytics businessId={businessId} language={language} /> : null} />
              <Route path="events" element={businessId ? <EventsList businessId={businessId} /> : null} />
              <Route path="events/new" element={businessId ? <EventCreationForm businessId={businessId} /> : null} />
              <Route path="offers" element={businessId ? <OffersList businessId={businessId} /> : null} />
              <Route path="offers/new" element={businessId ? <OfferCreationForm businessId={businessId} /> : null} />
              <Route path="reservations" element={businessId ? <ReservationManagement businessId={businessId} language={language} /> : null} />
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
  );
};

export default DashboardBusiness;
