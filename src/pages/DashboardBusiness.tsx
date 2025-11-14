import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Clock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardBusiness = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("verified")
        .eq("user_id", user.id)
        .single();

      setVerified(business?.verified ?? false);
    } catch (error) {
      console.error("Error checking verification:", error);
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

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
      </div>

      <div className="max-w-2xl w-full relative z-10">
        <div className="bg-white rounded-3xl shadow-elegant p-8 md:p-12 text-center">
          {verified ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              
              <h1 className="font-cinzel text-4xl font-bold text-midnight mb-4">
                Συγχαρητήρια!
              </h1>
              
              <p className="font-inter text-lg text-muted-foreground mb-6">
                Η επιχείρησή σας εγκρίθηκε και είναι πλέον ενεργή στο ΦΟΜΟ.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                <p className="font-inter text-sm text-muted-foreground">
                  Μπορείτε τώρα να δημοσιεύετε εκδηλώσεις, προσφορές και posts 
                  για να προσεγγίσετε νέο κοινό σε όλη την Κύπρο.
                </p>
              </div>

              <Button
                variant="gradient"
                size="lg"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Επιστροφή στην Αρχική
              </Button>
            </>
          ) : (
            <>
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
                  Θα λάβετε email επιβεβαίωσης σύντομα. Η ομάδα του ΦΟΜΟ θα επικοινωνήσει μαζί σας 
                  για να ολοκληρώσει τη διαδικασία επαλήθευσης. Μόλις εγκριθεί η καταχώρησή σας, 
                  θα μπορείτε να ανεβάζετε εκδηλώσεις και να προβάλλεστε στο κοινό.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="font-inter text-sm text-amber-900 text-left">
                  Η επιχείρησή σας εκκρεμεί επαλήθευση. Όλες οι λειτουργίες (δημιουργία εκδηλώσεων, 
                  posts και προσφορών) θα ενεργοποιηθούν μετά την έγκριση.
                </p>
              </div>

              <Button
                variant="gradient"
                size="lg"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Επιστροφή στην Αρχική
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardBusiness;
