import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ScrollProgress from "@/components/ui/scroll-progress";
import FAQSection from "@/components/home/FAQSection";
import WaitlistSignup from "@/components/home/WaitlistSignup";
import UpcomingEventsPreview from "@/components/home/UpcomingEventsPreview";
import { supabase } from "@/integrations/supabase/client";
import PartnerLogoMarquee from "@/components/home/PartnerLogoMarquee";
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
    <div className="min-h-screen bg-[#0D3B66]">
      <ScrollProgress />
      <Navbar />
      <HeroSection language={language} />
      <FeaturesSection language={language} />
      <UpcomingEventsPreview language={language} />
      <WaitlistSignup language={language} />
      <FAQSection language={language} />
      <Footer />
    </div>
  );
};

export default Index;
