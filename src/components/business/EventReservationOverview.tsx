import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Users, Euro, TrendingUp, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCommissionRate } from "@/hooks/useCommissionRate";

interface EventReservationOverviewProps {
  eventId: string;
  businessId?: string;
}

interface SeatingTier {
  id: string;
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
}

interface SeatingType {
  id: string;
  seating_type: string;
  available_slots: number;
  slots_booked: number;
  dress_code: string | null;
  no_show_policy: string;
  tiers: SeatingTier[];
}

interface ReservationData {
  id: string;
  party_size: number;
  checked_in_at: string | null;
  seating_preference: string | null;
  seating_type_id: string | null;
  prepaid_min_charge_cents?: number;
}

const t = {
  el: {
    totalRevenue: "Συνολικά Έσοδα",
    reservations: "Κρατήσεις",
    checkedIn: "Check-ins",
    netRevenue: "Καθαρά Έσοδα",
    bySeating: "Ανά Κατηγορία",
    booked: "κρατημένα",
    available: "διαθέσιμα",
    commission: "Προμήθεια",
    noSeating: "Δεν υπάρχουν κρατήσεις",
  },
  en: {
    totalRevenue: "Total Revenue",
    reservations: "Reservations",
    checkedIn: "Check-ins",
    netRevenue: "Net Revenue",
    bySeating: "By Seating Type",
    booked: "booked",
    available: "available",
    commission: "Commission",
    noSeating: "No reservations found",
  },
};

export const EventReservationOverview = ({ eventId, businessId }: EventReservationOverviewProps) => {
  const { language } = useLanguage();
  const text = t[language];

  // Get the business's commission rate (dynamic per plan)
  const { data: commissionData } = useCommissionRate(businessId || null);
  const commissionPercent = commissionData?.commissionPercent ?? 12;

  const { data: overview, isLoading } = useQuery({
    queryKey: ["event-reservation-overview", eventId],
    queryFn: async () => {
      // Fetch seating types for this event
      const { data: seatingTypesRaw, error: seatingError } = await supabase
        .from("reservation_seating_types")
        .select("*")
        .eq("event_id", eventId);

      if (seatingError) throw seatingError;

      // Fetch tiers for each seating type
      const seatingTypes: SeatingType[] = [];
      for (const st of seatingTypesRaw || []) {
        const { data: tiers } = await supabase
          .from("seating_type_tiers")
          .select("*")
          .eq("seating_type_id", st.id)
          .order("min_people", { ascending: true });

        seatingTypes.push({
          id: st.id,
          seating_type: st.seating_type,
          available_slots: st.available_slots,
          slots_booked: st.slots_booked || 0,
          dress_code: st.dress_code,
          no_show_policy: st.no_show_policy,
          tiers: (tiers || []) as SeatingTier[],
        });
      }

      // Fetch only confirmed (accepted) reservations for this event
      const { data: reservationsRaw, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, party_size, checked_in_at, seating_preference, seating_type_id, prepaid_min_charge_cents")
        .eq("event_id", eventId)
        .eq("status", "accepted"); // Only confirmed reservations

      if (reservationsError) throw reservationsError;

      const reservations = (reservationsRaw || []) as ReservationData[];

      // Calculate totals
      const totalRevenue = reservations.reduce((sum, r) => {
        return sum + (r.prepaid_min_charge_cents || 0);
      }, 0);

      // Calculate commission based on the business's plan (dynamic)
      const totalCommission = Math.round(totalRevenue * (commissionPercent / 100));

      const checkedIn = reservations.filter(r => r.checked_in_at).length;

      // Group by seating type - use actual confirmed reservation count for "booked"
      // Only count reservations that match a seating type for the breakdown
      const seatingStats = seatingTypes.map((st) => {
        const stReservations = reservations.filter(
          (r) => r.seating_type_id === st.id || r.seating_preference === st.seating_type,
        );
        const bookedCount = stReservations.length;
        const minPrice =
          st.tiers.length > 0 ? Math.min(...st.tiers.map((t) => t.prepaid_min_charge_cents)) : 0;

        const totalSlots = st.available_slots;
        const availableSlots = totalSlots - bookedCount;

        return {
          ...st,
          booked: bookedCount,
          available: availableSlots > 0 ? availableSlots : 0,
          minPrice,
        };
      });

      // Total reservations = sum of all categorized bookings (so it matches the breakdown)
      const totalReservations = seatingStats.reduce((sum, st) => sum + st.booked, 0);

      return {
        seatingTypes: seatingStats,
        totalRevenue,
        totalCommission,
        netRevenue: totalRevenue - totalCommission,
        totalReservations,
        checkedIn,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!overview || overview.totalReservations === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{text.noSeating}</p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <Euro className="h-4 w-4" />
              {text.totalRevenue}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{formatPrice(overview.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <Users className="h-4 w-4" />
              {text.reservations}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.totalReservations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" />
              {text.checkedIn}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.checkedIn}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <TrendingUp className="h-4 w-4" />
              {text.netRevenue}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 text-green-600 whitespace-nowrap">{formatPrice(overview.netRevenue)}</p>
            {overview.totalCommission > 0 && (
              <p className="text-[11px] md:text-xs text-muted-foreground whitespace-nowrap">
                {text.commission}: {formatPrice(overview.totalCommission)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seating breakdown */}
      {overview.seatingTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{text.bySeating}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.seatingTypes.map((seating) => {
              const total = seating.available_slots || 1;
              const bookedPercent = total > 0 ? (seating.booked / total) * 100 : 0;

              return (
                <div key={seating.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[10px] md:text-sm whitespace-nowrap">{seating.seating_type}</span>
                      {seating.minPrice > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] md:text-xs px-1.5 md:px-2 h-5 md:h-6 whitespace-nowrap flex-shrink-0"
                        >
                          {formatPrice(seating.minPrice)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {seating.booked} {text.booked} / {seating.available} {text.available}
                    </span>
                  </div>
                  <Progress value={bookedPercent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventReservationOverview;
