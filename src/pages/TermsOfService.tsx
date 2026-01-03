import { useEffect } from "react";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

const TermsOfService = () => {
  const { language } = useLanguage();

  // Load Termly embed script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.termly.io/embed-policy.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            {language === "el" ? "Όροι Χρήσης" : "Terms of Service"}
          </h1>
          
          {/* Termly Terms of Service Embed */}
          {/* Replace YOUR_TERMLY_TERMS_ID with your actual Termly document ID */}
          <div
            data-id="YOUR_TERMLY_TERMS_ID"
            data-type="iframe"
            className="termly-embed min-h-[600px] bg-card rounded-xl p-4"
          />
          
          {/* Fallback content while Termly loads or if not configured */}
          <noscript>
            <div className="bg-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">
                {language === "el"
                  ? "Ενεργοποιήστε το JavaScript για να δείτε τους Όρους Χρήσης."
                  : "Please enable JavaScript to view the Terms of Service."}
              </p>
            </div>
          </noscript>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
