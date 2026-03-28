import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { KalivaStaffControls } from './KalivaStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { isClubOrEventBusiness, isPerformanceBusiness } from '@/lib/isClubOrEventBusiness';
import { Button } from '@/components/ui/button';

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

type EventTypeTab = 'ticket' | 'reservation' | 'ticket_reservation';

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [isTicketLinked, setIsTicketLinked] = useState<boolean | null>(null);
  const [isPerformance, setIsPerformance] = useState(false);
  const [isDiningBar, setIsDiningBar] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventsHydrated, setEventsHydrated] = useState(false);
  const [activeTypeTab, setActiveTypeTab] = useState<EventTypeTab | null>(null);
  // For dining/bar: null means "direct reservations", a string means event-specific
  const [diningSelectedEventId, setDiningSelectedEventId] = useState<string | null>(null);
  const [diningEventsHydrated, setDiningEventsHydrated] = useState(false);
  const selectedEventIdRef = useRef<string | null>(null);
  const fetchEventsRequestRef = useRef(0);

  const text = useMemo(
    () => ({
      el: {
        pageTitle: 'Διαχείριση',
        reservations: 'Κρατήσεις',
        staffControl: 'Έλεγχος',
        settings: 'Ρυθμίσεις',
        list: 'Διαχείριση',
        selectEvent: 'Επιλέξτε εκδήλωση',
        directReservations: 'Κρατήσεις',
        events: 'Εκδηλώσεις',
        ticket: 'Εισιτήριο',
        reservation: 'Κράτηση',
        ticketReservation: 'Εισιτήριο & Κράτηση',
      },
      en: {
        pageTitle: 'Management',
        reservations: 'Reservations',
        staffControl: 'Control',
        settings: 'Settings',
        list: 'Management',
        selectEvent: 'Select event',
        directReservations: 'Reservations',
        events: 'Events',
        ticket: 'Ticket',
        reservation: 'Reservation',
        ticketReservation: 'Ticket & Reservation',
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
        setEvents((prev) => (prev.length ? [] : prev));
        setSelectedEventId(null);
        setEventsHydrated(true);
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

      const nextSelectedEventId =
        selectedEventIdRef.current && options.some((e) => e.id === selectedEventIdRef.current)
          ? selectedEventIdRef.current
          : (options[0]?.id || null);

      // Only update state if data actually changed to prevent visual refresh/flicker
      setEvents((prev) => {
        if (
          prev.length === options.length &&
          prev.every((p, i) =>
            p.id === options[i].id &&
            p.title === options[i].title &&
            p.start_at === options[i].start_at &&
            p.event_type === options[i].event_type &&
            p.reservationCount === options[i].reservationCount
          )
        ) {
          return prev;
        }
        return options;
      });

      if (nextSelectedEventId !== selectedEventIdRef.current) {
        setSelectedEventId(nextSelectedEventId);
      }

      setEventsHydrated(true);
    } catch (error) {
      console.error('Error fetching reservation dashboard events:', error);
      setEventsHydrated(true);
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
        setDiningEvents((prev) => (prev.length ? [] : prev));
        setDiningEventsHydrated(true);
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

      setDiningEvents((prev) => {
        if (
          prev.length === options.length &&
          prev.every((p, i) =>
            p.id === options[i].id &&
            p.title === options[i].title &&
            p.start_at === options[i].start_at &&
            p.event_type === options[i].event_type &&
            p.reservationCount === options[i].reservationCount
          )
        ) {
          return prev;
        }
        return options;
      });

      setDiningEventsHydrated(true);
    } catch (error) {
      console.error('Error fetching dining events:', error);
      setDiningEventsHydrated(true);
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

  // Group events by type for ticket-linked businesses
  const { ticketEvents, reservationEvents, hybridEvents, availableTabs } = useMemo(() => {
    const ticket = events.filter(e => e.event_type === 'ticket');
    const reservation = events.filter(e => e.event_type === 'reservation' || e.event_type === null);
    const hybrid = events.filter(e => e.event_type === 'ticket_reservation' || e.event_type === 'ticket_and_reservation');
    
    const tabs: EventTypeTab[] = [];
    if (ticket.length > 0) tabs.push('ticket');
    if (reservation.length > 0) tabs.push('reservation');
    if (hybrid.length > 0) tabs.push('ticket_reservation');
    
    return { ticketEvents: ticket, reservationEvents: reservation, hybridEvents: hybrid, availableTabs: tabs };
  }, [events]);

  // Auto-set activeTypeTab when tabs change
  useEffect(() => {
    if (!isTicketLinked || availableTabs.length === 0) return;
    
    setActiveTypeTab(prev => {
      if (prev && availableTabs.includes(prev)) return prev;
      return availableTabs[0];
    });
  }, [isTicketLinked, availableTabs]);

  // Get events for the active type tab
  const activeTabEvents = useMemo(() => {
    if (activeTypeTab === 'ticket') return ticketEvents;
    if (activeTypeTab === 'reservation') return reservationEvents;
    if (activeTypeTab === 'ticket_reservation') return hybridEvents;
    return [];
  }, [activeTypeTab, ticketEvents, reservationEvents, hybridEvents]);

  // Auto-select event when type tab changes
  useEffect(() => {
    if (!isTicketLinked || activeTabEvents.length === 0) return;
    
    const currentStillValid = selectedEventId && activeTabEvents.some(e => e.id === selectedEventId);
    if (!currentStillValid) {
      setSelectedEventId(activeTabEvents[0].id);
    }
  }, [isTicketLinked, activeTypeTab, activeTabEvents]);

  // Is a dining/bar business currently viewing an event?
  const isDiningEventMode = isDiningBar && !isTicketLinked && diningSelectedEventId !== null;

  const isHydratingHeader =
    isTicketLinked
      ? !eventsHydrated || (events.length > 0 && !selectedEventId)
      : isDiningBar
        ? !diningEventsHydrated
        : false;

  if (isTicketLinked === null || isHydratingHeader) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getEventTypeLabel = (eventType: string | null) => {
    if (eventType === 'ticket') return t.ticket;
    if (eventType === 'ticket_reservation') return t.ticketReservation;
    return t.reservation;
  };

  const getTypeTabLabel = (type: EventTypeTab) => {
    if (type === 'ticket') return t.ticket;
    if (type === 'reservation') return t.reservation;
    return t.ticketReservation;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="min-w-0 space-y-3">
        {/* Ticket-linked businesses: type tabs + per-tab dropdown */}
        {isTicketLinked && availableTabs.length > 0 && (
          <div className="space-y-3">
            {/* Type tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {availableTabs.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTypeTab(type)}
                  className={`h-9 px-4 text-sm font-medium rounded-full transition-all ${
                    activeTypeTab === type
                      ? 'bg-card text-foreground shadow-sm border border-border/50'
                      : 'text-foreground/50 hover:text-foreground/70'
                  }`}
                >
                  {getTypeTabLabel(type)}
                </button>
              ))}
            </div>

            {/* Per-tab event dropdown (only if 2+ events in active tab) */}
            {activeTabEvents.length > 1 && (
              <Select
                value={selectedEventId || ''}
                onValueChange={(val) => setSelectedEventId(val)}
              >
                <SelectTrigger className="h-9 text-sm w-auto min-w-[180px] max-w-xs rounded-full gap-2 px-4 transition-all bg-card text-foreground shadow-sm border border-border/50">
                  <SelectValue placeholder={t.selectEvent} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {activeTabEvents.map((event) => {
                    const dateStr = new Date(event.start_at).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      { day: 'numeric', month: 'long' }
                    );
                    return (
                      <SelectItem key={event.id} value={event.id} className="text-sm rounded-md">
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{dateStr}</span>
                          <span className="inline-flex items-center justify-center rounded-full border border-foreground/40 text-foreground text-[11px] font-bold px-1.5 min-w-[18px] h-[18px]">
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
        )}

        {/* Dining/bar businesses: badges layout (unchanged) */}
        {!isTicketLinked && (
          <div className="flex items-center gap-2">
            {isDiningBar && (
              <button
                onClick={() => { setDiningSelectedEventId(null); setActiveTab('list'); }}
                className={`h-9 px-4 text-sm font-medium rounded-full transition-all ${
                  diningSelectedEventId === null
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-foreground/50 hover:text-foreground/70'
                }`}
              >
                {t.directReservations}
              </button>
            )}

            {isDiningBar && diningEvents.length > 0 && (
              <Select
                value={diningSelectedEventId || ''}
                onValueChange={(val) => {
                  setDiningSelectedEventId(val);
                  setActiveTab('list');
                }}
              >
                <SelectTrigger className={`h-9 text-sm w-auto min-w-[180px] max-w-xs rounded-full gap-2 px-4 transition-all ${
                  diningSelectedEventId !== null
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-foreground/50 border-0 hover:text-foreground/70'
                }`}>
                  <SelectValue placeholder={t.events} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {diningEvents.map((event) => {
                    const dateStr = new Date(event.start_at).toLocaleDateString(
                      language === 'el' ? 'el-GR' : 'en-US',
                      { day: 'numeric', month: 'long' }
                    );
                    const typeLabel = getEventTypeLabel(event.event_type);
                    return (
                      <SelectItem key={event.id} value={event.id} className="text-sm rounded-md">
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{dateStr}</span>
                          <span className="text-xs text-foreground">({typeLabel})</span>
                          <span className="inline-flex items-center justify-center rounded-full border border-foreground/40 text-foreground text-[11px] font-bold px-1.5 min-w-[18px] h-[18px]">
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
        )}
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
