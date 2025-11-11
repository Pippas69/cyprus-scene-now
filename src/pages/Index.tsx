import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Index = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"el" | "en">("el");

  const text = {
    el: {
      tagline: "Fear Of Missing Out",
      heroMain: "Ανακαλύψτε τι συμβαίνει",
      heroAccent: "τώρα στην Κύπρο",
      description:
        "Πλατφόρμα ζωντανής κοινωνικής ανακάλυψης — δείτε πού πηγαίνουν οι άνθρωποι, συμμετάσχετε σε trending εκδηλώσεις και αποκτήστε αποκλειστικές εκπτώσεις QR από συνεργαζόμενες επιχειρήσεις σε όλη την Κύπρο.",
      exploreBtn: "Εξερευνήστε Εκδηλώσεις",
      joinBtn: "Εγγραφή στο ΦΟΜΟ",
    },
    en: {
      tagline: "Fear Of Missing Out",
      heroMain: "Discover what's happening",
      heroAccent: "right now in Cyprus",
      description:
        "Live social discovery platform — see where people are going, join trending events, and get exclusive QR discounts from partner businesses across Cyprus.",
      exploreBtn: "Explore Events",
      joinBtn: "Join ΦΟΜΟ",
    },
  };

  const t = text[language];

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <Navbar language={language} onLanguageToggle={setLanguage} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-midnight via-primary to-deep-navy opacity-90" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Logo */}
            <div className="animate-fade-up">
              <h1 className="font-urbanist text-7xl md:text-9xl font-black text-white mb-3 tracking-tight">
                ΦΟΜΟ
              </h1>
              <p className="font-poppins text-xl md:text-2xl text-white/70 font-medium tracking-wide">
                {t.tagline}
              </p>
            </div>

            {/* Main Heading with Gradient Underline */}
            <div className="animate-fade-up-delay-1 space-y-3">
              <h2 className="font-poppins text-4xl md:text-6xl font-bold text-white leading-tight">
                {t.heroMain}
                <br />
                <span className="relative inline-block">
                  <span className="gradient-brand bg-clip-text text-transparent">
                    {t.heroAccent}
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 gradient-brand rounded-full" />
                </span>
              </h2>
            </div>

            {/* Description */}
            <p className="animate-fade-up-delay-2 font-inter text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              {t.description}
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button
                variant="gradient"
                size="lg"
                onClick={() => navigate("/feed")}
                className="text-lg px-10 py-7 min-w-[240px]"
              >
                {t.exploreBtn}
              </Button>
              <Button
                variant="premium"
                size="lg"
                className="text-lg px-10 py-7 min-w-[240px]"
              >
                {t.joinBtn}
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-coral/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </section>
    </div>
  );
};

export default Index;
