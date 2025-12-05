import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import MarqueeSection from "@/components/home/MarqueeSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import StatsSection from "@/components/home/StatsSection";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"el" | "en">("el");

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
      <Navbar language={language} onLanguageToggle={setLanguage} />
      <HeroSection language={language} />
      <MarqueeSection />
      <FeaturesSection language={language} />
      <HowItWorksSection language={language} />
      <StatsSection language={language} />
      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

export default Index;
