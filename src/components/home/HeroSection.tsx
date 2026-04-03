import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Newspaper, MapPin, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import LanguageToggle from "@/components/LanguageToggle";
import heroPhoneLoop from "@/assets/hero-phone-loop.mp4";
import type { User } from "@supabase/supabase-js";

interface HeroSectionProps {
  language: "el" | "en";
}

const featureItems = [
  {
    icon: Calendar,
    labelEl: "Events",
    labelEn: "Events",
    path: "/events",
  },
  {
    icon: Newspaper,
    labelEl: "Feed",
    labelEn: "Feed",
    path: "/feed",
  },
  {
    icon: MapPin,
    labelEl: "Map",
    labelEn: "Map",
    path: "/map",
  },
];

const PhoneMockup = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => undefined);
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    }

    video.addEventListener("loadeddata", playVideo);
    return () => video.removeEventListener("loadeddata", playVideo);
  }, []);

  return (
    <div className="w-[164px] sm:w-[182px] md:w-[204px] lg:w-[224px] xl:w-[236px] shrink-0">
      <div
        className="relative rounded-[2rem] sm:rounded-[2.2rem] bg-gradient-to-b from-foreground/30 via-foreground/10 to-foreground/5 p-[4px] ring-1 ring-foreground/10 shadow-2xl shadow-black/30"
        style={{ aspectRatio: "9/17" }}
      >
        <div className="absolute -left-[2px] top-[18%] h-[8%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -left-[2px] top-[30%] h-[12%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -left-[2px] top-[44%] h-[12%] w-[3px] rounded-l-sm bg-foreground/20" />
        <div className="absolute -right-[2px] top-[32%] h-[14%] w-[3px] rounded-r-sm bg-foreground/20" />

        <div className="relative h-full w-full overflow-hidden rounded-[1.8rem] sm:rounded-[2rem] bg-background">
          <video
            ref={videoRef}
            className="h-full w-full object-cover brightness-110 contrast-110 saturate-125"
            src={heroPhoneLoop}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-transparent to-background/10" />
          <div className="pointer-events-none absolute inset-x-[18%] top-[9%] h-[22%] rounded-full bg-seafoam/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-foreground/25" />
        </div>
      </div>
    </div>
  );
};

const HeroSection = ({ language }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", user.id)
            .single();

          setUserName(data?.name || user.email?.split("@")[0] || "User");
          setUserAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
        }
      } catch {
        // ignore
      }
    };

    checkUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkUser());
    return () => listener.subscription.unsubscribe();
  }, []);

  const text = {
    el: {
      explore: "Εξερεύνηση",
      signup: "Εγγραφή",
      login: "Σύνδεση",
      joinFomo: "Εγγραφή στο ΦΟΜΟ",
      forBusinesses: "Για Επιχειρήσεις",
    },
    en: {
      explore: "Explore",
      signup: "Sign Up",
      login: "Login",
      joinFomo: "Join ΦΟΜΟ",
      forBusinesses: "For Businesses",
    },
  };

  const t = text[language];

  const navLinkClass =
    "shrink-0 whitespace-nowrap cursor-pointer font-inter text-[0.82rem] sm:text-sm font-bold tracking-wide text-foreground transition-colors hover:text-seafoam";

  return (
    <section className="relative overflow-hidden bg-background pb-10 sm:pb-14">
      <div className="absolute left-[8%] top-[4.5rem] h-40 w-40 rounded-full bg-seafoam/[0.06] blur-3xl sm:h-56 sm:w-56" />
      <div className="absolute right-[10%] top-[12rem] h-44 w-44 rounded-full bg-foreground/[0.04] blur-3xl sm:h-64 sm:w-64" />
      <div className="absolute bottom-[8%] left-[24%] h-44 w-44 rounded-full bg-seafoam/[0.05] blur-3xl sm:h-72 sm:w-72" />

      <div className="relative z-10">
        <div className="container mx-auto px-3 sm:px-4 py-4">
          <div className="flex flex-nowrap items-center justify-center gap-4 sm:gap-6 lg:gap-10">
            <button onClick={() => navigate("/")} className={`${navLinkClass} font-cinzel text-[1.02rem] sm:text-[1.12rem]`}>
              ΦΟΜΟ
            </button>

            <button onClick={() => navigate("/feed")} className={navLinkClass}>
              {t.explore}
            </button>

            {user ? (
              <div className="shrink-0">
                <UserAccountDropdown
                  userId={user.id}
                  userName={userName}
                  avatarUrl={userAvatarUrl}
                  variant="button"
                />
              </div>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`${navLinkClass} flex items-center gap-1`}>
                      {t.signup} <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 bg-popover text-popover-foreground">
                    <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => navigate("/signup")}>
                      {t.joinFomo}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => navigate("/signup-business")}>
                      {t.forBusinesses}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer font-medium sm:hidden" onClick={() => navigate("/login")}>
                      {t.login}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button onClick={() => navigate("/login")} className={`${navLinkClass} hidden sm:block`}>
                  {t.login}
                </button>
              </>
            )}

            <div className="shrink-0 origin-center scale-[0.88] sm:scale-100">
              <LanguageToggle />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-4 sm:pt-6 lg:pt-8">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute left-[18%] top-1/2 -z-10 h-44 w-44 -translate-y-1/2 rounded-full bg-seafoam/[0.08] blur-[80px] sm:h-64 sm:w-64" />
            <div className="absolute right-[18%] top-1/2 -z-10 h-36 w-36 -translate-y-1/2 rounded-full bg-foreground/[0.04] blur-[70px] sm:h-52 sm:w-52" />

            <div className="flex items-center justify-center gap-6 sm:gap-10 lg:gap-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
              >
                <PhoneMockup />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="flex flex-col items-center gap-6 sm:gap-8"
              >
                {featureItems.map((item, index) => (
                  <motion.button
                    key={item.labelEn}
                    onClick={() => navigate(item.path)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.35 + index * 0.08 }}
                    className="group flex cursor-pointer flex-col items-center gap-2"
                  >
                    <div className="relative h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                      <svg
                        className="absolute inset-0 h-full w-full -rotate-45 text-seafoam/50 transition-transform duration-500 group-hover:rotate-0"
                        viewBox="0 0 80 80"
                      >
                        <circle
                          cx="40"
                          cy="40"
                          r="37"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray="58 175"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="absolute inset-1.5 flex items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 transition-all duration-300 group-hover:border-seafoam/30 group-hover:bg-seafoam/10">
                        <item.icon className="h-4 w-4 text-seafoam sm:h-5 sm:w-5" strokeWidth={1.5} />
                      </div>
                    </div>

                    <span className="font-inter text-[11px] sm:text-sm font-medium text-foreground/70 transition-colors group-hover:text-foreground">
                      {language === "el" ? item.labelEl : item.labelEn}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
