import { useState, useEffect } from 'react';
import { useUserRSVPs } from '@/hooks/useUserRSVPs';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedEventCard } from '@/components/feed/UnifiedEventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, CalendarCheck, Star, Ticket, QrCode, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { TicketQRDialog } from '@/components/tickets/TicketQRDialog';

interface MyEventsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyEvents = ({ userId, language }: MyEventsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSubtab = searchParams.get('subtab') || 'going';
  const { interested, going, pastInterested, pastGoing, loading: rsvpLoading } = useUserRSVPs(userId);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const dateLocale = language === 'el' ? el : enUS;

  // Fetch user's tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["my-tickets-events", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          qr_code_token,
          status,
          checked_in_at,
          created_at,
          ticket_tiers(name, price_cents, currency),
          events(id, title, start_at, end_at, location, cover_image_url, business_id, businesses(name)),
          ticket_orders(customer_name, total_cents)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Categorize tickets
  const now = new Date();
  const upcomingTickets = tickets?.filter(t => 
    t.events && new Date(t.events.start_at) >= now && t.status === 'valid'
  ) || [];
  const pastTickets = tickets?.filter(t => 
    !t.events || new Date(t.events.start_at) < now || t.status !== 'valid'
  ) || [];

  const text = {
    el: {
      going: 'Θα Πάω',
      interested: 'Ενδιαφέρομαι',
      tickets: 'Εισιτήρια',
      noGoing: 'Δεν έχετε επιβεβαιώσει συμμετοχή σε καμία εκδήλωση',
      noInterested: 'Δεν έχετε σημειώσει ενδιαφέρον για καμία εκδήλωση',
      noTickets: 'Δεν έχετε εισιτήρια ακόμα',
      history: 'Ιστορικό',
      eventEnded: 'Ολοκληρώθηκε',
      noHistory: 'Δεν υπάρχει ιστορικό ακόμα',
      showQR: 'QR',
      valid: 'Έγκυρο',
      used: 'Χρησιμοποιημένο',
      browseEvents: 'Εξερεύνηση Εκδηλώσεων',
      free: 'Δωρεάν',
    },
    en: {
      going: "Going",
      interested: 'Interested',
      tickets: 'Tickets',
      noGoing: "You haven't confirmed attendance to any events",
      noInterested: "You haven't marked interest in any events",
      noTickets: "You don't have any tickets yet",
      history: 'History',
      eventEnded: 'Ended',
      noHistory: 'No history yet',
      showQR: 'QR',
      valid: 'Valid',
      used: 'Used',
      browseEvents: 'Browse Events',
      free: 'Free',
    },
  };

  const t = text[language];
  const loading = rsvpLoading || ticketsLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const formatPrice = (priceCents: number | undefined) => {
    if (priceCents === undefined || priceCents === 0) return t.free;
    return `€${(priceCents / 100).toFixed(2)}`;
  };

  const renderEvents = (eventsList: any[], emptyMessage: string, isRsvp = false) => {
    if (eventsList.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-sm">{emptyMessage}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventsList.map(item => {
          const rawEvent = isRsvp ? item.event : item;
          const key = isRsvp ? item.id : rawEvent.id;
          const isBoosted = rawEvent.isBoosted || false;
          // Map business (singular) to businesses (plural) for UnifiedEventCard
          const event = {
            ...rawEvent,
            businesses: rawEvent.business || rawEvent.businesses,
          };
          return (
            <div key={key} className="relative">
              {/* Use mobile card style on all devices for visual consistency */}
              <UnifiedEventCard
                event={event}
                language={language}
                size="mobileFixed"
                isBoosted={isBoosted}
                disableViewTracking
                linkSearch="?src=dashboard_user"
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderPastEvents = (eventsList: any[], isRsvp = false) => {
    if (eventsList.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-sm">{t.noHistory}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventsList.map(item => {
          const rawEvent = isRsvp ? item.event : item;
          const key = isRsvp ? item.id : rawEvent.id;
          const isBoosted = rawEvent.isBoosted || false;
          // Map business (singular) to businesses (plural) for UnifiedEventCard
          const event = {
            ...rawEvent,
            businesses: rawEvent.business || rawEvent.businesses,
          };
          return (
            <div key={key} className="relative opacity-60">
              {/* Use mobile card style on all devices for visual consistency */}
              <UnifiedEventCard
                event={event}
                language={language}
                size="mobileFixed"
                isBoosted={isBoosted}
                disableViewTracking
                linkSearch="?src=dashboard_user"
              />
              <Badge variant="secondary" className="absolute top-2 right-2 bg-background/90 backdrop-blur text-xs z-20">
                <Clock className="h-3 w-3 mr-1" />
                {t.eventEnded}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTickets = (ticketsList: any[], emptyMessage: string, isPast = false) => {
    if (ticketsList.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-sm">{emptyMessage}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ticketsList.map(ticket => {
          const businessName = (ticket.events as any)?.businesses?.name;
          return (
            <Card key={ticket.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
              {/* Image section - same as event/offer cards */}
              {ticket.events?.cover_image_url && (
                <div className="relative h-[45vw] md:aspect-auto md:h-36 overflow-hidden rounded-t-xl">
                  <img
                    src={ticket.events.cover_image_url}
                    alt={ticket.events.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
                  
                  {/* Status badge */}
                  <Badge 
                    variant={ticket.status === 'valid' ? 'default' : 'secondary'} 
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
                  >
                    {ticket.status === 'valid' ? t.valid : t.used}
                  </Badge>
                </div>
              )}
              
              {/* Content section - below image */}
              <CardContent className="p-2.5 space-y-1">
                <h4 className="font-semibold text-sm line-clamp-1">{ticket.events?.title}</h4>
                
                {businessName && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{businessName}</p>
                )}
                
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{ticket.ticket_tiers?.name}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className={`text-xs font-medium ${ticket.ticket_tiers?.price_cents === 0 ? 'text-emerald-600' : 'text-primary'}`}>
                    {ticket.ticket_tiers?.price_cents === 0 ? t.free : formatPrice(ticket.ticket_tiers?.price_cents)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {ticket.events?.start_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      {format(new Date(ticket.events.start_at), "dd MMM, HH:mm", { locale: dateLocale })}
                    </span>
                  )}
                  {ticket.events?.location && (
                    <button
                      onClick={() => {
                        // Open Google Maps with the EVENT's location (not business address)
                        // NO analytics tracking for this action
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.events?.location || '')}`;
                        window.open(mapsUrl, '_blank');
                      }}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="truncate max-w-[80px]">{ticket.events.location}</span>
                    </button>
                  )}
                </div>
                
                {/* QR Button */}
                {ticket.status === 'valid' && !isPast && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 mt-1.5 text-xs"
                    onClick={() => setSelectedTicket({
                      id: ticket.id,
                      qrToken: ticket.qr_code_token,
                      tierName: ticket.ticket_tiers?.name || "",
                      eventTitle: ticket.events?.title || "",
                      eventDate: ticket.events?.start_at || "",
                      eventLocation: ticket.events?.location || "",
                      customerName: ticket.ticket_orders?.customer_name || "",
                      purchaseDate: ticket.created_at,
                      pricePaid: formatPrice(ticket.ticket_tiers?.price_cents),
                      businessName: businessName,
                      eventCoverImage: ticket.events?.cover_image_url,
                      eventTime: ticket.events?.start_at,
                    })}
                  >
                    <QrCode className="h-3 w-3 mr-1" />
                    {t.showQR}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const hasPastEvents = pastInterested.length > 0 || pastGoing.length > 0 || pastTickets.length > 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue={initialSubtab} className="w-full">
        <TabsList className="w-full h-auto p-1 sm:p-1.5 bg-muted/40 rounded-xl gap-0.5 sm:gap-1">
          <TabsTrigger 
            value="going" 
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <CalendarCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t.going}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {going.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="interested" 
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t.interested}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {interested.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="tickets" 
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t.tickets}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {upcomingTickets.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="going" className="mt-4">
          {renderEvents(going, t.noGoing, true)}
        </TabsContent>
        <TabsContent value="interested" className="mt-4">
          {renderEvents(interested, t.noInterested, true)}
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          {renderTickets(upcomingTickets, t.noTickets, false)}
        </TabsContent>
      </Tabs>

      {hasPastEvents && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {t.history} ({pastGoing.length + pastInterested.length + pastTickets.length})
                </span>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Tabs defaultValue="past-going" className="w-full">
              <TabsList className="w-full h-auto gap-1 bg-muted/30 p-1 rounded-lg">
                <TabsTrigger value="past-going" className="flex-1 text-xs px-2 py-1.5">
                  {t.going} ({pastGoing.length})
                </TabsTrigger>
                <TabsTrigger value="past-interested" className="flex-1 text-xs px-2 py-1.5">
                  {t.interested} ({pastInterested.length})
                </TabsTrigger>
                <TabsTrigger value="past-tickets" className="flex-1 text-xs px-2 py-1.5">
                  {t.tickets} ({pastTickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="past-going" className="mt-4">
                {renderPastEvents(pastGoing, true)}
              </TabsContent>
              <TabsContent value="past-interested" className="mt-4">
                {renderPastEvents(pastInterested, true)}
              </TabsContent>
              <TabsContent value="past-tickets" className="mt-4">
                {renderTickets(pastTickets, t.noHistory, true)}
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      )}

      <TicketQRDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
};