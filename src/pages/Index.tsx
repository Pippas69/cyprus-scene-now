import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ScrollProgress from "@/components/ui/scroll-progress";
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
      <ScrollProgress />
      <Navbar />
      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=80')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95" />
        <HeroSection language={language} />
        <PartnerLogoMarquee />
      </div>
      <FeaturesSection language={language} />
      <UpcomingEventsPreview language={language} />
      <FAQSection language={language} />
      <Footer />
    </div>
  );
};

export default Index;
