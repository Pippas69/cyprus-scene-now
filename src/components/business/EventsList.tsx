import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Calendar, MapPin, Users, Pencil, Rocket, Sparkles, Ticket, Grid3X3, Gift, Pause, Play } from "lucide-react";
import EventEditForm from "./EventEditForm";
import EventBoostDialog from "./EventBoostDialog";
import { BoostPerformanceDialog } from "./BoostPerformanceDialog";
import { useEventActiveBoost } from "@/hooks/useBoostAnalytics";
import { useEffect, useState } from "react";
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
import { TicketSalesOverview } from "@/components/tickets/TicketSalesOverview";
import { EventReservationOverview } from "./EventReservationOverview";


interface EventsListProps {
  businessId: string;
}

// Helper component to show active boost badge - positioned half in/half out above icons
const ActiveBoostBadge = ({ eventId, label }: { eventId: string; label: string }) => {
  const { activeBoost } = useEventActiveBoost(eventId);
  if (!activeBoost) return null;
  return (
    <Badge 
      variant="default" 
      className="absolute -top-2.5 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-white flex items-center gap-0.5 shadow-md cursor-default text-[9px] md:text-[10px] lg:text-xs h-5 md:h-6 px-1.5 md:px-2"
    >
      <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" />
      {label}
    </Badge>
  );
};

type EventFilter = 'all' | 'ticket' | 'reservation' | 'free_entry';

