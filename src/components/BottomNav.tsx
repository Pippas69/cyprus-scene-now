import { Home, Calendar, MapPin, Tag, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Check if user owns a business
          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          // Set role based on business ownership with fallback
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

  const navItems = [
    { icon: Home, label: "Home", path: "/feed" },
    { icon: Calendar, label: "Events", path: "/ekdiloseis" },
    { icon: MapPin, label: "Map", path: "/xartis" },
    { icon: Tag, label: "Offers", path: "/feed" }, // Can be updated to a dedicated offers page
    { 
      icon: User, 
      label: "Profile", 
      path: user ? (userRole === "business" ? "/dashboard-business" : "/dashboard-user") : "/login" 
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="flex items-center justify-around h-16 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label={item.label}
            >
              <Icon 
                className={`h-6 w-6 transition-transform ${active ? "scale-110" : ""}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-xs mt-1 ${active ? "font-medium" : "font-normal"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
