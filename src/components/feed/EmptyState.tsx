import { SearchX, CalendarX, Tag, Waves, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface EmptyStateProps {
  type: "no-results" | "no-upcoming" | "no-offers";
  filters?: {
    categories?: string[];
    city?: string | null;
  };
  onClearFilters?: () => void;
  language: "el" | "en";
}

const EmptyState = ({ type, filters, onClearFilters, language }: EmptyStateProps) => {
  const navigate = useNavigate();

  const translations = {
    el: {
      noResults: "Δεν βρέθηκαν εκδηλώσεις",
      noResultsDesc: "Δοκιμάστε να αφαιρέσετε μερικά φίλτρα για να δείτε περισσότερα αποτελέσματα.",
      noUpcoming: "Δεν υπάρχουν επερχόμενες εκδηλώσεις",
      noUpcomingDesc: "Ελέγξτε ξανά σύντομα για νέες εκδηλώσεις!",
      noOffers: "Δεν υπάρχουν διαθέσιμες προσφορές",
      noOffersDesc: "Δεν υπάρχουν ενεργές προσφορές αυτή τη στιγμή.",
      clearFilters: "Καθαρισμός Φίλτρων",
      viewMap: "Προβολή Χάρτη",
      browseAll: "Περιήγηση Όλων",
    },
    en: {
      noResults: "No events found",
      noResultsDesc: "Try removing some filters to see more results.",
      noUpcoming: "No upcoming events",
      noUpcomingDesc: "Check back soon for new events!",
      noOffers: "No offers available",
      noOffersDesc: "There are no active offers at the moment.",
      clearFilters: "Clear Filters",
      viewMap: "View Map",
      browseAll: "Browse All",
    },
  };

  const t = translations[language];

  // Mediterranean-themed illustrated icons
  const getIllustration = () => {
    const iconProps = "h-12 w-12";
    
    switch (type) {
      case "no-results":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-ocean opacity-10 rounded-full blur-2xl" />
            <div className="relative bg-gradient-to-br from-muted to-muted/50 rounded-full p-6 border border-border/50">
              <SearchX className={`${iconProps} text-ocean`} />
            </div>
            {/* Floating particles */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ y: [0, -6, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-5 w-5 text-accent/60" />
            </motion.div>
          </div>
        );
      case "no-upcoming":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-accent/10 rounded-full blur-2xl" />
            <div className="relative bg-gradient-to-br from-muted to-muted/50 rounded-full p-6 border border-border/50">
              <CalendarX className={`${iconProps} text-ocean`} />
            </div>
            {/* Wave decoration */}
            <motion.div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2"
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Waves className="h-6 w-6 text-seafoam/40" />
            </motion.div>
          </div>
        );
      case "no-offers":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/10 rounded-full blur-2xl" />
            <div className="relative bg-gradient-to-br from-muted to-muted/50 rounded-full p-6 border border-border/50">
              <Tag className={`${iconProps} text-ocean`} />
            </div>
            <motion.div
              className="absolute -top-1 -left-2"
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="h-3 w-3 rounded-full bg-accent" />
            </motion.div>
          </div>
        );
    }
  };

  const getMessage = () => {
    switch (type) {
      case "no-results":
        return { title: t.noResults, description: t.noResultsDesc };
      case "no-upcoming":
        return { title: t.noUpcoming, description: t.noUpcomingDesc };
      case "no-offers":
        return { title: t.noOffers, description: t.noOffersDesc };
    }
  };

  const message = getMessage();
  const hasFilters = filters?.categories && filters.categories.length > 0 || filters?.city;

  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-12 sm:py-16 px-3 sm:px-4 text-center max-w-full overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Animated illustration */}
      <motion.div 
        className="mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        {getIllustration()}
      </motion.div>
      
      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">{message.title}</h3>
        <p className="text-muted-foreground mb-6 sm:mb-8 max-w-xs sm:max-w-md leading-relaxed">{message.description}</p>
      </motion.div>
      
      {/* Action buttons with gradient hover */}
      <motion.div 
        className="flex flex-wrap gap-3 justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {hasFilters && onClearFilters && (
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            className="hover:border-ocean hover:text-ocean transition-colors"
          >
            {t.clearFilters}
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => navigate("/xartis")}
          className="hover:border-accent hover:text-accent transition-colors"
        >
          {t.viewMap}
        </Button>
        {type === "no-results" && (
          <Button 
            onClick={() => onClearFilters?.()}
            className="bg-gradient-ocean hover:opacity-90 text-white border-0"
          >
            {t.browseAll}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default EmptyState;
