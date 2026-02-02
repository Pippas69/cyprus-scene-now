import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import MarqueeSection from "@/components/home/MarqueeSection";
import FeaturesSection from "@/components/home/FeaturesSection";
// ValueSection and HowItWorksSection removed per user request
// Temporarily hidden for launch - uncomment when ready
// import StatsSection from "@/components/home/StatsSection";
// import PartnerLogoMarquee from "@/components/home/PartnerLogoMarquee";
import ParallaxSection from "@/components/ui/parallax-section";
import ScrollProgress from "@/components/ui/scroll-progress";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FAQSection from "@/components/home/FAQSection";
// Temporarily hidden for launch - uncomment when ready
// import NewsletterSection from "@/components/home/NewsletterSection";
import WaitlistSignup from "@/components/home/WaitlistSignup";
import UpcomingEventsPreview from "@/components/home/UpcomingEventsPreview";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

const Index = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.role === "business") {
          navigate("/dashboard-business");
        } else {
          navigate("/feed");
        }
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navbar />
      <HeroSection language={language} />
      {/* Temporarily hidden for launch - uncomment when ready
      <PartnerLogoMarquee language={language} />
      */}
      {/* Removed wave dividers for cleaner premium look */}
      <MarqueeSection />
      <FeaturesSection language={language} />
      <UpcomingEventsPreview language={language} />
      {/* Temporarily hidden for launch - uncomment when ready
      <StatsSection language={language} />
      */}
      <TestimonialsSection language={language} />
      {/* Three connected sections with seamless gradients */}
      <div className="relative">
        <WaitlistSignup language={language} />
        {/* Gradient transition before FAQ */}
        <div className="h-24 sm:h-32 md:h-40 bg-gradient-to-b from-white via-seafoam/30 to-seafoam/60" />
        <FAQSection language={language} />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
