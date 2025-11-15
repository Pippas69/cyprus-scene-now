import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const Index = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"el" | "en">("el");
  const text = {
    el: {
      tagline: "Φόβος of Missing Out",
      heroMain: "Επιλογές υπάρχουν, Απλά εν τες Ξέρεις",
      heroSubtitle: "Βρες που αξίζει να είσαι.",
      description: "Πλατφόρμα ζωντανής κοινωνικής ανακάλυψης — δείτε πού πηγαίνουν οι άνθρωποι, συμμετάσχετε σε trending εκδηλώσεις και αποκτήστε αποκλειστικές εκπτώσεις QR από συνεργαζόμενες επιχειρήσεις σε όλη την Κύπρο.",
      exploreBtn: "Εξερευνήστε Εκδηλώσεις",
      joinBtn: "Εγγραφή στο ΦΟΜΟ"
    },
    en: {
      tagline: "Fear of Missing Out",
      heroMain: "Discover what's happening",
      heroSubtitle: "Right now, across Cyprus.",
      description: "Live social discovery platform — see where people are going, join trending events, and get exclusive QR discounts from partner businesses across Cyprus.",
      exploreBtn: "Explore Events",
      joinBtn: "Join ΦΟΜΟ"
    }
  };
  const t = text[language];
  return <div className="min-h-screen">
      {/* Navbar */}
      <Navbar language={language} onLanguageToggle={setLanguage} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated gradient background with shimmer */}
        <div className="absolute inset-0 gradient-hero animate-shimmer" />
        
        {/* Sun glow effect */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl pointer-events-none">
          <div className="w-full h-full rounded-full" style={{
          background: 'var(--gradient-glow)'
        }} />
        </div>

        {/* Wave decoration at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
          <svg className="absolute bottom-0 w-full h-full animate-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" fill="none">
            <path d="M0,64 C240,32 480,96 720,64 C960,32 1200,96 1440,64 L1440,120 L0,120 Z" fill="white" opacity="0.3" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Logo */}
            <div className="animate-fade-up">
              <h1 className="font-cinzel text-5xl md:text-7xl font-black text-white mb-3 tracking-tight drop-shadow-[0_0_30px_rgba(13,59,102,0.5)]">
                ΦΟΜΟ
              </h1>
              <p className="font-poppins text-xl md:text-2xl text-white/90 font-medium tracking-wide">
                {t.tagline}
              </p>
            </div>

            {/* Main Heading with Gradient Underline */}
            <div className="animate-fade-up-delay-1 space-y-4">
              <h2 className="font-poppins text-4xl font-bold text-white leading-tight md:text-5xl">
                {t.heroMain}
              </h2>
              <div className="relative inline-block">
                <h3 className="font-poppins text-3xl md:text-5xl font-semibold text-seafoam">
                  {t.heroSubtitle}
                </h3>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-seafoam rounded-full shadow-glow" />
              </div>
            </div>

            {/* Description */}
            <p className="animate-fade-up-delay-2 font-inter text-lg md:text-xl text-white max-w-3xl mx-auto leading-relaxed">
              {t.description}
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button 
                variant="gradient" 
                size="lg" 
                className="text-lg px-10 py-7 min-w-[240px] shadow-glow hover:shadow-sun transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/signup")}
              >
                {t.joinBtn}
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-seafoam/20 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: "1s"
      }} />
      </section>

      {/* Footer */}
      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>;
};
export default Index;