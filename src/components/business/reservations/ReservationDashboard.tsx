import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { KalivaStaffControls } from './KalivaStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarDays } from 'lucide-react';
import { isClubOrEventBusiness, isPerformanceBusiness } from '@/lib/isClubOrEventBusiness';

interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

interface EventOption {
  id: string;
  title: string;
  start_at: string;
  event_type: string | null;
  reservationCount: number;
}

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');
  const [isTicketLinked, setIsTicketLinked] = useState<boolean | null>(null);
  const [isPerformance, setIsPerformance] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEventIdRef = useRef<string | null>(null);
  const fetchEventsRequestRef = useRef(0);

  const text = useMemo(
    () => ({
      el: {
        reservations: 'Κρατήσεις',
        staffControl: 'Έλεγχος',
        settings: 'Ρυθμίσεις',
        list: 'Διαχείριση',
        selectEvent: 'Επιλέξτε εκδήλωση',
      },
      en: {
        reservations: 'Reservations',
        staffControl: 'Staff Control',
        settings: 'Settings',
        list: 'Reservation List',
        selectEvent: 'Select event',
      }
    }),
    []
  );

  const t = text[language];

  useEffect(() => {
    const checkLinked = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('ticket_reservation_linked, category')
        .eq('id', businessId)
        .maybeSingle();

      if (error) {
        console.error('Error checking reservation mode:', error);
        return;
      }

      const categories = data?.category || [];
      const linked = !!data?.ticket_reservation_linked || isClubOrEventBusiness(categories);
      setIsTicketLinked(linked);
      setIsPerformance(isPerformanceBusiness(categories));
    };
    checkLinked();
  }, [businessId]);

  // Fetch events for ticket-linked businesses
  const fetchEvents = useCallback(async () => {
    if (!isTicketLinked) return;

    const requestId = ++fetchEventsRequestRef.current;

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_at, event_type')
        .eq('business_id', businessId)
        .not('event_type', 'in', '("free","free_entry")')
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      if (eventsError) throw eventsError;
      if (requestId !== fetchEventsRequestRef.current) return;

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setSelectedEventId(null);
        return;
      }

      const eventIds = eventsData.map((e) => e.id);

      // Match list logic: count visible reservations only (exclude walk-in auto-created)
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('event_id')
        .in('event_id', eventIds)
        .or('auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null');

      if (reservationsError) throw reservationsError;
      if (requestId !== fetchEventsRequestRef.current) return;

      const counts: Record<string, number> = {};
      (reservations || []).forEach((r) => {
        if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });

      // For ticket-only events, count ticket orders instead
      const ticketOnlyEventIds = eventsData
        .filter((e) => e.event_type === 'ticket')
        .map((e) => e.id);

      if (ticketOnlyEventIds.length > 0) {
        const { data: ticketOrders, error: ticketOrdersError } = await supabase
          .from('ticket_orders')
          .select('event_id')
          .in('event_id', ticketOnlyEventIds)
          .eq('status', 'completed');

        if (ticketOrdersError) throw ticketOrdersError;
        if (requestId !== fetchEventsRequestRef.current) return;

        (ticketOrders || []).forEach((o) => {
          if (o.event_id) counts[o.event_id] = (counts[o.event_id] || 0) + 1;
        });
      }

      const options: EventOption[] = eventsData.map((e) => ({
        id: e.id,
        title: e.title,
        start_at: e.start_at,
        event_type: e.event_type,
        reservationCount: counts[e.id] || 0,
      }));

      setEvents(options);

      if (!selectedEventIdRef.current || !options.find((e) => e.id === selectedEventIdRef.current)) {
        setSelectedEventId(options[0]?.id || null);
      }
    } catch (error) {
      console.error('Error fetching reservation dashboard events:', error);
    }
  }, [isTicketLinked, businessId]);

  useEffect(() => {
    fetchEvents();
    if (!isTicketLinked) return;
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents, isTicketLinked]);

  // Realtime subscription to refresh counts
  useEffect(() => {
    if (!isTicketLinked) return;
    const channel = supabase
      .channel('dashboard_reservation_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isTicketLinked, fetchEvents]);

  const handleReservationCountChange = useCallback((count: number) => {
    if (!selectedEventId || !isTicketLinked) return;

    setEvents((prev) => {
      let changed = false;
      const next = prev.map((event) => {
        if (event.id !== selectedEventId) return event;
        if (event.reservationCount === count) return event;
        changed = true;
        return { ...event, reservationCount: count };
      });
      return changed ? next : prev;
    });
  }, [selectedEventId, isTicketLinked]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (isTicketLinked === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="min-w-0">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold shrink-0">
            {isPerformance ? (language === 'el' ? 'Εισιτήρια' : 'Tickets') : t.reservations}
          </h1>

          {/* Event selector for ticket-linked businesses */}
          {isTicketLinked && events.length > 0 && (
            <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
              <SelectTrigger className="h-9 text-sm w-auto min-w-[180px] max-w-xs rounded-lg border-border/30 bg-card/30 backdrop-blur-sm shadow-sm hover:bg-card/50 transition-colors gap-2 px-3">
                <SelectValue placeholder={t.selectEvent} />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {events.map((event) => {
                  const dateStr = new Date(event.start_at).toLocaleDateString(
                    language === 'el' ? 'el-GR' : 'en-US',
                    { day: 'numeric', month: 'long' }
                  );
                  return (
                    <SelectItem key={event.id} value={event.id} className="text-sm rounded-md">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
                        <span className="text-sm text-foreground/70">{dateStr}</span>
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/20 text-foreground text-[11px] font-bold px-1.5 min-w-[18px] h-[18px]">
                          {event.reservationCount}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
        <TabsList className="w-full flex gap-2 p-1 overflow-x-hidden">
          <TabsTrigger value="list" className="gap-2 flex-1 min-w-0">
            <span className="truncate">{t.list}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 flex-1 min-w-0">
            <span className="truncate">{t.staffControl}</span>
          </TabsTrigger>
          {!isTicketLinked && (
            <TabsTrigger value="settings" className="gap-2 flex-1 min-w-0">
              <span className="truncate">{t.settings}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <DirectReservationsList
            businessId={businessId}
            language={language}
            onReservationCountChange={isTicketLinked ? handleReservationCountChange : undefined}
            selectedEventId={isTicketLinked ? selectedEventId : undefined}
            selectedEventType={isTicketLinked ? (selectedEvent?.event_type || null) : null}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          {isTicketLinked ? (
            <KalivaStaffControls
              businessId={businessId}
              language={language}
              selectedEventId={selectedEventId}
            />
          ) : (
            <ReservationStaffControls businessId={businessId} language={language} />
          )}
        </TabsContent>

        {!isTicketLinked && (
          <TabsContent value="settings" className="mt-4">
            <ReservationSlotManager businessId={businessId} language={language} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
