import { SearchX, CalendarX, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

  const getIcon = () => {
    switch (type) {
      case "no-results":
        return <SearchX className="h-16 w-16 text-muted-foreground" />;
      case "no-upcoming":
        return <CalendarX className="h-16 w-16 text-muted-foreground" />;
      case "no-offers":
        return <Tag className="h-16 w-16 text-muted-foreground" />;
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">{getIcon()}</div>
      <h3 className="text-2xl font-bold mb-2">{message.title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{message.description}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {hasFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {t.clearFilters}
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate("/xartis")}>
          {t.viewMap}
        </Button>
        {type === "no-results" && (
          <Button onClick={() => onClearFilters?.()}>
            {t.browseAll}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
