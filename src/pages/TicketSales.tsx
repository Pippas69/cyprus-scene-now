import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Calendar, Euro, Users, QrCode, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { Link } from "react-router-dom";
import { TicketScanner } from "@/components/tickets/TicketScanner";
import { TicketSalesOverview } from "@/components/tickets/TicketSalesOverview";

interface TicketSalesProps {
  businessId: string;
}

const t = {
  el: {
    ticketSales: "Πωλήσεις Εισιτηρίων",
    noEvents: "Δεν έχετε εκδηλώσεις με εισιτήρια",
    createEvent: "Δημιουργία Εκδήλωσης",
    overview: "Επισκόπηση",
    scanner: "Σαρωτής",
    ticketsSold: "Εισιτήρια που πωλήθηκαν",
    revenue: "Έσοδα",
    checkIns: "Check-ins",
    upcoming: "Επερχόμενες",
    past: "Παρελθούσες",
    viewDetails: "Λεπτομέρειες",
  },
  en: {
    ticketSales: "Ticket Sales",
    noEvents: "You don't have any events with tickets",
    createEvent: "Create Event",
    overview: "Overview",
    scanner: "Scanner",
    ticketsSold: "Tickets Sold",
    revenue: "Revenue",
    checkIns: "Check-ins",
    upcoming: "Upcoming",
    past: "Past",
    viewDetails: "View Details",
  },
};

export const TicketSales = ({ businessId }: TicketSalesProps) => {
  const { language } = useLanguage();
  const text = t[language];
  const dateLocale = language === 'el' ? el : enUS;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch events with ticket tiers
  const { data: eventsWithTickets, isLoading } = useQuery({
    queryKey: ["events-with-tickets", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          start_at,
          end_at,
          cover_image_url,
          ticket_tiers(
            id,
            name,
            price_cents,
            quantity_total,
            quantity_sold
          )
        `)
        .eq("business_id", businessId)
        .order("start_at", { ascending: false });

      if (error) throw error;
      
      // Filter to only events that have ticket tiers
      return (data || []).filter(event => 
        event.ticket_tiers && event.ticket_tiers.length > 0
      );
    },
    enabled: !!businessId,
  });

  const now = new Date();
  const upcomingEvents = eventsWithTickets?.filter(e => new Date(e.end_at) >= now) || [];
  const pastEvents = eventsWithTickets?.filter(e => new Date(e.end_at) < now) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (selectedEventId) {
    return (
      <div className="p-6 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedEventId(null)}
          className="mb-4"
        >
          ← {language === 'el' ? 'Πίσω' : 'Back'}
        </Button>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{text.overview}</TabsTrigger>
            <TabsTrigger value="scanner" className="gap-2">
              <QrCode className="h-4 w-4" />
              {text.scanner}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <TicketSalesOverview eventId={selectedEventId} />
          </TabsContent>
          
          <TabsContent value="scanner" className="mt-4">
            <TicketScanner eventId={selectedEventId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (!eventsWithTickets || eventsWithTickets.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{text.noEvents}</p>
            <Button asChild>
              <Link to="/dashboard-business/events/new">{text.createEvent}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const EventCard = ({ event }: { event: typeof eventsWithTickets[0] }) => {
    const totalSold = event.ticket_tiers?.reduce((sum, tier) => sum + (tier.quantity_sold || 0), 0) || 0;
    const totalQuantity = event.ticket_tiers?.reduce((sum, tier) => sum + tier.quantity_total, 0) || 0;
    const totalRevenue = event.ticket_tiers?.reduce((sum, tier) => 
      sum + ((tier.quantity_sold || 0) * tier.price_cents), 0
    ) || 0;

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEventId(event.id)}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {event.cover_image_url && (
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{event.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(event.start_at), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
              </p>
              
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">{totalSold}</span>
                  <span className="text-muted-foreground">/ {totalQuantity}</span>
                </div>
                
                <div className="flex items-center gap-1 text-sm">
                  <Euro className="h-4 w-4 text-green-600" />
                  <span className="font-medium">€{(totalRevenue / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <ArrowRight className="h-5 w-5 text-muted-foreground self-center" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Ticket className="h-6 w-6 text-primary" />
        {text.ticketSales}
      </h1>

      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{text.upcoming}</h2>
          {upcomingEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{text.past}</h2>
          {pastEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketSales;
