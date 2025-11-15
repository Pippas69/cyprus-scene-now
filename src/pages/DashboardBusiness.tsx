import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Clock, Plus, Calendar, Ticket, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCreationForm from "@/components/business/EventCreationForm";
import OfferCreationForm from "@/components/business/OfferCreationForm";
import EventsList from "@/components/business/EventsList";
import OffersList from "@/components/business/OffersList";
import BusinessProfileForm from "@/components/business/BusinessProfileForm";

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

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
        .select("id, verified, name")
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
    <div className="min-h-screen bg-gradient-warm">
      <header className="bg-card/80 backdrop-blur-lg border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-ocean bg-clip-text text-transparent">
                {businessName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Επαληθευμένη Επιχείρηση</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="gap-2 cursor-pointer flex items-center text-sm border border-border rounded-md px-4 py-2 hover:bg-accent"
            >
              <Home className="h-4 w-4" />
              Αρχική
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              Εκδηλώσεις
            </TabsTrigger>
            <TabsTrigger value="create-event" className="gap-2">
              <Plus className="h-4 w-4" />
              Νέα Εκδήλωση
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <Ticket className="h-4 w-4" />
              Προσφορές
            </TabsTrigger>
            <TabsTrigger value="create-offer" className="gap-2">
              <Plus className="h-4 w-4" />
              Νέα Προσφορά
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Προφίλ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <EventsList businessId={businessId!} />
          </TabsContent>

          <TabsContent value="create-event">
            <EventCreationForm businessId={businessId!} />
          </TabsContent>

          <TabsContent value="offers">
            <OffersList businessId={businessId!} />
          </TabsContent>

          <TabsContent value="create-offer">
            <OfferCreationForm businessId={businessId!} />
          </TabsContent>

          <TabsContent value="profile">
            <BusinessProfileForm businessId={businessId!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardBusiness;
