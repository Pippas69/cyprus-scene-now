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
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import Feed from "@/pages/Feed";
import Xartis from "@/pages/Xartis";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessFAB } from "@/components/business/BusinessFAB";
import { Button } from "@/components/ui/button";

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [businessCoverUrl, setBusinessCoverUrl] = useState<string | null>(null);

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

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Πρέπει να συνδεθείτε πρώτα");
        navigate("/login");
        return;
      }

      setUserId(user.id);

      const { data: business, error } = await supabase
        .from("businesses")
        .select("id, verified, name, logo_url, cover_url")
        .eq("user_id", user.id)
        .maybeSingle();

      // If user doesn't own a business, redirect to feed
      if (!business || error) {
        toast.error("Δεν έχετε δικαίωμα πρόσβασης στο business dashboard");
        navigate("/feed");
        return;
      }

      setVerified(business.verified ?? false);
      setBusinessId(business.id);
      setBusinessName(business.name ?? "");
      setBusinessLogoUrl(business.logo_url ?? null);
      setBusinessCoverUrl(business.cover_url ?? null);
    } catch (error) {
      console.error("Error checking verification:", error);
      toast.error("Σφάλμα κατά τον έλεγχο επαλήθευσης");
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
                    <AvatarImage src={businessLogoUrl || undefined} alt={businessName} />
                    <AvatarFallback>{businessName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">{businessName}</h1>
                    <p className="text-xs text-muted-foreground">{t.businessDashboard}</p>
                  </div>
                </div>
              </div>
              <LanguageToggle />
            </div>

          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route index element={<Feed />} />
              <Route path="map" element={<Xartis />} />
              <Route path="analytics" element={businessId ? <EventAnalytics businessId={businessId} language={language} /> : null} />
              <Route path="events" element={businessId ? <EventsList businessId={businessId} /> : null} />
              <Route path="events/new" element={businessId ? <EventCreationForm businessId={businessId} /> : null} />
              <Route path="offers" element={businessId ? <OffersList businessId={businessId} /> : null} />
              <Route path="offers/new" element={businessId ? <OfferCreationForm businessId={businessId} /> : null} />
              <Route path="reservations" element={businessId ? <ReservationManagement businessId={businessId} language={language} /> : null} />
              <Route path="profile" element={businessId ? <BusinessProfileForm businessId={businessId} /> : null} />
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
