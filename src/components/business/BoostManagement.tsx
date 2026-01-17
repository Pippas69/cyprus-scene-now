import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Ticket, Calendar, Eye, MousePointer, Users, Euro, TicketCheck, UserCheck, Pause, Play } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      return "Premium (100%)";
    }
    return "Standard (70%)";
  };

  const pauseEventBoost = async (boostId: string) => {
    setTogglingId(boostId);
    
    try {
      const { error } = await supabase
        .from("event_boosts")
        .update({ status: "canceled" })
        .eq("id", boostId);

      if (error) throw error;

      setEventBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, status: "canceled" } : b)
      );

      toast.success(
        language === "el" 
          ? "Η προώθηση τέθηκε σε παύση"
          : "Boost paused"
      );
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const pauseOfferBoost = async (boostId: string) => {
    setTogglingId(boostId);
    
    try {
      const { error } = await supabase
        .from("offer_boosts")
        .update({ active: false })
        .eq("id", boostId);

      if (error) throw error;

      setOfferBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, active: false } : b)
      );

      toast.success(
        language === "el" 
          ? "Η προώθηση τέθηκε σε παύση"
          : "Boost paused"
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
      ? "Δεν υπάρχουν προωθήσεις εκδηλώσεων. Μπορείτε να προωθήσετε εκδηλώσεις από τη λίστα Εκδηλώσεων." 
      : "No event boosts. You can boost events from the Events list.",
    noOfferBoosts: language === "el" 
      ? "Δεν υπάρχουν προωθήσεις προσφορών. Μπορείτε να προωθήσετε προσφορές από τη λίστα Προσφορών." 
      : "No offer boosts. You can boost offers from the Offers list.",
    impressions: language === "el" ? "Εμφανίσεις" : "Impressions",
    impressionsEventTooltip: language === "el" 
      ? "Πόσες φορές είδαν οι χρήστες τις σελίδες των boosted εκδηλώσεών σου από οπουδήποτε" 
      : "How many times users viewed your boosted event pages from anywhere",
    impressionsOfferTooltip: language === "el" 
      ? "Πόσες φορές είδαν οι χρήστες τις σελίδες των boosted προσφορών σου από οπουδήποτε" 
      : "How many times users viewed your boosted offer pages from anywhere",
    interactions: language === "el" ? "Αλληλεπιδράσεις" : "Interactions",
    interactionsEventTooltip: language === "el" 
      ? "RSVPs χρηστών: \"Ενδιαφέρομαι\" ή \"Θα πάω\" για boosted εκδηλώσεις" 
      : "User RSVPs: \"Interested\" or \"Going\" for boosted events",
    interactionsOfferTooltip: language === "el" 
      ? "Κλικ στο κουμπί \"Εξαργύρωσε\" – δείχνει πρόθεση χρήσης της boosted προσφοράς" 
      : "Clicks on \"Redeem\" button – shows intent to use the boosted offer",
    visits: language === "el" ? "Επισκέψεις" : "Visits",
    visitsEventTooltip: language === "el" 
      ? "Check-ins εισιτηρίων και κρατήσεων εκδηλώσεων minimum charge αποκλειστικά για boosted" 
      : "Ticket and minimum charge reservation check-ins exclusively for boosted events",
    visitsOfferTooltip: language === "el" 
      ? "Σαρώσεις QR για εξαργύρωση boosted προσφοράς στον χώρο σου, είτε με κράτηση είτε χωρίς (walk-in)" 
      : "QR scans for boosted offer redemption at your venue, with or without reservation (walk-in)",
    tier: language === "el" ? "Tier:" : "Tier:",
    period: language === "el" ? "Περίοδος:" : "Period:",
    totalCost: language === "el" ? "Κόστος:" : "Cost:",
    status: language === "el" ? "Κατάσταση:" : "Status:",
    active: language === "el" ? "Ενεργή" : "Active",
    paused: language === "el" ? "Σε Παύση" : "Paused",
    pauseBoost: language === "el" ? "Παύση" : "Pause",
    recreateEventBoost: language === "el" 
      ? "Για να ενεργοποιήσετε ξανά, δημιουργήστε νέα προώθηση από τις Εκδηλώσεις" 
      : "To reactivate, create a new boost from Events",
    recreateOfferBoost: language === "el" 
      ? "Για να ενεργοποιήσετε ξανά, δημιουργήστε νέα προώθηση από τις Προσφορές" 
      : "To reactivate, create a new boost from Offers",
    revenue: language === "el" ? "Έσοδα μέσω FOMO" : "Revenue via FOMO",
    ticketsSold: language === "el" ? "Εισιτήρια" : "Tickets",
    reservations: language === "el" ? "Κρατήσεις" : "Reservations",
    guests: language === "el" ? "άτομα" : "guests",
  };

  // Helper component for metric with tooltip
  const MetricWithTooltip = ({ 
    icon: Icon, 
    label, 
    value, 
    tooltip 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    tooltip: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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
            eventBoosts.map((boost) => {
              const isActive = boost.status === "active";
              
              return (
                <Card key={boost.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header with title and status badge */}
                    <div className="p-4 pb-3 border-b bg-muted/30 flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{boost.event_title}</h3>
                      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
                        {isActive ? t.active : t.paused}
                      </Badge>
                    </div>

                    {/* Metrics Grid with Tooltips */}
                    <div className="grid grid-cols-3 divide-x border-b">
                      <MetricWithTooltip
                        icon={Eye}
                        label={t.impressions}
                        value={boost.impressions}
                        tooltip={t.impressionsEventTooltip}
                      />
                      <MetricWithTooltip
                        icon={MousePointer}
                        label={t.interactions}
                        value={boost.interactions}
                        tooltip={t.interactionsEventTooltip}
                      />
                      <MetricWithTooltip
                        icon={Users}
                        label={t.visits}
                        value={boost.visits}
                        tooltip={t.visitsEventTooltip}
                      />
                    </div>

                    {/* Boost Info - Left aligned Tier/Period, Right aligned Cost/Status */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left side - Tier & Period */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{t.tier}</span>
                            <Badge variant={boost.boost_tier === "premium" ? "default" : "secondary"} className="ml-1">
                              {getTierLabel(boost.boost_tier)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{t.period}</span>
                            <span className="font-medium flex items-center gap-1 ml-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(boost.start_date), "dd/MM")} - {format(new Date(boost.end_date), "dd/MM")}
                            </span>
                          </div>
                        </div>

                        {/* Right side - Cost & Pause Button */}
                        <div className="space-y-2 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground">{t.totalCost}</span>
                            <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                          </div>
                          {isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseEventBoost(boost.id)}
                              disabled={togglingId === boost.id}
                              className="gap-1.5"
                            >
                              {togglingId === boost.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Pause className="h-3.5 w-3.5" />
                              )}
                              {t.pauseBoost}
                            </Button>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5 opacity-60 cursor-help"
                                    disabled
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                    {t.paused}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-sm">{t.recreateEventBoost}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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
              );
            })
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
                  {/* Header with title and status badge */}
                  <div className="p-4 pb-3 border-b bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{boost.offer_title}</h3>
                    <Badge variant={boost.active ? "default" : "secondary"} className={boost.active ? "bg-green-600" : ""}>
                      {boost.active ? t.active : t.paused}
                    </Badge>
                  </div>

                  {/* Metrics Grid with Tooltips */}
                  <div className="grid grid-cols-3 divide-x border-b">
                    <MetricWithTooltip
                      icon={Eye}
                      label={t.impressions}
                      value={boost.impressions}
                      tooltip={t.impressionsOfferTooltip}
                    />
                    <MetricWithTooltip
                      icon={MousePointer}
                      label={t.interactions}
                      value={boost.interactions}
                      tooltip={t.interactionsOfferTooltip}
                    />
                    <MetricWithTooltip
                      icon={Users}
                      label={t.visits}
                      value={boost.visits}
                      tooltip={t.visitsOfferTooltip}
                    />
                  </div>

                  {/* Boost Info - Left aligned Tier/Period, Right aligned Cost/Status */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Tier & Period */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t.tier}</span>
                          <Badge variant={boost.boost_tier === "premium" ? "default" : "secondary"} className="ml-1">
                            {getTierLabel(boost.boost_tier)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t.period}</span>
                          <span className="font-medium flex items-center gap-1 ml-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(boost.start_date), "dd/MM")} - {format(new Date(boost.end_date), "dd/MM")}
                          </span>
                        </div>
                      </div>

                      {/* Right side - Cost & Pause Button */}
                      <div className="space-y-2 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">{t.totalCost}</span>
                          <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                        </div>
                        {boost.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pauseOfferBoost(boost.id)}
                            disabled={togglingId === boost.id}
                            className="gap-1.5"
                          >
                            {togglingId === boost.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Pause className="h-3.5 w-3.5" />
                            )}
                            {t.pauseBoost}
                          </Button>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1.5 opacity-60 cursor-help"
                                  disabled
                                >
                                  <Pause className="h-3.5 w-3.5" />
                                  {t.paused}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">{t.recreateOfferBoost}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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
