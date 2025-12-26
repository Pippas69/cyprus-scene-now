import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import MarqueeSection from "@/components/home/MarqueeSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import StatsSection from "@/components/home/StatsSection";
import PartnerLogoMarquee from "@/components/home/PartnerLogoMarquee";
import ParallaxSection from "@/components/ui/parallax-section";
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
      <Navbar />
      <HeroSection language={language} />
      <PartnerLogoMarquee language={language} />
      <MarqueeSection />
      <ParallaxSection intensity={0.2}>
        <FeaturesSection language={language} />
      </ParallaxSection>
      <ParallaxSection intensity={0.15} fadeOnScroll>
        <HowItWorksSection language={language} />
      </ParallaxSection>
      <StatsSection language={language} />
      <Footer />
    </div>
  );
};

export default Index;
