import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Clock, Plus, Calendar, Ticket, User, Users as UsersIcon, TrendingUp, MapPin, TrendingUp as FeedIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [businessCoverUrl, setBusinessCoverUrl] = useState<string | null>(null);

  const translations = {
    el: {
      businessDashboard: "Διαχείριση Επιχείρησης",
      feed: "Feed",
      map: "Χάρτης",
      events: "Εκδηλώσεις",
      createEvent: "Δημιουργία Εκδήλωσης",
      offers: "Προσφορές",
      createOffer: "Δημιουργία Προσφοράς",
      profile: "Προφίλ",
      reservations: "Κρατήσεις",
      analytics: "Αναλυτικά",
    },
    en: {
      businessDashboard: "Business Management",
      feed: "Feed",
      map: "Map",
      events: "Events",
      createEvent: "Create Event",
      offers: "Offers",
      createOffer: "Create Offer",
      profile: "Profile",
      reservations: "Reservations",
      analytics: "Analytics",
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
      toast.error("Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-muted-foreground">Φόρτωση...</div>
      </div>
    );
  }

  // If not verified, show pending status
  if (!verified) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
            <div className="w-full h-full rounded-full bg-gradient-glow" />
          </div>
        </div>

        <div className="max-w-2xl w-full relative z-10">
          <div className="bg-white rounded-3xl shadow-elegant p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="h-12 w-12 text-yellow-600" />
            </div>
            
            <h1 className="font-cinzel text-4xl font-bold text-midnight mb-4">
              Ευχαριστούμε!
            </h1>
            
            <p className="font-inter text-lg text-muted-foreground mb-6">
              Η εγγραφή σας εκκρεμεί προς επαλήθευση.
            </p>
            
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-6">
              <p className="font-inter text-sm text-muted-foreground mb-4">
                Η ομάδα μας θα επαληθεύσει την επιχείρησή σας σύντομα. 
                Θα λάβετε email όταν ολοκληρωθεί η διαδικασία.
              </p>
              <p className="font-inter text-xs text-muted-foreground">
                Μετά την έγκριση θα μπορείτε να δημοσιεύετε εκδηλώσεις και προσφορές.
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="gap-2 cursor-pointer mx-auto flex items-center text-primary hover:underline"
            >
              <Home className="h-4 w-4" />
              Επιστροφή στην Αρχική
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If verified, show dashboard
  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden border-b sticky top-0 z-10">
        {/* Cover Image or Gradient Background */}
        {businessCoverUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${businessCoverUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-card" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-card" />
        )}
        
        {/* Content */}
        <div className="relative container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-border shadow-sm">
                <AvatarImage src={businessLogoUrl || undefined} alt={`${businessName} logo`} />
                <AvatarFallback className="bg-muted text-lg font-semibold">
                  {businessName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className={`text-3xl font-bold ${businessCoverUrl ? 'text-white' : 'text-foreground'}`}>
                  {businessName}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className={`text-sm ${businessCoverUrl ? 'text-white/90' : 'text-muted-foreground'}`}>
                    {language === "el" ? "Επαληθευμένη Επιχείρηση" : "Verified Business"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={() => navigate("/")}
                className="gap-2 cursor-pointer flex items-center text-sm bg-secondary text-secondary-foreground rounded-lg px-4 py-2 hover:bg-secondary/80 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">{language === "el" ? "Αρχική" : "Home"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="w-full justify-start mb-8 h-auto flex-wrap gap-2 bg-muted/50 p-2">
            <TabsTrigger value="feed" className="gap-2 data-[state=active]:bg-background">
              <FeedIcon className="h-4 w-4" />
              <span>{t.feed}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2 data-[state=active]:bg-background">
              <MapPin className="h-4 w-4" />
              <span>{t.map}</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2 data-[state=active]:bg-background">
              <Calendar className="h-4 w-4" />
              <span>{t.events}</span>
            </TabsTrigger>
            <TabsTrigger value="create-event" className="gap-2 data-[state=active]:bg-background">
              <Plus className="h-4 w-4" />
              <span>{t.createEvent}</span>
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2 data-[state=active]:bg-background">
              <Ticket className="h-4 w-4" />
              <span>{t.offers}</span>
            </TabsTrigger>
            <TabsTrigger value="create-offer" className="gap-2 data-[state=active]:bg-background">
              <Plus className="h-4 w-4" />
              <span>{t.createOffer}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-background">
              <User className="h-4 w-4" />
              <span>{t.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-2 data-[state=active]:bg-background">
              <UsersIcon className="h-4 w-4" />
              <span>{t.reservations}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
              <TrendingUp className="h-4 w-4" />
              <span>{t.analytics}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-0">
            <Feed />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Xartis />
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <EventsList businessId={businessId!} />
          </TabsContent>

          <TabsContent value="create-event" className="mt-0">
            <EventCreationForm businessId={businessId!} />
          </TabsContent>

          <TabsContent value="offers" className="mt-0">
            <OffersList businessId={businessId!} />
          </TabsContent>

          <TabsContent value="create-offer" className="mt-0">
            <OfferCreationForm businessId={businessId!} />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <BusinessProfileForm businessId={businessId!} />
          </TabsContent>

          <TabsContent value="reservations" className="mt-0">
            <ReservationManagement businessId={businessId!} language="el" />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <EventAnalytics businessId={businessId!} language="el" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardBusiness;
