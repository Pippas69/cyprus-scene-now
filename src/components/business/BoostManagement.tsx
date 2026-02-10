import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Ticket, Calendar, Eye, MousePointer, Users, Euro, TicketCheck, UserCheck, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { computeBoostWindow, isTimestampWithinWindow } from "@/lib/boostWindow";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  interactions: number;
  visits: number;
  tickets_sold: number;
  ticket_revenue_cents: number;
  reservations_count: number;
  reservation_guests: number;
  reservation_revenue_cents: number;
  has_paid_content: boolean;
  created_at?: string | null;
  duration_mode?: string | null;
  duration_hours?: number | null;
}

interface OfferBoostWithMetrics {
  id: string;
  discount_id: string;
  boost_tier: string;
  start_date: string;
  end_date: string;
  total_cost_cents: number;
  active: boolean;
  status: string;
  offer_title: string;
  impressions: number;
  interactions: number;
  visits: number;
  created_at?: string | null;
  duration_mode?: string | null;
  duration_hours?: number | null;
}

const BoostManagement = ({ businessId }: BoostManagementProps) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [eventBoosts, setEventBoosts] = useState<EventBoostWithMetrics[]>([]);
  const [offerBoosts, setOfferBoosts] = useState<OfferBoostWithMetrics[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);
  const [showExpiredOffers, setShowExpiredOffers] = useState(false);

  useEffect(() => {
    fetchBoosts();
  }, [businessId]);

  const fetchBoosts = async () => {
    setLoading(true);
    try {
      const getBoostWindow = (boost: {
        start_date: string;
        end_date: string;
        duration_mode?: string | null;
        duration_hours?: number | null;
        created_at?: string | null;
      }) => {
        if (boost.duration_mode !== "hourly") {
          const startIso = boost.start_date?.length === 10 ? `${boost.start_date}T00:00:00.000Z` : boost.start_date;
          const endIso = boost.end_date?.length === 10 ? `${boost.end_date}T23:59:59.999Z` : boost.end_date;
          return { startIso, endIso };
        }
        const start = boost.created_at ? new Date(boost.created_at) : new Date();
        const hours = boost.duration_hours ?? 1;
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        return { startIso: start.toISOString(), endIso: end.toISOString() };
      };

      // Fetch event boosts
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
          created_at,
          duration_mode,
          duration_hours,
          events (
            id,
            title,
            price
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (eventError) throw eventError;

      const eventBoostsWithMetrics: EventBoostWithMetrics[] = await Promise.all(
         (eventData || []).map(async (boost) => {
           const eventId = boost.event_id;
           const { startIso: boostStart, endIso: boostEnd } = getBoostWindow(boost);
           
          const { count: impressions } = await supabase
            .from("event_views")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .gte("viewed_at", boostStart)
            .lte("viewed_at", boostEnd);

          const { count: rsvps } = await supabase
            .from("rsvps")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const { data: ticketsSoldData } = await supabase
            .from("tickets")
            .select("id")
            .eq("event_id", eventId)
            .in("status", ["valid", "used"])
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const ticketsSold = ticketsSoldData?.length || 0;

          const { data: ticketOrders } = await supabase
            .from("ticket_orders")
            .select("subtotal_cents")
            .eq("event_id", eventId)
            .eq("status", "completed")
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const ticketRevenue = ticketOrders?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0;

          const { count: ticketCheckIns } = await supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
            .not("checked_in_at", "is", null)
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const { data: reservationsData } = await supabase
            .from("reservations")
            .select("party_size, prepaid_min_charge_cents")
            .eq("event_id", eventId)
            .eq("status", "accepted")
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const reservationsCount = reservationsData?.length || 0;
          const reservationGuests = reservationsData?.reduce((sum, r) => sum + (r.party_size || 0), 0) || 0;
          const reservationRevenue = reservationsData?.reduce((sum, r) => sum + (r.prepaid_min_charge_cents || 0), 0) || 0;

          const { count: reservationCheckIns } = await supabase
            .from("reservations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
            .not("checked_in_at", "is", null)
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const totalVisits = (ticketCheckIns || 0) + (reservationCheckIns || 0);
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
            tickets_sold: ticketsSold,
            ticket_revenue_cents: ticketRevenue,
            reservations_count: reservationsCount,
            reservation_guests: reservationGuests,
            reservation_revenue_cents: reservationRevenue,
            has_paid_content: hasPaidContent,
            created_at: boost.created_at,
            duration_mode: boost.duration_mode,
            duration_hours: boost.duration_hours,
          };
        })
      );

      setEventBoosts(eventBoostsWithMetrics);

      // Fetch offer boosts
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
          status,
          created_at,
          duration_mode,
          duration_hours,
          discounts (
            id,
            title
          )
        `)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (offerError) throw offerError;

      const offerBoostsWithMetrics: OfferBoostWithMetrics[] = await Promise.all(
         (offerData || []).map(async (boost) => {
           const discountId = boost.discount_id;
           const { startIso: boostStart, endIso: boostEnd } = getBoostWindow(boost);
           
          const { count: impressions } = await supabase
            .from("discount_views")
            .select("*", { count: "exact", head: true })
            .eq("discount_id", discountId)
            .gte("viewed_at", boostStart)
            .lte("viewed_at", boostEnd);

          const { count: redemptionClicks } = await supabase
            .from("engagement_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "offer_redeem_click")
            .eq("entity_id", discountId)
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          const { count: visits } = await supabase
            .from("offer_purchases")
            .select("*", { count: "exact", head: true })
            .eq("discount_id", discountId)
            .not("redeemed_at", "is", null)
            .gte("created_at", boostStart)
            .lte("created_at", boostEnd);

          return {
            id: boost.id,
            discount_id: discountId,
            boost_tier: boost.boost_tier || "standard",
            start_date: boost.start_date,
            end_date: boost.end_date,
            total_cost_cents: boost.total_cost_cents,
            active: boost.active,
            status: boost.status || (boost.active ? "active" : "deactivated"),
            offer_title: boost.discounts?.title || "Offer",
            impressions: impressions || 0,
            interactions: redemptionClicks || 0,
            visits: visits || 0,
            created_at: boost.created_at,
            duration_mode: boost.duration_mode,
            duration_hours: boost.duration_hours,
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

  const deactivateEventBoost = async (boostId: string) => {
    setTogglingId(boostId);
    
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("deactivate-event-boost", {
        body: { boostId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error) throw res.error;

      const responseData = res.data;
      setEventBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, status: "deactivated" } : b)
      );

      const refundMsg = responseData?.refunded && responseData?.remainingCents > 0
        ? (language === "el" 
            ? ` — €${(responseData.remainingCents / 100).toFixed(2)} επιστράφηκαν ως credits`
            : ` — €${(responseData.remainingCents / 100).toFixed(2)} returned as credits`)
        : "";

      toast.success(
        language === "el" 
          ? `Η προώθηση απενεργοποιήθηκε${refundMsg}`
          : `Boost deactivated${refundMsg}`
      );
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const deactivateOfferBoost = async (boostId: string) => {
    setTogglingId(boostId);
    
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("deactivate-offer-boost", {
        body: { boostId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error) throw res.error;

      const responseData = res.data;
      setOfferBoosts(prev => 
        prev.map(b => b.id === boostId ? { ...b, active: false, status: "deactivated" } : b)
      );

      const refundMsg = responseData?.refunded && responseData?.remainingCents > 0
        ? (language === "el" 
            ? ` — €${(responseData.remainingCents / 100).toFixed(2)} επιστράφηκαν ως credits`
            : ` — €${(responseData.remainingCents / 100).toFixed(2)} returned as credits`)
        : "";

      toast.success(
        language === "el" 
          ? `Η προώθηση απενεργοποιήθηκε${refundMsg}`
          : `Boost deactivated${refundMsg}`
      );
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Helper to check if a boost is currently within its time window
  const isBoostWithinWindow = (boost: {
    start_date: string;
    end_date: string;
    created_at?: string | null;
    duration_mode?: string | null;
    duration_hours?: number | null;
  }) => {
    const window = computeBoostWindow({
      start_date: boost.start_date,
      end_date: boost.end_date,
      created_at: boost.created_at,
      duration_mode: boost.duration_mode,
      duration_hours: boost.duration_hours,
    });
    if (!window) return false;
    return isTimestampWithinWindow(new Date().toISOString(), window);
  };

  // Active = status "active" AND within window, OR "pending" purchase boosts (processing)
  // Expired/Deactivated = everything else
  const isActiveOrPending = (status: string) => status === "active" || status === "pending" || status === "scheduled";

  const activeEventBoosts = useMemo(() => 
    eventBoosts.filter(b => 
      (b.status === "active" && isBoostWithinWindow(b)) || 
      b.status === "pending" || 
      b.status === "scheduled"
    ),
    [eventBoosts]
  );
  const expiredEventBoosts = useMemo(() => 
    eventBoosts.filter(b => 
      !((b.status === "active" && isBoostWithinWindow(b)) || b.status === "pending" || b.status === "scheduled")
    ),
    [eventBoosts]
  );
  const activeOfferBoosts = useMemo(() => 
    offerBoosts.filter(b => 
      (b.status === "active" && isBoostWithinWindow(b)) || 
      b.status === "pending" || 
      b.status === "scheduled"
    ),
    [offerBoosts]
  );
  const expiredOfferBoosts = useMemo(() => 
    offerBoosts.filter(b => 
      !((b.status === "active" && isBoostWithinWindow(b)) || b.status === "pending" || b.status === "scheduled")
    ),
    [offerBoosts]
  );

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
      ? "Μπορείτε να προωθήσετε εκδηλώσεις από τη λίστα Εκδηλώσεων" 
      : "You can boost events from the Events list",
    noOfferBoosts: language === "el" 
      ? "Μπορείτε να προωθήσετε προσφορές από τη λίστα Προσφορών" 
      : "You can boost offers from the Offers list",
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
      ? "Check-ins εισιτηρίων και κρατήσεων αποκλειστικά για Boosted εκδηλώσεις" 
      : "Ticket and reservation check-ins exclusively for boosted events",
    visitsOfferTooltip: language === "el" 
      ? "QR check-ins από εξαργυρώσεις boosted προσφοράς, είτε με κράτηση είτε χωρίς" 
      : "QR check-ins from boosted offer redemptions, with or without reservation",
    tier: language === "el" ? "Tier:" : "Tier:",
    period: language === "el" ? "Περίοδος:" : "Period:",
    totalCost: language === "el" ? "Κόστος:" : "Cost:",
    active: language === "el" ? "Ενεργή" : "Active",
    deactivateBoost: language === "el" ? "Απενεργοποίηση" : "Deactivate",
    recreateEventBoost: language === "el" 
      ? "Για να ενεργοποιήσετε ξανά, δημιουργήστε νέα προώθηση από τις Εκδηλώσεις" 
      : "To reactivate, create a new boost from Events",
    recreateOfferBoost: language === "el" 
      ? "Για να ενεργοποιήσετε ξανά, δημιουργήστε νέα προώθηση από τις Προσφορές" 
      : "To reactivate, create a new boost from Offers",
    revenue: language === "el" ? "Έσοδα μέσω ΦΟΜΟ" : "Revenue via ΦΟΜΟ",
    ticketsSold: language === "el" ? "Εισιτήρια" : "Tickets",
    reservations: language === "el" ? "Κρατήσεις" : "Reservations",
    guests: language === "el" ? "άτομα" : "guests",
    expired: language === "el" ? "Ληγμένες" : "Expired",
    deactivateConfirmTitle: language === "el" ? "Απενεργοποίηση Προώθησης" : "Deactivate Boost",
    deactivateConfirmDescFree: language === "el" 
      ? "Η εναπομείνασα αξία θα χαθεί οριστικά. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί." 
      : "The remaining value will be permanently forfeited. This action cannot be undone.",
    deactivateConfirmDescPaid: language === "el" 
      ? "Η εναπομείνασα αξία θα επιστραφεί ως credits στον μηνιαίο προϋπολογισμό σας." 
      : "The remaining value will be returned as credits to your monthly budget.",
    confirm: language === "el" ? "Επιβεβαίωση" : "Confirm",
    cancel: language === "el" ? "Ακύρωση" : "Cancel",
    deactivated: language === "el" ? "Απενεργ." : "Deactivated",
    pending: language === "el" ? "Επεξεργασία" : "Processing",
    scheduled: language === "el" ? "Προγραμματ." : "Scheduled",
  };

  // Click-to-open metric dialog
  const MetricWithDialog = ({
    icon: Icon,
    label,
    value,
    tooltip,
  }: {
    icon: any;
    label: string;
    value: number;
    tooltip: string;
  }) => (
    <Dialog>
      <DialogTrigger asChild>
        <div className="p-2 sm:p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-muted-foreground mb-0.5 sm:mb-1">
            <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{label}</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[280px] sm:max-w-md p-3 sm:p-6 pr-10 sm:pr-6">
        <DialogHeader className="pb-2 sm:pb-4 pr-2 sm:pr-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-lg">{label}</DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm">{tooltip}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">
          <div className="p-2 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render boost card for events
  const renderEventBoostCard = (boost: EventBoostWithMetrics, isExpiredSection: boolean) => {
    const isActive = boost.status === "active";
    const isDeactivated = boost.status === "deactivated";
    
    return (
      <Card key={boost.id} className={`overflow-hidden ${isExpiredSection ? "opacity-60" : ""}`}>
        <CardContent className="p-0">
          {/* Header with title and status badge */}
          <div className="p-2.5 sm:p-4 pb-2 sm:pb-3 border-b bg-muted/30 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-lg truncate">{boost.event_title}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {isActive ? (
                <Badge variant="default" className="text-[9px] sm:text-xs whitespace-nowrap">{t.active}</Badge>
              ) : isDeactivated ? (
                <Badge variant="outline" className="text-[9px] sm:text-xs whitespace-nowrap">
                  {t.deactivated}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] sm:text-xs whitespace-nowrap">
                  {t.expired}
                </Badge>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 divide-x border-b">
            <MetricWithDialog icon={Eye} label={t.impressions} value={boost.impressions} tooltip={t.impressionsEventTooltip} />
            <MetricWithDialog icon={MousePointer} label={t.interactions} value={boost.interactions} tooltip={t.interactionsEventTooltip} />
            <MetricWithDialog icon={Users} label={t.visits} value={boost.visits} tooltip={t.visitsEventTooltip} />
          </div>

          {/* Boost Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
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

              <div className="space-y-2 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground">{t.totalCost}</span>
                  <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                </div>
                {isActive && !isExpiredSection && (
                  <div className="flex gap-2 justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={togglingId === boost.id}
                          className="gap-1.5"
                        >
                          {togglingId === boost.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {t.deactivateBoost}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.deactivateConfirmTitle}</AlertDialogTitle>
                          <AlertDialogDescription>{t.deactivateConfirmDescPaid}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deactivateEventBoost(boost.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t.deactivateBoost}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Section */}
            {(boost.tickets_sold > 0 || boost.reservation_revenue_cents > 0) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  {t.revenue}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {boost.tickets_sold > 0 && (
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
  };

  // Render boost card for offers
  const renderOfferBoostCard = (boost: OfferBoostWithMetrics, isExpiredSection: boolean) => {
    const isActive = boost.status === "active";
    const isDeactivated = boost.status === "deactivated";

    return (
      <Card key={boost.id} className={`overflow-hidden ${isExpiredSection ? "opacity-60" : ""}`}>
        <CardContent className="p-0">
          {/* Header with title and status badge */}
          <div className="p-2.5 sm:p-4 pb-2 sm:pb-3 border-b bg-muted/30 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-lg truncate">{boost.offer_title}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {isActive ? (
                <Badge variant="default" className="text-[9px] sm:text-xs whitespace-nowrap">{t.active}</Badge>
              ) : isDeactivated ? (
                <Badge variant="outline" className="text-[9px] sm:text-xs whitespace-nowrap">
                  {t.deactivated}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] sm:text-xs whitespace-nowrap">
                  {t.expired}
                </Badge>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 divide-x border-b">
            <MetricWithDialog icon={Eye} label={t.impressions} value={boost.impressions} tooltip={t.impressionsOfferTooltip} />
            <MetricWithDialog icon={MousePointer} label={t.interactions} value={boost.interactions} tooltip={t.interactionsOfferTooltip} />
            <MetricWithDialog icon={Users} label={t.visits} value={boost.visits} tooltip={t.visitsOfferTooltip} />
          </div>

          {/* Boost Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
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

              <div className="space-y-2 text-sm text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground">{t.totalCost}</span>
                  <span className="font-bold text-primary">€{(boost.total_cost_cents / 100).toFixed(2)}</span>
                </div>
                {isActive && !isExpiredSection && (
                  <div className="flex gap-2 justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={togglingId === boost.id}
                          className="gap-1.5"
                        >
                          {togglingId === boost.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {t.deactivateBoost}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.deactivateConfirmTitle}</AlertDialogTitle>
                          <AlertDialogDescription>{t.deactivateConfirmDescPaid}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deactivateOfferBoost(boost.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t.deactivateBoost}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">{t.title}</h1>
        <p className="text-xs sm:text-base text-muted-foreground">{t.subtitle}</p>
      </div>

      <Tabs defaultValue="events">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.events} ({activeEventBoosts.length})
          </TabsTrigger>
          <TabsTrigger value="offers" className="text-xs sm:text-sm">
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.offers} ({activeOfferBoosts.length})
          </TabsTrigger>
        </TabsList>

        {/* EVENT BOOSTS TAB */}
        <TabsContent value="events" className="space-y-4 mt-4">
          {activeEventBoosts.length === 0 && expiredEventBoosts.length === 0 && (
            <Card>
              <CardContent className="p-3 sm:p-6 text-center text-muted-foreground text-[10px] sm:text-sm whitespace-nowrap">
                {t.noEventBoosts}
              </CardContent>
            </Card>
          )}
          {(activeEventBoosts.length > 0 || expiredEventBoosts.length > 0) && (
            <>
              {activeEventBoosts.map((boost) => renderEventBoostCard(boost, false))}

              {expiredEventBoosts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExpiredEvents(!showExpiredEvents)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  {showExpiredEvents ? "▲" : "▼"} {t.expired} ({expiredEventBoosts.length})
                </Button>
              )}

              {showExpiredEvents && expiredEventBoosts.map((boost) => renderEventBoostCard(boost, true))}
            </>
          )}
        </TabsContent>

        {/* OFFER BOOSTS TAB */}
        <TabsContent value="offers" className="space-y-4 mt-4">
          {activeOfferBoosts.length === 0 && expiredOfferBoosts.length === 0 && (
            <Card>
              <CardContent className="p-3 sm:p-6 text-center text-muted-foreground text-[10px] sm:text-sm whitespace-nowrap">
                {t.noOfferBoosts}
              </CardContent>
            </Card>
          )}
          {(activeOfferBoosts.length > 0 || expiredOfferBoosts.length > 0) && (
            <>
              {activeOfferBoosts.map((boost) => renderOfferBoostCard(boost, false))}

              {expiredOfferBoosts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExpiredOffers(!showExpiredOffers)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  {showExpiredOffers ? "▲" : "▼"} {t.expired} ({expiredOfferBoosts.length})
                </Button>
              )}

              {showExpiredOffers && expiredOfferBoosts.map((boost) => renderOfferBoostCard(boost, true))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BoostManagement;
