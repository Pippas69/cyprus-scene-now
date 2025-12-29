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
import ScrollProgress from "@/components/ui/scroll-progress";
import WaveDivider from "@/components/ui/wave-divider";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FAQSection from "@/components/home/FAQSection";
import NewsletterSection from "@/components/home/NewsletterSection";
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
      <PartnerLogoMarquee language={language} />
      <WaveDivider variant="aegean" />
      <MarqueeSection />
      <WaveDivider variant="seafoam" flip />
      <ParallaxSection intensity={0.2}>
        <FeaturesSection language={language} />
      </ParallaxSection>
      <WaveDivider variant="aegean" />
      <ParallaxSection intensity={0.15} fadeOnScroll>
        <HowItWorksSection language={language} />
      </ParallaxSection>
      <WaveDivider variant="aegean" flip />
      <UpcomingEventsPreview language={language} />
      <WaveDivider variant="seafoam" />
      <StatsSection language={language} />
      <WaveDivider variant="seafoam" flip />
      <TestimonialsSection language={language} />
      <WaveDivider variant="aegean" />
      <NewsletterSection language={language} />
      <WaveDivider variant="sand" flip />
      <FAQSection language={language} />
      <Footer />
    </div>
  );
};

export default Index;
