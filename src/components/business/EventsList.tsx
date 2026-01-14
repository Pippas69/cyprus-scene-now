import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Calendar, MapPin, Users, Copy, Pencil, Rocket, Sparkles, Ticket } from "lucide-react";
import EventEditDialog from "./EventEditDialog";
import EventBoostDialog from "./EventBoostDialog";
import { BoostPerformanceDialog } from "./BoostPerformanceDialog";
import { useEventActiveBoost } from "@/hooks/useBoostAnalytics";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/useLanguage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketSalesOverview } from "@/components/tickets/TicketSalesOverview";
import { TicketScanner } from "@/components/tickets/TicketScanner";

interface EventsListProps {
  businessId: string;
}

// Helper component to show active boost badge
const ActiveBoostBadge = ({ eventId, label, onViewStats }: { eventId: string; label: string; onViewStats: (boostId: string) => void }) => {
  const { activeBoost } = useEventActiveBoost(eventId);
  if (!activeBoost) return null;
  return (
    <Badge 
      variant="default" 
      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white cursor-pointer hover:opacity-90 flex items-center gap-1"
      onClick={() => onViewStats(activeBoost.id)}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const EventsList = ({ businessId }: EventsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [boostingEvent, setBoostingEvent] = useState<any>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [viewingBoostEventId, setViewingBoostEventId] = useState<string | null>(null);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const [ticketSalesEvent, setTicketSalesEvent] = useState<{ id: string; title: string } | null>(null);

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

  const translations = {
    el: {
      loading: "Φόρτωση...",
      noEvents: "Δεν έχετε δημοσιεύσει καμία εκδήλωση ακόμα.",
      success: "Επιτυχία",
      eventDeleted: "Η εκδήλωση διαγράφηκε",
      eventDuplicated: "Η εκδήλωση αντιγράφηκε επιτυχώς",
      error: "Σφάλμα",
      delete: "Διαγραφή",
      duplicate: "Αντιγραφή",
      edit: "Επεξεργασία",
      boost: "Προώθηση",
      viewStats: "Στατιστικά",
      boosted: "Προωθείται",
      interested: "Ενδιαφέρον",
      going: "Θα Πάνε",
      deleteConfirmTitle: "Διαγραφή Εκδήλωσης",
      deleteConfirmDescription: "Είστε σίγουροι ότι θέλετε να διαγράψετε την εκδήλωση",
      deleteConfirmWarning: "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.",
      cancel: "Ακύρωση",
      confirmDelete: "Διαγραφή",
      tickets: "Εισιτήρια",
      ticketSalesTitle: "Πωλήσεις Εισιτηρίων",
      overview: "Επισκόπηση",
      scanner: "Σαρωτής",
      cannotDeleteWithTickets: "Δεν μπορείτε να διαγράψετε αυτή την εκδήλωση γιατί υπάρχουν ολοκληρωμένες αγορές εισιτηρίων.",
    },
    en: {
      loading: "Loading...",
      noEvents: "You haven't published any events yet.",
      success: "Success",
      eventDeleted: "Event deleted",
      eventDuplicated: "Event duplicated successfully",
      error: "Error",
      delete: "Delete",
      duplicate: "Duplicate",
      edit: "Edit",
      boost: "Boost",
      viewStats: "View Stats",
      boosted: "Boosted",
      interested: "Interested",
      going: "Going",
      deleteConfirmTitle: "Delete Event",
      deleteConfirmDescription: "Are you sure you want to delete",
      deleteConfirmWarning: "This action cannot be undone.",
      cancel: "Cancel",
      confirmDelete: "Delete",
      tickets: "Tickets",
      ticketSalesTitle: "Ticket Sales",
      overview: "Overview",
      scanner: "Scanner",
      cannotDeleteWithTickets: "Cannot delete this event because there are completed ticket purchases.",
    },
  };

  const t = translations[language];

  const { data: events, isLoading } = useQuery({
    queryKey: ['business-events', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          realtime_stats (
            interested_count,
            going_count
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('business-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  const handleDelete = async (eventId: string) => {
    try {
      // Check if there are completed ticket orders for this event
      const { data: completedOrders, error: checkError } = await supabase
        .from('ticket_orders')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'completed')
        .limit(1);

      if (checkError) throw checkError;

      if (completedOrders && completedOrders.length > 0) {
        toast({
          title: t.error,
          description: t.cannotDeleteWithTickets,
          variant: "destructive",
        });
        return;
      }

      // Delete pending ticket orders first (no refund needed)
      await supabase
        .from('ticket_orders')
        .delete()
        .eq('event_id', eventId)
        .neq('status', 'completed');

      // Delete tickets associated with pending orders
      await supabase
        .from('tickets')
        .delete()
        .eq('event_id', eventId);

      // Now delete the event (other related tables have CASCADE)
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: t.success,
        description: t.eventDeleted,
      });

      queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (event: any) => {
    try {
      // Calculate new dates (add 7 days to original dates)
      const originalStart = new Date(event.start_at);
      const originalEnd = new Date(event.end_at);
      const newStart = new Date(originalStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const newEnd = new Date(originalEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('events')
        .insert({
          business_id: event.business_id,
          title: `${event.title} (Copy)`,
          description: event.description,
          category: event.category,
          location: event.location,
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString(),
          cover_image_url: event.cover_image_url,
          tags: event.tags,
          min_age_hint: event.min_age_hint,
          price_tier: event.price_tier,
          accepts_reservations: event.accepts_reservations,
          max_reservations: event.max_reservations,
          seating_options: event.seating_options,
          requires_approval: event.requires_approval,
        });

      if (error) throw error;

      toast({
        title: t.success,
        description: t.eventDuplicated,
      });

      queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const locale = language === "el" ? "el-GR" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">{t.loading}</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {t.noEvents}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => (
        <Card key={event.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{event.title}</h3>
                  <ActiveBoostBadge eventId={event.id} label={t.boosted} onViewStats={(boostId) => {
                    setSelectedBoostId(boostId);
                    setPerformanceDialogOpen(true);
                  }} />
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.start_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {event.realtime_stats?.[0]?.interested_count || 0} {t.interested.toLowerCase()}, {' '}
                      {event.realtime_stats?.[0]?.going_count || 0} {t.going.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {event.category?.map((cat) => (
                    <span
                      key={cat}
                      className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {/* Tickets button - only for ticket events */}
                {event.event_type === 'ticket' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTicketSalesEvent({ id: event.id, title: event.title })}
                    title={t.tickets}
                    aria-label={`${t.tickets} ${event.title}`}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Ticket className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBoostingEvent(event)}
                  title={t.boost}
                  aria-label={`Boost ${event.title}`}
                  className="text-primary hover:text-primary"
                >
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingEvent(event)}
                  title={t.edit}
                  aria-label={`Edit ${event.title}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDuplicate(event)}
                  title={t.duplicate}
                  aria-label={`Duplicate ${event.title}`}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingEvent({ id: event.id, title: event.title })}
                  className="text-destructive hover:text-destructive"
                  title={t.delete}
                  aria-label={`Delete ${event.title}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        ))}
      </div>

      {editingEvent && (
        <EventEditDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
          }}
        />
      )}

      {boostingEvent && (
        <EventBoostDialog
          open={!!boostingEvent}
          onOpenChange={(open) => !open && setBoostingEvent(null)}
          eventId={boostingEvent.id}
          eventTitle={boostingEvent.title}
          hasActiveSubscription={subscriptionData?.subscribed || false}
          remainingBudgetCents={subscriptionData?.monthly_budget_remaining_cents || 0}
        />
      )}

      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirmDescription} <strong>"{deletingEvent?.title}"</strong>? {t.deleteConfirmWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingEvent) {
                  handleDelete(deletingEvent.id);
                  setDeletingEvent(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Boost Performance Dialog */}
      <BoostPerformanceDialog
        boostId={selectedBoostId}
        open={performanceDialogOpen}
        onOpenChange={setPerformanceDialogOpen}
      />

      {/* Ticket Sales Dialog */}
      <Dialog open={!!ticketSalesEvent} onOpenChange={(open) => !open && setTicketSalesEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              {t.ticketSalesTitle} - {ticketSalesEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {ticketSalesEvent && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">{t.overview}</TabsTrigger>
                <TabsTrigger value="scanner">{t.scanner}</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <TicketSalesOverview eventId={ticketSalesEvent.id} />
              </TabsContent>
              <TabsContent value="scanner" className="mt-4">
                <TicketScanner eventId={ticketSalesEvent.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventsList;
