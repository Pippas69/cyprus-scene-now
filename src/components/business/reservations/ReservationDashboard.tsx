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
  const [isDiningBar, setIsDiningBar] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // For dining/bar: null means "direct reservations", a string means event-specific
  const [diningSelectedEventId, setDiningSelectedEventId] = useState<string | null>(null);
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
        directReservations: 'Κρατήσεις',
        events: 'Εκδηλώσεις',
      },
      en: {
        reservations: 'Reservations',
        staffControl: 'Control',
        settings: 'Settings',
        list: 'Management',
        selectEvent: 'Select event',
        directReservations: 'Reservations',
        events: 'Events',
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
      
      // Check if this is a dining/bar business (has offers capability = not club/event/performance)
      const normalizedCats = categories.map((c: string) => c.toLowerCase());
      const noOffersCats = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];
      const isDining = !normalizedCats.some((c: string) => noOffersCats.includes(c));
      setIsDiningBar(isDining);
    };
    checkLinked();
  }, [businessId]);

  // Keep ref in sync with state
  useEffect(() => { selectedEventIdRef.current = selectedEventId; }, [selectedEventId]);

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
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', ticketOnlyEventIds)
          .in('status', ['valid', 'used']);

        if (ticketsError) throw ticketsError;
        if (requestId !== fetchEventsRequestRef.current) return;

        (tickets || []).forEach((t) => {
          if (t.event_id) counts[t.event_id] = (counts[t.event_id] || 0) + 1;
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

  // Fetch events for dining/bar businesses (non-ticket-linked)
  const [diningEvents, setDiningEvents] = useState<EventOption[]>([]);
  const diningFetchRef = useRef(0);

  const fetchDiningEvents = useCallback(async () => {
    if (!isDiningBar || isTicketLinked) return;

    const requestId = ++diningFetchRef.current;

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_at, event_type')
        .eq('business_id', businessId)
        .not('event_type', 'in', '("free","free_entry")')
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      if (eventsError) throw eventsError;
      if (requestId !== diningFetchRef.current) return;

      if (!eventsData || eventsData.length === 0) {
        setDiningEvents([]);
        return;
      }

      const eventIds = eventsData.map((e) => e.id);

      // Count reservations per event
      const { data: reservations } = await supabase
        .from('reservations')
        .select('event_id')
        .in('event_id', eventIds);

      if (requestId !== diningFetchRef.current) return;

      const counts: Record<string, number> = {};
      (reservations || []).forEach((r) => {
        if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });

      // For ticket-only events, count tickets
      const ticketOnlyIds = eventsData
        .filter((e) => e.event_type === 'ticket')
        .map((e) => e.id);

      if (ticketOnlyIds.length > 0) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', ticketOnlyIds)
          .in('status', ['valid', 'used']);

        if (requestId !== diningFetchRef.current) return;

        (tickets || []).forEach((t) => {
          if (t.event_id) counts[t.event_id] = (counts[t.event_id] || 0) + 1;
        });
      }

      const options: EventOption[] = eventsData.map((e) => ({
        id: e.id,
        title: e.title,
        start_at: e.start_at,
        event_type: e.event_type,
        reservationCount: counts[e.id] || 0,
      }));

      setDiningEvents(options);
    } catch (error) {
      console.error('Error fetching dining events:', error);
    }
  }, [isDiningBar, isTicketLinked, businessId]);

  useEffect(() => {
    fetchEvents();
    if (!isTicketLinked) return;
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents, isTicketLinked]);

  useEffect(() => {
    fetchDiningEvents();
    if (!isDiningBar || isTicketLinked) return;
    const interval = setInterval(fetchDiningEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchDiningEvents, isDiningBar, isTicketLinked]);

  // Realtime subscription to refresh counts
  useEffect(() => {
    if (!isTicketLinked) return;
    const channel = supabase
      .channel('dashboard_reservation_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isTicketLinked, fetchEvents]);

  // Realtime for dining events
  useEffect(() => {
    if (!isDiningBar || isTicketLinked) return;
    const channel = supabase
      .channel('dashboard_dining_reservation_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchDiningEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDiningBar, isTicketLinked, fetchDiningEvents]);

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
  const diningSelectedEvent = diningEvents.find(e => e.id === diningSelectedEventId);

  // Is a dining/bar business currently viewing an event?
  const isDiningEventMode = isDiningBar && !isTicketLinked && diningSelectedEventId !== null;

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

          {/* Event selector for ticket-linked businesses (clubs/events/performances) */}
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

          {/* Event selector for dining/bar businesses */}
          {!isTicketLinked && isDiningBar && diningEvents.length > 0 && (
            <Select 
              value={diningSelectedEventId || '__direct__'} 
              onValueChange={(val) => {
                setDiningSelectedEventId(val === '__direct__' ? null : val);
                setActiveTab('list');
              }}
            >
              <SelectTrigger className="h-9 text-sm w-auto min-w-[180px] max-w-xs rounded-lg border-border/30 bg-card/30 backdrop-blur-sm shadow-sm hover:bg-card/50 transition-colors gap-2 px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="__direct__" className="text-sm rounded-md">
                  <span className="text-sm">{t.events}</span>
                </SelectItem>
                {diningEvents.map((event) => {
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
          {/* Show settings tab only for direct reservations (not event mode) */}
          {!isTicketLinked && !isDiningEventMode && (
            <TabsTrigger value="settings" className="gap-2 flex-1 min-w-0">
              <span className="truncate">{t.settings}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {isDiningEventMode ? (
            // Dining/bar viewing an event → show event-specific reservations (full event mode)
            <DirectReservationsList
              businessId={businessId}
              language={language}
              onReservationCountChange={undefined}
              selectedEventId={diningSelectedEventId}
              selectedEventType={diningSelectedEvent?.event_type || null}
              forceEventMode
            />
          ) : (
            <DirectReservationsList
              businessId={businessId}
              language={language}
              onReservationCountChange={isTicketLinked ? handleReservationCountChange : undefined}
              selectedEventId={isTicketLinked ? selectedEventId : undefined}
              selectedEventType={isTicketLinked ? (selectedEvent?.event_type || null) : null}
            />
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          {isTicketLinked ? (
            <KalivaStaffControls
              businessId={businessId}
              language={language}
              selectedEventId={selectedEventId}
            />
          ) : isDiningEventMode ? (
            <KalivaStaffControls
              businessId={businessId}
              language={language}
              selectedEventId={diningSelectedEventId}
            />
          ) : (
            <ReservationStaffControls businessId={businessId} language={language} />
          )}
        </TabsContent>

        {!isTicketLinked && !isDiningEventMode && (
          <TabsContent value="settings" className="mt-4">
            <ReservationSlotManager businessId={businessId} language={language} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
