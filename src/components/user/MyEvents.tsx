import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, QrCode, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { TicketQRDialog } from '@/components/tickets/TicketQRDialog';

interface MyEventsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyEvents = ({ userId, language }: MyEventsProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const dateLocale = language === 'el' ? el : enUS;

  // Fetch user's tickets - cached for 5 min so tab switches are instant
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["my-tickets-events", userId, "reservation-separation-v3"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          qr_code_token,
          status,
          checked_in_at,
          created_at,
          guest_name,
          guest_age,
          seat_zone,
          seat_row,
          seat_number,
          ticket_code,
          ticket_tiers(name, price_cents, currency, quantity_total),
          events(id, title, start_at, end_at, location, cover_image_url, business_id, accepts_reservations, businesses(name)),
          ticket_orders(customer_name, total_cents, linked_reservation_id)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // My Tickets must include pure ticket/walk-in orders, even when event supports reservations.
      return (data || []).filter((ticket) => {
        const hasLinkedReservation = Boolean((ticket.ticket_orders as any)?.linked_reservation_id);
        if (hasLinkedReservation) return false;

        const isReservationEnabledEvent = Boolean((ticket.events as any)?.accepts_reservations);
        if (!isReservationEnabledEvent) return true;

        const tierQuantityTotal = (ticket.ticket_tiers as any)?.quantity_total;
        const isReservationLinkedTier = tierQuantityTotal === 999999;
        return !isReservationLinkedTier;
      });
    },
  });

  // Ticket remains active for 10 hours after event start_at
  const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
  const now = new Date();
  const isTicketStillActive = (ticket: any) => {
    if (!ticket.events?.start_at) return false;
    const deadline = new Date(ticket.events.start_at).getTime() + TEN_HOURS_MS;
    return deadline >= now.getTime() && ticket.status === 'valid';
  };
  const upcomingTickets = tickets?.filter(t => isTicketStillActive(t)) || [];
  const pastTickets = tickets?.filter(t => !isTicketStillActive(t)) || [];

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
      expired: 'Έληξε',
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
      expired: 'Expired',
      browseEvents: 'Browse Events',
      free: 'Free',
    },
  };

  const t = text[language];
  const loading = ticketsLoading;

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

  const renderTickets = (ticketsList: any[], emptyMessage: string, isPast = false) => {
    if (ticketsList.length === 0) {
      return <p className="text-center text-muted-foreground py-6 text-sm">{emptyMessage}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ticketsList.map(ticket => {
          const businessName = (ticket.events as any)?.businesses?.name;
          const startAt = ticket.events?.start_at;
          const isTimeExpired = !startAt || (new Date(startAt).getTime() + TEN_HOURS_MS) < now.getTime();
          const isExpiredTicket = ticket.status === 'valid' && isTimeExpired;
          const statusText = ticket.status === 'used' ? t.used : isExpiredTicket ? t.expired : t.valid;
          const statusVariant = isExpiredTicket ? 'secondary' : ticket.status === 'valid' ? 'default' : 'secondary';

          return (
            <Card key={ticket.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
              {/* Image section - same as event/offer cards */}
              {ticket.events?.cover_image_url && (
                <div className="relative w-full aspect-[3/2] overflow-hidden rounded-t-xl">
                  <img
                    src={ticket.events.cover_image_url}
                    alt={ticket.events.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
                  
                  {/* Status badge */}
                  <Badge 
                    variant={statusVariant}
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0"
                  >
                    {statusText}
                  </Badge>
                </div>
              )}
              
              {/* Content section - below image */}
              <CardContent className="p-2.5 space-y-1">
                <h4 className="font-semibold text-sm line-clamp-1">{ticket.events?.title}</h4>
                
                {businessName && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{businessName}</p>
                )}
                
                {(ticket as any).seat_zone ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{(ticket as any).seat_zone}</span>
                    {(ticket as any).seat_row && <><span className="text-[10px]">•</span><span>{language === 'el' ? 'Σειρά' : 'Row'} {(ticket as any).seat_row}</span></>}
                    {(ticket as any).seat_number && <><span className="text-[10px]">•</span><span>{language === 'el' ? 'Θέση' : 'Seat'} {(ticket as any).seat_number}</span></>}
                    <span className="text-[10px]">•</span>
                    <span className={`font-medium ${ticket.ticket_tiers?.price_cents === 0 ? 'text-emerald-600' : 'text-primary'}`}>
                      {ticket.ticket_tiers?.price_cents === 0 ? t.free : formatPrice(ticket.ticket_tiers?.price_cents)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{ticket.ticket_tiers?.name}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className={`text-xs font-medium ${ticket.ticket_tiers?.price_cents === 0 ? 'text-emerald-600' : 'text-primary'}`}>
                      {ticket.ticket_tiers?.price_cents === 0 ? t.free : formatPrice(ticket.ticket_tiers?.price_cents)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground overflow-hidden">
                  {ticket.events?.start_at && (
                    <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Calendar className="h-3 w-3 text-primary shrink-0" />
                      {format(new Date(ticket.events.start_at), "dd MMM, HH:mm", { locale: dateLocale })}
                    </span>
                  )}
                  {ticket.events?.location && (
                    <button
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.events?.location || '')}`;
                        window.open(mapsUrl, '_blank');
                      }}
                      className="flex items-center gap-1 hover:text-primary transition-colors min-w-0"
                    >
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{ticket.events.location}</span>
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
                      guestName: ticket.guest_name || undefined,
                      guestAge: ticket.guest_age || undefined,
                      seatZone: (ticket as any).seat_zone || undefined,
                      seatRow: (ticket as any).seat_row || undefined,
                      seatNumber: (ticket as any).seat_number || undefined,
                      ticketCode: (ticket as any).ticket_code || undefined,
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

  const hasPastTickets = pastTickets.length > 0;

  return (
    <div className="space-y-4">
      {/* Tickets - main content now */}
      {renderTickets(upcomingTickets, t.noTickets, false)}

      {hasPastTickets && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {t.history} ({pastTickets.length})
                </span>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {renderTickets(pastTickets, t.noHistory, true)}
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