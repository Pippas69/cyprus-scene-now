import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Plus, Trash2, Calendar, Clock, Euro, Armchair, ChevronDown, ChevronUp } from "lucide-react";
import { VenueSelector } from "./VenueSelector";
import { type SelectedSeat } from "@/components/theatre/SeatMapViewer";
import { SeatSelectionStep } from "@/components/theatre/SeatSelectionStep";
import { FullscreenSeatSelector } from "@/components/theatre/FullscreenSeatSelector";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ZonePrice {
  zone_id: string;
  zone_name: string;
  price_cents: number;
}

export interface ShowInstance {
  start_at: Date | null;
  end_at: Date | null;
  doors_open_at: Date | null;
  venue_id: string | null;
  notes: string;
  zone_prices: ZonePrice[];
  house_seats: SelectedSeat[];
}

interface ShowInstanceEditorProps {
  instances: ShowInstance[];
  onInstancesChange: (instances: ShowInstance[]) => void;
  durationMinutes: number;
  language: 'el' | 'en';
}

const translations = {
  el: {
    showDates: "Ημερομηνίες Παραστάσεων",
    addShow: "Προσθήκη Παράστασης",
    showN: "Παράσταση",
    startDateTime: "Ημ/νία & Ώρα Έναρξης",
    doorsOpen: "Άνοιγμα Θυρών",
    notes: "Σημειώσεις (προαιρετικά)",
    notesPlaceholder: "π.χ. Πρεμιέρα, Ειδική βραδιά...",
    zonePricing: "Τιμολόγηση ανά Ζώνη",
    priceLabel: "Τιμή (€)",
    empty: "Δεν έχουν προστεθεί παραστάσεις",
    selectVenueFirst: "Επιλέξτε πρώτα χώρο",
    loadingZones: "Φόρτωση ζωνών...",
    houseSeats: "Κρατημένες Θέσεις",
    houseSeatsDesc: "Επιλέξτε θέσεις για τους καλεσμένους σας (VIP, Τύπος, Συντελεστές κλπ.)",
    houseSeatsCount: "κρατημένες θέσεις",
    showSeatMap: "Επιλογή θέσεων",
    hideSeatMap: "Απόκρυψη χάρτη",
  },
  en: {
    showDates: "Show Dates",
    addShow: "Add Show",
    showN: "Show",
    startDateTime: "Start Date & Time",
    doorsOpen: "Doors Open",
    notes: "Notes (optional)",
    notesPlaceholder: "e.g. Premiere, Special night...",
    zonePricing: "Zone Pricing",
    priceLabel: "Price (€)",
    empty: "No shows added yet",
    selectVenueFirst: "Select a venue first",
    loadingZones: "Loading zones...",
    houseSeats: "House Seats",
    houseSeatsDesc: "Select seats to reserve for your guests (VIPs, Press, Cast families, etc.)",
    houseSeatsCount: "reserved seats",
    showSeatMap: "Select seats",
    hideSeatMap: "Hide map",
  },
};

