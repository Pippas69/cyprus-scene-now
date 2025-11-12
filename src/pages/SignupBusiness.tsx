import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const SignupBusiness = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
          <div className="w-full h-full rounded-full bg-gradient-glow" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/signup")}
          className="text-white hover:text-seafoam mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Επιστροφή
        </Button>

        <div className="bg-white rounded-3xl shadow-elegant p-8 md:p-12 text-center">
          <h1 className="font-cinzel text-4xl font-bold text-midnight mb-4">
            Εγγραφή Επιχείρησης
          </h1>
          <p className="font-inter text-lg text-muted-foreground mb-8">
            Η φόρμα εγγραφής επιχειρήσεων θα είναι διαθέσιμη σύντομα.
          </p>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate("/signup")}
          >
            Επιστροφή στην Εγγραφή Χρήστη
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignupBusiness;
