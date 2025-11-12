import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Loader2 } from "lucide-react";

const Ekdiloseis = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fadeUnlock, setFadeUnlock] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFadeUnlock(true);
        setTimeout(() => {
          setUser(user);
          setLoading(false);
        }, 800);
      } else {
        setUser(null);
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const text = {
    el: {
      title: "Ανακαλύψτε Εκδηλώσεις",
      subtitle: "Η καρδιά της κοινωνικής ζωής στην Κύπρο",
      loginRequired: "Συνδεθείτε ή εγγραφείτε για να δείτε όλες τις εκδηλώσεις!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και μην χάσετε τίποτα στην Κύπρο.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
    },
    en: {
      title: "Discover Events",
      subtitle: "The heart of social life in Cyprus",
      loginRequired: "Log in or sign up to see all events!",
      loginSubtitle: "Join the ΦΟΜΟ community and don't miss anything in Cyprus.",
      joinButton: "Join ΦΟΜΟ",
    },
  };

  const t = text[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar language={language} onLanguageToggle={setLanguage} />
      
      {/* Hero Section */}
      <div className="relative pt-24 pb-16 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/50 to-primary opacity-90" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 blur-3xl">
          <div className="w-full h-full rounded-full bg-accent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center text-primary-foreground"
          >
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {t.title}
            </h1>
            <p className="font-inter text-lg md:text-xl lg:text-2xl opacity-90">
              {t.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Fade out limited view */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: fadeUnlock ? 0 : 1 }}
          transition={{ duration: 1.2 }}
          className={fadeUnlock ? "pointer-events-none" : ""}
        >
          {!user && <LimitedExploreView language={language} navigate={navigate} t={t} />}
        </motion.div>

        {/* Fade in full view */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeUnlock && user ? 1 : 0 }}
          transition={{ duration: 1.2 }}
        >
          {user && <FullExploreView language={language} />}
        </motion.div>
      </div>

      <Footer language={language} onLanguageToggle={setLanguage} />
    </div>
  );
};

// Limited View for Visitors
const LimitedExploreView = ({ language, navigate, t }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative"
    >
      {/* Preview Events with Blur */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden shadow-card"
          >
            <div className="absolute inset-0 bg-card/60 backdrop-blur-md z-10" />
            <div className="pointer-events-none">
              <EventCard language={language} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Signup CTA Overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative backdrop-blur-sm bg-card/90 rounded-3xl shadow-premium p-8 md:p-12 border border-primary/10"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary font-cinzel mb-3">
            {t.loginRequired}
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-md mb-8">
            {t.loginSubtitle}
          </p>

          <motion.button
            onClick={() => navigate("/signup?redirect=/ekdiloseis")}
            className="bg-gradient-brand text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-card hover:shadow-hover font-semibold text-base md:text-lg transition-all"
            whileHover={{ scale: 1.05 }}
            animate={{ 
              opacity: [0.85, 1, 0.85]
            }}
            transition={{
              opacity: {
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut"
              }
            }}
          >
            {t.joinButton}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Full View for Logged-in Users
const FullExploreView = ({ language }: { language: "el" | "en" }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const text = {
    el: {
      allEvents: "Όλες οι Εκδηλώσεις",
    },
    en: {
      allEvents: "All Events",
    },
  };

  const t = text[language];

  // Mock events data - replace with actual Supabase query
  const mockEvents = Array(9).fill(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Filters */}
      <div className="mb-8">
        <CategoryFilter
          language={language}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
        />
      </div>

      {/* Events Grid */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground font-cinzel">
          {t.allEvents}
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            whileHover={{ scale: 1.03, y: -4 }}
            className="rounded-2xl shadow-card hover:shadow-hover transition-all bg-card"
          >
            <EventCard language={language} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Ekdiloseis;