export const ShowInstanceEditor: React.FC<ShowInstanceEditorProps> = ({
  instances,
  onInstancesChange,
  durationMinutes,
  language,
}) => {
  const t = translations[language];

  const addInstance = () => {
    onInstancesChange([
      ...instances,
      {
        start_at: null,
        end_at: null,
        doors_open_at: null,
        venue_id: instances.length > 0 ? instances[instances.length - 1].venue_id : null,
        notes: '',
        zone_prices: instances.length > 0 ? [...instances[instances.length - 1].zone_prices] : [],
        house_seats: [],
      },
    ]);
  };

  const updateInstance = (index: number, updates: Partial<ShowInstance>) => {
    const updated = instances.map((inst, i) => {
      if (i !== index) return inst;
      const merged = { ...inst, ...updates };
      if (updates.start_at && durationMinutes > 0) {
        merged.end_at = new Date(updates.start_at.getTime() + durationMinutes * 60 * 1000);
      }
      if (updates.start_at && !inst.doors_open_at) {
        merged.doors_open_at = new Date(updates.start_at.getTime() - 30 * 60 * 1000);
      }
      return merged;
    });
    onInstancesChange(updated);
  };

  const removeInstance = (index: number) => {
    onInstancesChange(instances.filter((_, i) => i !== index));
  };

  const handleVenueChange = (index: number, venueId: string) => {
    updateInstance(index, { venue_id: venueId, zone_prices: [], house_seats: [] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t.showDates}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addInstance} className="text-xs h-7 sm:h-8">
          <Plus className="h-3 w-3 mr-1" />
          {t.addShow}
        </Button>
      </div>

      {instances.length === 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          {t.empty}
        </p>
      )}

      <div className="space-y-4">
        {instances.map((instance, index) => (
          <ShowInstanceCard
            key={index}
            index={index}
            instance={instance}
            onUpdate={(updates) => updateInstance(index, updates)}
            onRemove={() => removeInstance(index)}
            onVenueChange={(venueId) => handleVenueChange(index, venueId)}
            language={language}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

// Individual show card
interface ShowInstanceCardProps {
  index: number;
  instance: ShowInstance;
  onUpdate: (updates: Partial<ShowInstance>) => void;
  onRemove: () => void;
  onVenueChange: (venueId: string) => void;
  language: 'el' | 'en';
  t: Record<string, string>;
}

const ShowInstanceCard: React.FC<ShowInstanceCardProps> = ({
  index,
  instance,
  onUpdate,
  onRemove,
  onVenueChange,
  language,
  t,
}) => {
  const [showSeatMap, setShowSeatMap] = useState(false);

  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ['venue-zones-with-counts', instance.venue_id],
    queryFn: async () => {
      if (!instance.venue_id) return [];
      const [zonesRes, allSeats] = await Promise.all([
        supabase
          .from('venue_zones')
          .select('id, name, capacity, sort_order, color')
          .eq('venue_id', instance.venue_id)
          .order('sort_order'),
        fetchAllRows<{ id: string; zone_id: string }>(
          (from, to) =>
            supabase
              .from('venue_seats')
              .select('id, zone_id')
              .eq('venue_id', instance.venue_id!)
              .eq('is_active', true)
              .range(from, to)
        ),
      ]);
      if (zonesRes.error) throw zonesRes.error;
      const seatCounts: Record<string, number> = {};
      for (const s of allSeats) {
        seatCounts[s.zone_id] = (seatCounts[s.zone_id] || 0) + 1;
      }
      return (zonesRes.data || []).map(z => ({
        ...z,
        actual_seat_count: seatCounts[z.id] || 0,
      }));
    },
    enabled: !!instance.venue_id,
  });

  const initZonePrices = (venueZones: typeof zones) => {
    if (!venueZones || venueZones.length === 0) return;
    if (instance.zone_prices.length > 0) return;
    const prices: ZonePrice[] = venueZones
      .filter((z) => z.name !== 'Πλατεία')
      .map((z) => ({
        zone_id: z.id,
        zone_name: z.name,
        price_cents: 1500,
      }));
    onUpdate({ zone_prices: prices });
  };

  if (zones && zones.length > 0 && instance.zone_prices.length === 0) {
    initZonePrices(zones);
  }

  const updateZonePrice = (zoneId: string, priceCents: number) => {
    const updated = instance.zone_prices.map((zp) =>
      zp.zone_id === zoneId ? { ...zp, price_cents: priceCents } : zp
    );
    onUpdate({ zone_prices: updated });
  };

  const handleSeatToggle = (seat: SelectedSeat) => {
    const current = instance.house_seats || [];
    const exists = current.find(s => s.seatId === seat.seatId);
    if (exists) {
      onUpdate({ house_seats: current.filter(s => s.seatId !== seat.seatId) });
    } else {
      onUpdate({ house_seats: [...current, seat] });
    }
  };

  const houseSeatsCount = instance.house_seats?.length || 0;

  return (
    <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-xs sm:text-sm">
          {t.showN} #{index + 1}
        </h5>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Start Date/Time */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">{t.startDateTime}</Label>
        <DateTimePicker
          value={instance.start_at || undefined}
          onChange={(date) => onUpdate({ start_at: date || null })}
        />
      </div>

      {/* Doors Open */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {t.doorsOpen}
        </Label>
        <DateTimePicker
          value={instance.doors_open_at || undefined}
          onChange={(date) => onUpdate({ doors_open_at: date || null })}
        />
      </div>

      {/* Venue */}
      <VenueSelector
        selectedVenueId={instance.venue_id}
        onVenueChange={onVenueChange}
        language={language}
      />

      {/* Zone Pricing */}
      {instance.venue_id && (
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
            <Euro className="h-3 w-3" />
            {t.zonePricing}
          </Label>
          {zonesLoading && (
            <p className="text-xs text-muted-foreground">{t.loadingZones}</p>
          )}
          {!zonesLoading && instance.zone_prices.length > 0 && (
            <div className="space-y-2">
              {instance.zone_prices.map((zp) => {
                const zone = zones?.find((z) => z.id === zp.zone_id);
                return (
                  <div
                    key={zp.zone_id}
                    className="flex items-center gap-2 sm:gap-3 p-2 bg-muted/30 rounded-lg"
                  >
                    {zone?.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                    )}
                    <span className="text-xs sm:text-sm flex-1 truncate">
                      {zp.zone_name}
                      {zone && (
                        <span className="text-muted-foreground ml-1">
                          ({zone.actual_seat_count} {language === 'el' ? 'θέσεις' : 'seats'})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">€</span>
                      <NumberInput
                        value={Math.round(zp.price_cents / 100)}
                        onChange={(v) => updateZonePrice(zp.zone_id, v * 100)}
                        min={0}
                        max={999}
                        className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!zonesLoading && (!zones || zones.length === 0) && instance.venue_id && (
            <p className="text-xs text-muted-foreground">{t.selectVenueFirst}</p>
          )}
        </div>
      )}

      {/* House Seats - Interactive seat map for pre-reserving */}
      {instance.venue_id && !zonesLoading && instance.zone_prices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Armchair className="h-3 w-3" />
              {t.houseSeats}
              {houseSeatsCount > 0 && (
                <span className="text-xs font-normal text-primary ml-1">
                  ({houseSeatsCount} {t.houseSeatsCount})
                </span>
              )}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSeatMap(!showSeatMap)}
              className="text-xs h-7 gap-1"
            >
              {showSeatMap ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showSeatMap ? t.hideSeatMap : t.showSeatMap}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t.houseSeatsDesc}</p>

          {/* Selected house seats summary */}
          {houseSeatsCount > 0 && !showSeatMap && (
            <div className="flex flex-wrap gap-1.5">
              {(instance.house_seats || []).map(seat => (
                <span
                  key={seat.seatId}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: seat.zoneColor }}
                  />
                  {seat.zoneName} · {seat.rowLabel}{seat.seatNumber}
                </span>
              ))}
            </div>
          )}

          {/* Interactive seat map */}
          {showSeatMap && (
            <div className="border rounded-lg overflow-hidden bg-muted/10 min-h-[500px] lg:min-h-[600px]">
              <SeatSelectionStep
                venueId={instance.venue_id!}
                showInstanceId="__new__"
                maxSeats={zones ? zones.reduce((sum, z) => sum + (z.actual_seat_count || 0), 0) : 0}
                selectedSeats={instance.house_seats || []}
                onSeatToggle={handleSeatToggle}
                eventTitle={t.houseSeats}
                eventDate=""
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">{t.notes}</Label>
        <Textarea
          value={instance.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder={t.notesPlaceholder}
          rows={2}
          className="text-xs sm:text-sm resize-none"
          maxLength={200}
        />
      </div>
    </div>
  );
};
