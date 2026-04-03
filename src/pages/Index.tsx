import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Footer from "@/components/Footer";
import InfoNavbar from "@/components/info/InfoNavbar";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FAQSection from "@/components/home/FAQSection";
import UpcomingEventsPreview from "@/components/home/UpcomingEventsPreview";
import { supabase } from "@/integrations/supabase/client";
import PartnerLogoMarquee from "@/components/home/PartnerLogoMarquee";
import { useLanguage } from "@/hooks/useLanguage";

const Index = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLandingReady, setIsLandingReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndRedirect = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (!isMounted) return;

          if (profile?.role === "business") {
            navigate("/dashboard-business", { replace: true });
          } else {
            navigate("/feed", { replace: true });
          }
          return;
        }

        setIsLandingReady(true);
      } catch {
        if (isMounted) setIsLandingReady(true);
      }
    };

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!isLandingReady) return null;

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />
      <HeroSection language={language} />
      <PartnerLogoMarquee />
      <FeaturesSection language={language} />
      <UpcomingEventsPreview language={language} />
      <FAQSection language={language} />
      <Footer />
    </div>
  );
};

export default Index;
