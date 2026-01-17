import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Ticket, Calendar, Eye, MousePointer, Users, Euro, TicketCheck, UserCheck } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface BoostManagementProps {
  businessId: string;
}

interface EventBoostWithMetrics {
  id: string;
  event_id: string;
  boost_tier: string;
  start_date: string;
  end_date: string;
  total_cost_cents: number;
  status: string;
  event_title: string;
  event_price: number | null;
  impressions: number;
  interactions: number; // RSVPs (interested + going)
  visits: number; // ticket check-ins + reservation check-ins
  tickets_sold: number;
  ticket_revenue_cents: number;
  reservations_count: number;
  reservation_guests: number;
  reservation_revenue_cents: number;
  has_paid_content: boolean;
}

interface OfferBoostWithMetrics {
  id: string;
  discount_id: string;
  boost_tier: string;
  start_date: string;
  end_date: string;
  total_cost_cents: number;
  active: boolean;
  offer_title: string;
  impressions: number;
  interactions: number; // redemption clicks
  visits: number; // QR scans
}

const BoostManagement = ({ businessId }: BoostManagementProps) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [eventBoosts, setEventBoosts] = useState<EventBoostWithMetrics[]>([]);
  const [offerBoosts, setOfferBoosts] = useState<OfferBoostWithMetrics[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBoosts();
  }, [businessId]);

  const fetchBoosts = async () => {
    setLoading(true);
    try {
      // Fetch event boosts with all metrics
      const { data: eventData, error: eventError } = await supabase
        .from("event_boosts")
        .select(`
          id,
          event_id,
          boost_tier,
          start_date,
          end_date,
          total_cost_cents,
          status,
          events (
            id,
            title,
            price
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (eventError) throw eventError;

      // Fetch metrics for each event boost
      const eventBoostsWithMetrics: EventBoostWithMetrics[] = await Promise.all(
        (eventData || []).map(async (boost) => {
          const eventId = boost.event_id;
          
          // Fetch impressions (event views)
          const { count: impressions } = await supabase
            .from("event_views")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId);

          // Fetch RSVPs (interactions)
          const { count: rsvps } = await supabase
            .from("rsvps")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId);

          // Fetch tickets sold
          const { count: ticketsSold } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .eq("status", "valid");

          // Fetch ticket revenue from ticket_orders
          const { data: ticketOrders } = await supabase
            .from("ticket_orders")
            .select("subtotal_cents")
            .eq("event_id", eventId)
            .eq("status", "completed");

          const ticketRevenue = ticketOrders?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0;

          // Fetch ticket check-ins (visits from tickets)
          const { count: ticketCheckIns } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .not("checked_in_at", "is", null);

          // Fetch reservations
          const { data: reservations } = await supabase
            .from("reservations")
            .select("party_size, prepaid_min_charge_cents, checked_in_at")
            .eq("event_id", eventId)
            .eq("status", "confirmed");

          const reservationsCount = reservations?.length || 0;
          const reservationGuests = reservations?.reduce((sum, r) => sum + (r.party_size || 0), 0) || 0;
          const reservationRevenue = reservations?.reduce((sum, r) => sum + (r.prepaid_min_charge_cents || 0), 0) || 0;
          const reservationCheckIns = reservations?.filter(r => r.checked_in_at).length || 0;

          const totalVisits = (ticketCheckIns || 0) + reservationCheckIns;
          const hasPaidContent = ticketRevenue > 0 || reservationRevenue > 0;

          return {
            id: boost.id,
            event_id: eventId,
            boost_tier: boost.boost_tier,
            start_date: boost.start_date,
            end_date: boost.end_date,
            total_cost_cents: boost.total_cost_cents,
            status: boost.status,
            event_title: boost.events?.title || "Event",
            event_price: boost.events?.price || null,
            impressions: impressions || 0,
            interactions: rsvps || 0,
            visits: totalVisits,
            tickets_sold: ticketsSold || 0,
            ticket_revenue_cents: ticketRevenue,
            reservations_count: reservationsCount,
            reservation_guests: reservationGuests,
            reservation_revenue_cents: reservationRevenue,
            has_paid_content: hasPaidContent,
          };
        })
      );

      setEventBoosts(eventBoostsWithMetrics);

      // Fetch offer boosts with metrics
      const { data: offerData, error: offerError } = await supabase
        .from("offer_boosts")
        .select(`
          id,
          discount_id,
          boost_tier,
          start_date,
          end_date,
          total_cost_cents,
          active,
          discounts (
            id,
            title
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (offerError) throw offerError;

      // Fetch metrics for each offer boost
      const offerBoostsWithMetrics: OfferBoostWithMetrics[] = await Promise.all(
        (offerData || []).map(async (boost) => {
          const discountId = boost.discount_id;
          
          // Fetch impressions (discount views)
          const { count: impressions } = await supabase
            .from("discount_views")
            .select("*", { count: "exact", head: true })
            .eq("discount_id", discountId);

          // Fetch interactions (offer purchases = redemption clicks)
          const { count: redemptionClicks } = await supabase
            .from("offer_purchases")
            .select("*", { count: "exact", head: true })
            .eq("discount_id", discountId);

          // Fetch visits (QR scans)
          const { count: qrScans } = await supabase
            .from("discount_scans")
            .select("*", { count: "exact", head: true })
            .eq("discount_id", discountId)
            .eq("success", true);

          return {
            id: boost.id,
            discount_id: discountId,
            boost_tier: boost.boost_tier || "standard",
            start_date: boost.start_date,
            end_date: boost.end_date,
            total_cost_cents: boost.total_cost_cents,
            active: boost.active,
            offer_title: boost.discounts?.title || "Offer",
            impressions: impressions || 0,
            interactions: redemptionClicks || 0,
            visits: qrScans || 0,
          };
        })
      );

      setOfferBoosts(offerBoostsWithMetrics);
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierLabel = (tier: string) => {
    if (tier === "premium") {
      return language === "el" ? "Premium (100%)" : "Premium (100%)";
    }
    return language === "el" ? "Standard (70%)" : "Standard (70%)";
  };

  const toggleEventBoostStatus = async (boostId: string, currentStatus: string) => {
    setTogglingId(boostId);
    // Toggle between active and canceled (no "paused" status exists in the enum)
    const newStatus = currentStatus === "active" ? "canceled" : "active";
    
    try {
      const { error } = await supabase
        .from("event_boosts")
        .update({ status: newStatus })
        .eq("id", boostId);

      if (error) throw error;

      setEventBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, status: newStatus } : b)
      );

      toast.success(
        language === "el" 
          ? (newStatus === "active" ? "Η προώθηση ενεργοποιήθηκε" : "Η προώθηση απενεργοποιήθηκε")
          : (newStatus === "active" ? "Boost activated" : "Boost deactivated")
      );
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const toggleOfferBoostStatus = async (boostId: string, currentActive: boolean) => {
    setTogglingId(boostId);
    const newActive = !currentActive;
    
    try {
      const { error } = await supabase
        .from("offer_boosts")
        .update({ active: newActive })
        .eq("id", boostId);

      if (error) throw error;

      setOfferBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, active: newActive } : b)
      );

      toast.success(
        language === "el" 
          ? (newActive ? "Η προώθηση ενεργοποιήθηκε" : "Η προώθηση τέθηκε σε παύση")
          : (newActive ? "Boost activated" : "Boost paused")
      );
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const t = {
    title: language === "el" ? "Διαχείριση Προωθήσεων" : "Boost Management",
    subtitle: language === "el" 
      ? "Παρακολουθήστε την απόδοση των προωθημένων εκδηλώσεων και προσφορών σας"
      : "Track the performance of your boosted events and offers",
    events: language === "el" ? "Εκδηλώσεις" : "Events",
    offers: language === "el" ? "Προσφορές" : "Offers",
    noEventBoosts: language === "el" 
      ? "Δεν υπάρχουν προωθήσεις εκδηλώσεων" 
      : "No event boosts",
    noOfferBoosts: language === "el" 
      ? "Δεν υπάρχουν προωθήσεις προσφορών" 
      : "No offer boosts",
    impressions: language === "el" ? "Εμφανίσεις" : "Impressions",
    impressionsTooltip: language === "el" 
      ? "Πόσες φορές είδαν οι χρήστες τις σελίδες των boosted εκδηλώσεών σου" 
      : "How many times users viewed your boosted event pages",
    interactions: language === "el" ? "Αλληλεπιδράσεις" : "Interactions",
    interactionsEventTooltip: language === "el" 
      ? "RSVPs χρηστών: \"Ενδιαφέρομαι\" ή \"Θα πάω\"" 
      : "User RSVPs: \"Interested\" or \"Going\"",
    interactionsOfferTooltip: language === "el" 
      ? "Κλικ στο κουμπί \"Εξαργύρωσε\"" 
      : "Clicks on the \"Redeem\" button",
    visits: language === "el" ? "Επισκέψεις" : "Visits",
    visitsEventTooltip: language === "el" 
      ? "Από σάρωση εισιτηρίων/κρατήσεων" 
      : "From ticket/reservation scans",
    visitsOfferTooltip: language === "el" 
      ? "Σαρώσεις QR για εξαργύρωση προσφοράς" 
      : "QR scans for offer redemption",
    boostInfo: language === "el" ? "Πληροφορίες Boost" : "Boost Info",
    tier: language === "el" ? "Tier" : "Tier",
    period: language === "el" ? "Περίοδος" : "Period",
    totalCost: language === "el" ? "Συνολικό Κόστος" : "Total Cost",
    status: language === "el" ? "Κατάσταση" : "Status",
    active: language === "el" ? "Ενεργό" : "Active",
    paused: language === "el" ? "Παύση" : "Paused",
    revenue: language === "el" ? "Έσοδα μέσω FOMO" : "Revenue via FOMO",
    ticketsSold: language === "el" ? "Εισιτήρια" : "Tickets",
    ticketRevenue: language === "el" ? "Έσοδα Εισιτηρίων" : "Ticket Revenue",
    reservations: language === "el" ? "Κρατήσεις" : "Reservations",
    guests: language === "el" ? "Άτομα" : "Guests",
    reservationRevenue: language === "el" ? "Έσοδα Κρατήσεων" : "Reservation Revenue",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">
            <Zap className="h-4 w-4 mr-2" />
            {t.events} ({eventBoosts.length})
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Ticket className="h-4 w-4 mr-2" />
            {t.offers} ({offerBoosts.length})
          </TabsTrigger>
        </TabsList>

        {/* EVENT BOOSTS TAB */}
        <TabsContent value="events" className="space-y-4 mt-4">
          {eventBoosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t.noEventBoosts}
              </CardContent>
            </Card>
          ) : (
            eventBoosts.map((boost) => (
              <Card key={boost.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header with title */}
                  <div className="p-4 pb-3 border-b bg-muted/30">
                    <h3 className="font-semibold text-lg">{boost.event_title}</h3>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 divide-x border-b">
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.impressions}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.impressions.toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <MousePointer className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.interactions}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.interactions.toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.visits}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.visits.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Boost Info */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.tier}:</span>
                          <Badge variant={boost.boost_tier === "premium" ? "default" : "secondary"}>
                            {getTierLabel(boost.boost_tier)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.period}:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(boost.start_date), "dd/MM")} - {format(new Date(boost.end_date), "dd/MM")}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.totalCost}:</span>
                          <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.status}:</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={boost.status === "active"}
                              onCheckedChange={() => toggleEventBoostStatus(boost.id, boost.status)}
                              disabled={togglingId === boost.id || boost.status === "completed" || boost.status === "canceled"}
                            />
                            <span className={`text-xs font-medium ${boost.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                              {boost.status === "active" ? t.active : t.paused}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Section - Only if has paid content */}
                    {boost.has_paid_content && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          {t.revenue}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {boost.ticket_revenue_cents > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <TicketCheck className="h-4 w-4" />
                                <span className="text-xs">{t.ticketsSold}</span>
                              </div>
                              <p className="font-bold">{boost.tickets_sold}</p>
                              <p className="text-sm text-green-600 font-semibold">
                                €{(boost.ticket_revenue_cents / 100).toFixed(2)}
                              </p>
                            </div>
                          )}
                          {boost.reservation_revenue_cents > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <UserCheck className="h-4 w-4" />
                                <span className="text-xs">{t.reservations}</span>
                              </div>
                              <p className="font-bold">{boost.reservations_count} ({boost.reservation_guests} {t.guests})</p>
                              <p className="text-sm text-green-600 font-semibold">
                                €{(boost.reservation_revenue_cents / 100).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* OFFER BOOSTS TAB */}
        <TabsContent value="offers" className="space-y-4 mt-4">
          {offerBoosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t.noOfferBoosts}
              </CardContent>
            </Card>
          ) : (
            offerBoosts.map((boost) => (
              <Card key={boost.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header with title */}
                  <div className="p-4 pb-3 border-b bg-muted/30">
                    <h3 className="font-semibold text-lg">{boost.offer_title}</h3>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 divide-x border-b">
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.impressions}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.impressions.toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <MousePointer className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.interactions}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.interactions.toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-medium">{t.visits}</span>
                      </div>
                      <p className="text-2xl font-bold">{boost.visits.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Boost Info */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.tier}:</span>
                          <Badge variant={boost.boost_tier === "premium" ? "default" : "secondary"}>
                            {getTierLabel(boost.boost_tier)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.period}:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(boost.start_date), "dd/MM")} - {format(new Date(boost.end_date), "dd/MM")}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.totalCost}:</span>
                          <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.status}:</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={boost.active}
                              onCheckedChange={() => toggleOfferBoostStatus(boost.id, boost.active)}
                              disabled={togglingId === boost.id}
                            />
                            <span className={`text-xs font-medium ${boost.active ? "text-green-600" : "text-muted-foreground"}`}>
                              {boost.active ? t.active : t.paused}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BoostManagement;
