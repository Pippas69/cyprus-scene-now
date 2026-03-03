import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users } from "lucide-react";

interface VenueSelectorProps {
  selectedVenueId: string | null;
  onVenueChange: (venueId: string) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    selectVenue: "Επιλογή Χώρου",
    venue: "Χώρος Παράστασης",
    capacity: "Χωρητικότητα",
    seats: "θέσεις",
    noVenues: "Δεν βρέθηκαν χώροι",
    loading: "Φόρτωση...",
  },
  en: {
    selectVenue: "Select Venue",
    venue: "Performance Venue",
    capacity: "Capacity",
    seats: "seats",
    noVenues: "No venues found",
    loading: "Loading...",
  },
};

export const VenueSelector: React.FC<VenueSelectorProps> = ({ selectedVenueId, onVenueChange, language }) => {
  const t = translations[language];

  const { data: venues, isLoading } = useQuery({
    queryKey: ['venues-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, address, capacity, photo_url')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedVenue = venues?.find((v) => v.id === selectedVenueId);

  return (
    <div className="space-y-3">
      <Label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {t.venue}
      </Label>

      <Select value={selectedVenueId || ''} onValueChange={onVenueChange}>
        <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
          <SelectValue placeholder={isLoading ? t.loading : t.selectVenue} />
        </SelectTrigger>
        <SelectContent>
          {venues?.map((venue) => (
            <SelectItem key={venue.id} value={venue.id} className="text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span>{venue.name}</span>
                <span className="text-muted-foreground">— {venue.city}</span>
              </div>
            </SelectItem>
          ))}
          {!isLoading && (!venues || venues.length === 0) && (
            <div className="p-3 text-xs text-muted-foreground text-center">{t.noVenues}</div>
          )}
        </SelectContent>
      </Select>

      {selectedVenue && (
        <div className="p-3 bg-muted/30 rounded-lg border space-y-1">
          <p className="text-sm font-medium">{selectedVenue.name}</p>
          {selectedVenue.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {selectedVenue.address}, {selectedVenue.city}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {t.capacity}: {selectedVenue.capacity} {t.seats}
          </p>
        </div>
      )}
    </div>
  );
};
