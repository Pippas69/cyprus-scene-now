import { useState } from "react";
import { Plus, Calendar, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  el: {
    createEvent: "Δημιουργία Εκδήλωσης",
    createOffer: "Δημιουργία Προσφοράς",
  },
  en: {
    createEvent: "Create Event",
    createOffer: "Create Offer",
  },
};

export function BusinessFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];

  // The FAB can overlap the settings save button on some screens.
  // Hide it on settings to avoid blocking interactions.
  if (location.pathname === "/dashboard-business/settings") return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col-reverse gap-3 items-end">
      {/* Expanded menu */}
      {isExpanded && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in">
          <Button
            onClick={() => {
              navigate("/dashboard-business/events/new");
              setIsExpanded(false);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <Calendar className="h-4 w-4" />
            <span>{t.createEvent}</span>
          </Button>
          <Button
            onClick={() => {
              navigate("/dashboard-business/offers/new");
              setIsExpanded(false);
            }}
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <Ticket className="h-4 w-4" />
            <span>{t.createOffer}</span>
          </Button>
        </div>
      )}

      {/* Main FAB button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        size="icon"
        className={`h-14 w-14 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-xl transition-transform ${
          isExpanded ? "rotate-45" : ""
        }`}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