const EventsList = ({ businessId }: EventsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [boostingEvent, setBoostingEvent] = useState<any>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
  const [selectedBoostId, setSelectedBoostId] = useState<string | null>(null);
  const [ticketSalesEvent, setTicketSalesEvent] = useState<{ id: string; title: string } | null>(null);
  const [reservationEvent, setReservationEvent] = useState<{ id: string; title: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const [showExpired, setShowExpired] = useState(false);

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
      title: "Εκδηλώσεις",
      scanner: "Σαρωτής Εκδηλώσεων",
      loading: "Φόρτωση...",
      noEvents: "Δεν έχετε δημοσιεύσει καμία εκδήλωση ακόμα.",
      success: "Επιτυχία",
      eventDeleted: "Η εκδήλωση διαγράφηκε",
      error: "Σφάλμα",
      delete: "Διαγραφή",
      edit: "Επεξεργασία",
      boost: "Προώθηση",
      boosted: "Προωθείται",
      interested: "ενδιαφέρον",
      going: "θα πάνε",
      deleteConfirmTitle: "Διαγραφή Εκδήλωσης",
      deleteConfirmDescription: "Είστε σίγουροι ότι θέλετε να διαγράψετε την εκδήλωση",
      deleteConfirmWarning: "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.",
      cancel: "Ακύρωση",
      confirmDelete: "Διαγραφή",
      ticketSalesTitle: "Πωλήσεις Εισιτηρίων",
      reservationTitle: "Κρατήσεις Τραπεζιών",
      overview: "Επισκόπηση",
      cannotDeleteWithTickets: "Δεν μπορείτε να διαγράψετε αυτή την εκδήλωση γιατί υπάρχουν ολοκληρωμένες αγορές εισιτηρίων.",
      filterAll: "Όλα",
      filterTicket: "Εισιτήριο",
      filterReservation: "Κράτηση",
      filterFreeEntry: "Δωρεάν Είσοδος",
      badgeTicket: "Με Εισιτήριο",
      badgeReservation: "Κράτηση Τραπεζιού",
      badgeFreeEntry: "Δωρεάν Είσοδος",
      expired: "Ληγμένες",
      pause: "Παύση",
      active: "Ενεργή",
      eventPaused: "Η εκδήλωση είναι σε παύση",
      eventActivated: "Η εκδήλωση ενεργοποιήθηκε",
    },
    en: {
      title: "Events",
      scanner: "Events Scanner",
      loading: "Loading...",
      noEvents: "You haven't published any events yet.",
      success: "Success",
      eventDeleted: "Event deleted",
      error: "Error",
      delete: "Delete",
      edit: "Edit",
      boost: "Boost",
      boosted: "Boosted",
      interested: "interested",
      going: "going",
      deleteConfirmTitle: "Delete Event",
      deleteConfirmDescription: "Are you sure you want to delete",
      deleteConfirmWarning: "This action cannot be undone.",
      cancel: "Cancel",
      confirmDelete: "Delete",
      ticketSalesTitle: "Ticket Sales",
      reservationTitle: "Table Reservations",
      overview: "Overview",
      cannotDeleteWithTickets: "Cannot delete this event because there are completed ticket purchases.",
      filterAll: "All",
      filterTicket: "Tickets",
      filterReservation: "Reservation",
      filterFreeEntry: "Free Entry",
      badgeTicket: "With Ticket",
      badgeReservation: "Table Reservation",
      badgeFreeEntry: "Free Entry",
      expired: "Expired",
      pause: "Pause",
      active: "Active",
      eventPaused: "Event paused",
      eventActivated: "Event activated",
    },
  };

  const t = translations[language];

  const { data: events, isLoading } = useQuery({
    queryKey: ['business-events', businessId],
    queryFn: async () => {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('business_id', businessId)
        .order('start_at', { ascending: true });

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) return [];

      const eventIds = eventsData.map(e => e.id);
      const { data: countsData } = await supabase.rpc('get_event_rsvp_counts_bulk', {
        p_event_ids: eventIds
      });

      const countsMap = new Map<string, { interested_count: number; going_count: number }>();
      if (countsData) {
        countsData.forEach((c: any) => {
          countsMap.set(c.event_id, {
            interested_count: Number(c.interested_count) || 0,
            going_count: Number(c.going_count) || 0
          });
        });
      }

      return eventsData.map(event => ({
        ...event,
        rsvp_counts: countsMap.get(event.id) || { interested_count: 0, going_count: 0 }
      }));
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
      const { data: eventData, error: eventFetchError } = await supabase
        .from("events")
        .select("end_at")
        .eq("id", eventId)
        .single();

      if (eventFetchError) throw eventFetchError;

      const eventHasEnded = eventData && new Date(eventData.end_at) < new Date();

      const { data: completedOrders, error: checkError } = await supabase
        .from("ticket_orders")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "completed")
        .limit(1);

      if (checkError) throw checkError;

      if (completedOrders && completedOrders.length > 0 && !eventHasEnded) {
        toast({
          title: t.error,
          description: t.cannotDeleteWithTickets,
          variant: "destructive",
        });
        return;
      }

      const safeDeleteByEventId = async (table: string) => {
        const { count: existingCount, error: countError } = await (supabase as any)
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId);
        if (countError) throw countError;

        const { error: delError, count: deletedCount } = await (supabase as any)
          .from(table)
          .delete({ count: "exact" })
          .eq("event_id", eventId);
        if (delError) throw delError;

        if ((existingCount || 0) > 0 && (deletedCount || 0) === 0) {
          throw new Error(
            language === "el"
              ? "Δεν έχετε δικαίωμα να διαγράψετε όλα τα συνδεδεμένα δεδομένα (ασφάλεια/RLS)."
              : "You don't have permission to delete all dependent data (security/RLS)."
          );
        }
      };

      await safeDeleteByEventId("ticket_orders");
      await safeDeleteByEventId("tickets");
      await safeDeleteByEventId("rsvps");
      await safeDeleteByEventId("event_views");
      await safeDeleteByEventId("event_boosts");
      await safeDeleteByEventId("reservations");

      const { error, count } = await supabase
        .from("events")
        .delete({ count: "exact" })
        .eq("id", eventId)
        .eq("business_id", businessId);

      if (error) throw error;
      if (!count) {
        throw new Error(
          language === "el"
            ? "Δεν έχετε δικαίωμα διαγραφής ή η εκδήλωση δεν υπάρχει πλέον"
            : "You don't have permission to delete this event, or it no longer exists"
        );
      }

      toast({
        title: t.success,
        description: t.eventDeleted,
      });

      queryClient.invalidateQueries({ queryKey: ["business-events", businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error?.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  // Toggle event pause status
  const handleTogglePause = async (eventId: string, currentlyPaused: boolean) => {
    try {
      // Use appearance_mode to control visibility: 'hidden' = paused, 'always' = active
      const newMode = currentlyPaused ? 'always' : 'hidden';
      
      const { error } = await supabase
        .from('events')
        .update({ appearance_mode: newMode })
        .eq('id', eventId)
        .eq('business_id', businessId);

      if (error) throw error;

      toast({
        title: t.success,
        description: currentlyPaused ? t.eventActivated : t.eventPaused,
      });

      queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error?.message ?? String(error),
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

  const getEventType = (event: any): 'ticket' | 'reservation' | 'free_entry' => {
    if (event.event_type === 'ticket') return 'ticket';
    if (event.event_type === 'reservation' || event.accepts_reservations) return 'reservation';
    return 'free_entry';
  };

  // Check if event is expired (end_at has passed)
  const isEventExpired = (event: any) => {
    return new Date(event.end_at) < new Date();
  };

  // Filter and separate active vs expired events
  const typeFilteredEvents = events?.filter(event => {
    if (activeFilter === 'all') return true;
    return getEventType(event) === activeFilter;
  }) || [];

  const activeEvents = typeFilteredEvents.filter(event => !isEventExpired(event));
  const expiredEvents = typeFilteredEvents.filter(event => isEventExpired(event));

  // For display: active events first, then expired if showExpired is true
  const filteredEvents = showExpired ? [...activeEvents, ...expiredEvents] : activeEvents;

  if (isLoading) {
    return <div className="text-center py-8">{t.loading}</div>;
  }

  return (
    <>
      {/* Header with title only - scanner removed, use Unified QR Scanner in dashboard header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>

        {/* Expired toggle (same placement/behavior as Offers) */}
        {expiredEvents.length > 0 && (
          <Button
            variant={showExpired ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowExpired(!showExpired)}
            className="text-[11px] md:text-sm h-7 md:h-8 px-2.5 md:px-3 whitespace-nowrap flex-shrink-0 lg:text-base lg:h-9 lg:px-4"
          >
            {t.expired} ({expiredEvents.length})
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-nowrap gap-1 md:gap-2 mb-6 overflow-x-auto">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
          className={`text-[10px] md:text-xs lg:text-sm h-7 md:h-8 px-2 md:px-3 whitespace-nowrap flex-shrink-0 ${activeFilter === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {t.filterAll}
        </Button>
        <Button
          variant={activeFilter === 'ticket' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('ticket')}
          className={`text-[10px] md:text-xs lg:text-sm h-7 md:h-8 px-2 md:px-3 whitespace-nowrap flex-shrink-0 ${activeFilter === 'ticket' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}`}
        >
          <Ticket className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1 flex-shrink-0" />
          {t.filterTicket}
        </Button>
        <Button
          variant={activeFilter === 'reservation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('reservation')}
          className={`text-[10px] md:text-xs lg:text-sm h-7 md:h-8 px-2 md:px-3 whitespace-nowrap flex-shrink-0 ${activeFilter === 'reservation' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
        >
          <Grid3X3 className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1 flex-shrink-0" />
          {t.filterReservation}
        </Button>
        <Button
          variant={activeFilter === 'free_entry' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('free_entry')}
          className={`text-[10px] md:text-xs lg:text-sm h-7 md:h-8 px-2 md:px-3 whitespace-nowrap flex-shrink-0 ${activeFilter === 'free_entry' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90' : ''}`}
        >
          <Gift className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 mr-0.5 md:mr-1 flex-shrink-0" />
          {t.filterFreeEntry}
        </Button>
      </div>

      {(!events || events.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.noEvents}
            </p>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 && !showExpired && expiredEvents.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.noEvents}
            </p>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.noEvents}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const eventType = getEventType(event);
            const expired = isEventExpired(event);
            
            return (
              <Card key={event.id} className={`hover:shadow-md transition-shadow relative ${expired ? 'opacity-60' : ''}`}>
                {/* Boost badge - positioned half in/half out above icons */}
                <ActiveBoostBadge eventId={event.id} label={t.boosted} />
                
                <CardContent className="p-4">
                  {/* 2-row grid so delete icon aligns with RSVP counts line (tablet+mobile) */}
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                    {/* Row 1 - Left: Title + meta */}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold truncate">{event.title}</h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(event.start_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate max-w-[200px]">{event.venue_name || event.location}</span>
                        </div>

                        {eventType === 'ticket' && (
                          <Badge
                            className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer flex items-center gap-1"
                            onClick={() => setTicketSalesEvent({ id: event.id, title: event.title })}
                          >
                            <Ticket className="h-3 w-3" />
                            {t.badgeTicket}
                          </Badge>
                        )}
                        {eventType === 'reservation' && (
                          <Badge
                            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1"
                            onClick={() => setReservationEvent({ id: event.id, title: event.title })}
                          >
                            <Grid3X3 className="h-3 w-3" />
                            {t.badgeReservation}
                          </Badge>
                        )}
                        {eventType === 'free_entry' && (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            {t.badgeFreeEntry}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Row 1 - Right: Boost + Edit icons */}
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBoostingEvent(event)}
                        title={t.boost}
                        className="h-8 w-8 text-primary hover:text-primary"
                      >
                        <Rocket className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingEvent(event)}
                        title={t.edit}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Row 2 - Left: RSVP counts (last line) - smaller on mobile/tablet */}
                    <div className="flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                      <Users className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {event.rsvp_counts?.interested_count || 0} {t.interested}, {event.rsvp_counts?.going_count || 0} {t.going}
                      </span>
                    </div>

                    {/* Row 2 - Right: Pause/Active + Delete icons */}
                    <div className="flex items-center justify-end gap-1">
                      {/* Pause/Active toggle badge */}
                      {(() => {
                        const isPaused = event.appearance_mode === 'hidden';
                        return (
                          <Badge
                            variant={isPaused ? "secondary" : "outline"}
                            className={`cursor-pointer text-[9px] md:text-[10px] lg:text-xs h-5 md:h-6 px-1.5 md:px-2 flex items-center gap-0.5 ${
                              isPaused 
                                ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                                : 'border-amber-500 text-amber-600 hover:bg-amber-50'
                            }`}
                            onClick={() => handleTogglePause(event.id, isPaused)}
                          >
                            {isPaused ? (
                              <>
                                <Play className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                {t.active}
                              </>
                            ) : (
                              <>
                                <Pause className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                {t.pause}
                              </>
                            )}
                          </Badge>
                        );
                      })()}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingEvent({ id: event.id, title: event.title })}
                        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                        title={t.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Form */}
      {editingEvent && (
        <EventEditForm
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['business-events', businessId] });
          }}
        />
      )}

      {/* Boost Dialog */}
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

      {/* Delete Confirmation */}
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

      {/* Ticket Sales Dialog - Overview only (no scanner tab) */}
      <Dialog open={!!ticketSalesEvent} onOpenChange={(open) => !open && setTicketSalesEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-teal-600" />
              {t.ticketSalesTitle} - {ticketSalesEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {ticketSalesEvent && (
            <div className="mt-4">
              <TicketSalesOverview eventId={ticketSalesEvent.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reservation Stats Dialog - Overview only */}
      <Dialog open={!!reservationEvent} onOpenChange={(open) => !open && setReservationEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-blue-600" />
              {t.reservationTitle} - {reservationEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {reservationEvent && (
            <div className="mt-4">
              <EventReservationOverview eventId={reservationEvent.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default EventsList;
