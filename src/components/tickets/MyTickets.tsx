import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Calendar, MapPin, QrCode, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { TicketQRDialog } from "./TicketQRDialog";
import { Link } from "react-router-dom";

const t = {
  el: {
    myTickets: "Τα Εισιτήριά Μου",
    noTickets: "Δεν έχετε εισιτήρια ακόμα",
    browseEvents: "Εξερεύνηση Εκδηλώσεων",
    valid: "Έγκυρο",
    used: "Χρησιμοποιημένο",
    cancelled: "Ακυρωμένο",
    refunded: "Επεστράφη",
    showQR: "Εμφάνιση QR",
    checkedIn: "Check-in",
    upcoming: "Επερχόμενες",
    past: "Παρελθούσες",
    purchased: "Αγοράστηκε",
    ticketHolder: "Κάτοχος",
    free: "Δωρεάν",
  },
  en: {
    myTickets: "My Tickets",
    noTickets: "You don't have any tickets yet",
    browseEvents: "Browse Events",
    valid: "Valid",
    used: "Used",
    cancelled: "Cancelled",
    refunded: "Refunded",
    showQR: "Show QR",
    checkedIn: "Checked In",
    upcoming: "Upcoming",
    past: "Past",
    purchased: "Purchased",
    ticketHolder: "Ticket Holder",
    free: "Free",
  },
};

export const MyTickets = () => {
  const { language } = useLanguage();
  const text = t[language];
  const dateLocale = language === 'el' ? el : enUS;
  
  const [selectedTicket, setSelectedTicket] = useState<{
    id: string;
    qrToken: string;
    tierName: string;
    eventTitle: string;
    eventDate?: string;
    eventLocation?: string;
    customerName?: string;
    purchaseDate?: string;
    pricePaid?: string;
    businessName?: string;
    eventCoverImage?: string;
    eventTime?: string;
  } | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          qr_code_token,
          status,
          checked_in_at,
          created_at,
          ticket_tiers(name, price_cents, currency),
          events(id, title, start_at, location, cover_image_url, businesses(name)),
          ticket_orders(customer_name, total_cents)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge variant="default" className="bg-green-600">{text.valid}</Badge>;
      case "used":
        return <Badge variant="secondary">{text.used}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{text.cancelled}</Badge>;
      case "refunded":
        return <Badge variant="outline">{text.refunded}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const now = new Date();
  const upcomingTickets = tickets?.filter(t => 
    t.events && new Date(t.events.start_at) >= now && t.status === 'valid'
  ) || [];
  const pastTickets = tickets?.filter(t => 
    !t.events || new Date(t.events.start_at) < now || t.status !== 'valid'
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
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

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{text.noTickets}</p>
          <Button asChild>
            <Link to="/ekdiloseis">{text.browseEvents}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (priceCents: number | undefined, currency: string = 'eur') => {
    if (priceCents === undefined || priceCents === 0) return text.free;
    const amount = (priceCents / 100).toFixed(2);
    return currency.toUpperCase() === 'EUR' ? `€${amount}` : `${amount} ${currency.toUpperCase()}`;
  };

  const TicketCard = ({ ticket }: { ticket: typeof tickets[0] }) => {
    const pricePaid = formatPrice(ticket.ticket_tiers?.price_cents, ticket.ticket_tiers?.currency);
    const businessName = (ticket.events as any)?.businesses?.name;
    const eventCoverImage = ticket.events?.cover_image_url;
    const eventTime = ticket.events?.start_at;
    
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex">
          {ticket.events?.cover_image_url && (
            <div className="w-24 h-full flex-shrink-0">
              <img
                src={ticket.events.cover_image_url}
                alt={ticket.events.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{ticket.events?.title}</h3>
                {businessName && (
                  <p className="text-xs text-muted-foreground">by {businessName}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-primary font-medium">
                    {ticket.ticket_tiers?.name}
                  </p>
                  <span className="text-sm font-semibold text-foreground">
                    {pricePaid}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {ticket.events?.start_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(ticket.events.start_at), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
                    </span>
                  )}
                  {ticket.events?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ticket.events.location}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>
                    {text.purchased}: {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: dateLocale })}
                  </span>
                  {ticket.ticket_orders?.customer_name && (
                    <span>
                      {text.ticketHolder}: {ticket.ticket_orders.customer_name}
                    </span>
                  )}
                </div>

                {ticket.checked_in_at && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {text.checkedIn}: {format(new Date(ticket.checked_in_at), "HH:mm", { locale: dateLocale })}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(ticket.status)}
                
                {ticket.status === "valid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTicket({
                      id: ticket.id,
                      qrToken: ticket.qr_code_token,
                      tierName: ticket.ticket_tiers?.name || "",
                      eventTitle: ticket.events?.title || "",
                      eventDate: ticket.events?.start_at || "",
                      eventLocation: ticket.events?.location || "",
                      customerName: ticket.ticket_orders?.customer_name || "",
                      purchaseDate: ticket.created_at,
                      pricePaid: pricePaid,
                      businessName: businessName,
                      eventCoverImage: eventCoverImage || undefined,
                      eventTime: eventTime || undefined,
                    })}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    {text.showQR}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {upcomingTickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {text.upcoming}
          </h2>
          {upcomingTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {pastTickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">{text.past}</h2>
          {pastTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      <TicketQRDialog
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
};

export default MyTickets;
