import { Home, Calendar, MapPin, Tag, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          setUserRole(business ? "business" : "user");
        }
      } catch (error) {
        console.warn('Error fetching user data in BottomNav:', error);
        setUserRole("user");
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Compute profile path as a separate variable to fix reactivity issues
  const profilePath = useMemo(() => {
    if (!user) return "/login";
    return userRole === "business" ? "/dashboard-business" : "/dashboard-user";
  }, [user, userRole]);

  const navItems = useMemo(() => [
    { icon: Home, label: "Home", path: "/feed" },
    { icon: MapPin, label: "Map", path: "/xartis" },
    { icon: Calendar, label: "Events", path: "/ekdiloseis" },
    { icon: Tag, label: "Offers", path: "/offers" },
    { icon: User, label: "Profile", path: profilePath },
  ], [profilePath]);

  const activeIndex = navItems.findIndex(item => location.pathname === item.path);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" />
      
      <nav className="relative flex items-center justify-around h-16 safe-area-bottom">
        {/* Animated indicator pill */}
        <AnimatePresence>
          {activeIndex >= 0 && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute top-1 h-1 w-12 rounded-full bg-primary"
              initial={false}
              animate={{
                left: `calc(${(activeIndex / navItems.length) * 100}% + ${100 / navItems.length / 2}% - 24px)`,
              }}
              transition={prefersReducedMotion ? { duration: 0 } : {
                type: "spring",
                stiffness: 500,
                damping: 35,
              }}
            />
          )}
        </AnimatePresence>

        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <motion.button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              whileTap={{}}
            >
              <motion.div
                animate={prefersReducedMotion ? {} : {
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <Icon 
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              
              <motion.span 
                className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-normal"}`}
                animate={prefersReducedMotion ? {} : {
                  opacity: isActive ? 1 : 0.8,
                }}
              >
                {item.label}
              </motion.span>

              {/* Active glow effect */}
              {isActive && !prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 bg-primary/5 rounded-lg -z-10"
                  layoutId="nav-glow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
