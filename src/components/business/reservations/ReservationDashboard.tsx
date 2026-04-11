import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { KalivaStaffControls } from './KalivaStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Archive, ArchiveRestore, Search, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { isClubOrEventBusiness, isPerformanceBusiness } from '@/lib/isClubOrEventBusiness';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { format, addDays, subDays } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

interface EventOption {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  event_type: string | null;
  pay_at_door?: boolean;
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
  const [showArchived, setShowArchived] = useState(false);
  const [archivedEvents, setArchivedEvents] = useState<EventOption[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchArchivedEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, start_at, end_at, event_type, pay_at_door')
      .eq('business_id', businessId)
      .not('archived_at', 'is', null)
      .order('start_at', { ascending: false });
    if (data) {
      setArchivedEvents(data.map(e => ({ ...e, reservationCount: 0 })) as EventOption[]);
    }
  }, [businessId]);

  useEffect(() => {
    if (showArchived) fetchArchivedEvents();
  }, [showArchived, fetchArchivedEvents]);

  const archiveEvent = useCallback(async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .update({ archived_at: new Date().toISOString() } as any)
      .eq('id', eventId);
    if (error) {
      toast.error('Error archiving event');
      return;
    }
    toast.success(language === 'el' ? 'Αρχειοθετήθηκε' : 'Archived');
    fetchEvents();
    fetchDiningEvents();
  }, [language]);

  const restoreEvent = useCallback(async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .update({ archived_at: null } as any)
      .eq('id', eventId);
    if (error) {
      toast.error('Error restoring event');
      return;
    }
    toast.success(language === 'el' ? 'Επαναφέρθηκε' : 'Restored');
    fetchArchivedEvents();
  }, [language, fetchArchivedEvents]);
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
        tickets: 'Εισιτήρια',
        reservation: 'Κράτηση',
        reservations_plural: 'Κρατήσεις',
        ticketReservation: 'Εισιτήριο & Κράτηση',
        ticketReservations: 'Εισιτήρια & Κρατήσεις',
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
        tickets: 'Tickets',
        reservation: 'Reservation',
        reservations_plural: 'Reservations',
        ticketReservation: 'Ticket & Reservation',
        ticketReservations: 'Tickets & Reservations',
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
        .select('id, title, start_at, end_at, event_type, pay_at_door')
        .eq('business_id', businessId)
        .not('event_type', 'in', '("free","free_entry")')
        .is('archived_at', null)
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
        end_at: e.end_at,
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
        .select('id, title, start_at, end_at, event_type, pay_at_door')
        .eq('business_id', businessId)
        .not('event_type', 'in', '("free","free_entry")')
        .is('archived_at', null)
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
        end_at: e.end_at,
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
    const evts = type === 'ticket' ? ticketEvents : type === 'reservation' ? reservationEvents : hybridEvents;
    const plural = evts.length > 1;
    if (type === 'ticket') return plural ? t.tickets : t.ticket;
    if (type === 'reservation') return plural ? t.reservations_plural : t.reservation;
    return plural ? t.ticketReservations : t.ticketReservation;
  };

  const getTypeTabCount = (type: EventTypeTab) => {
    const evts = type === 'ticket' ? ticketEvents : type === 'reservation' ? reservationEvents : hybridEvents;
    return evts.reduce((sum, e) => sum + (e.reservationCount || 0), 0);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 w-full max-w-full overflow-x-hidden">
      {showArchived ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {language === 'el' ? 'Αρχειοθετημένες Εκδηλώσεις' : 'Archived Events'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1.5"
              onClick={() => setShowArchived(false)}
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              {language === 'el' ? 'Ενεργές' : 'Active'}
            </Button>
          </div>
          {archivedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 text-center py-8">
              {language === 'el' ? 'Δεν υπάρχουν αρχειοθετημένες εκδηλώσεις' : 'No archived events'}
            </p>
          ) : (
            <div className="space-y-2">
              {archivedEvents.map((event) => {
                const dateStr = new Date(event.start_at).toLocaleDateString(
                  language === 'el' ? 'el-GR' : 'en-US',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                );
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => restoreEvent(event.id)}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      {language === 'el' ? 'Επαναφορά' : 'Restore'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="min-w-0 space-y-3">
        {/* Ticket-linked businesses: unified dropdown badges per type */}
        {isTicketLinked && availableTabs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {availableTabs.map((type) => {
                const evts = type === 'ticket' ? ticketEvents : type === 'reservation' ? reservationEvents : hybridEvents;
                const totalCount = getTypeTabCount(type);
                const isActive = activeTypeTab === type;

                // Single event: simple button
                if (evts.length === 1) {
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setActiveTypeTab(type);
                        setSelectedEventId(evts[0].id);
                      }}
                      className={`h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-card text-foreground shadow-sm border border-border/50'
                          : 'text-foreground/50 hover:text-foreground/70'
                      }`}
                    >
                      {getTypeTabLabel(type)}
                      {totalCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full border border-foreground/40 text-foreground">
                          {totalCount}
                        </span>
                      )}
                    </button>
                  );
                }

                // Multiple events: dropdown badge
                return (
                  <Select
                    key={type}
                    value={isActive ? (selectedEventId || '') : ''}
                    onValueChange={(val) => {
                      setActiveTypeTab(type);
                      setSelectedEventId(val);
                    }}
                  >
                    <SelectTrigger
                      className={`h-8 sm:h-9 text-xs sm:text-sm w-auto min-w-0 max-w-[200px] rounded-full gap-1.5 px-2.5 sm:px-4 transition-all border ${
                        isActive
                          ? 'bg-card text-foreground shadow-sm border-border/50'
                          : 'text-foreground/50 border-transparent hover:text-foreground/70'
                      }`}
                    >
                      <span className="truncate">{getTypeTabLabel(type)}</span>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {evts.map((event) => {
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
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 border-border/50 ml-auto flex-shrink-0 ${searchOpen ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
                title={language === 'el' ? 'Αναζήτηση' : 'Search'}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 border-border/50 flex-shrink-0"
                onClick={() => setManualEntryOpen(true)}
                title={language === 'el' ? 'Προσθήκη' : 'Add'}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {searchOpen && (
              <div className="flex items-center gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'el' ? 'Αναζήτηση ονόματος...' : 'Search name...'}
                  className="h-8 text-sm rounded-full"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dining/bar businesses: badges layout */}
        {!isTicketLinked && (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isDiningBar && (
                <button
                  onClick={() => { setDiningSelectedEventId(null); setActiveTab('list'); }}
                  className={`h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap ${
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
                  <SelectTrigger className={`h-8 sm:h-9 text-xs sm:text-sm w-auto min-w-[140px] sm:min-w-[180px] max-w-xs rounded-full gap-2 px-3 sm:px-4 transition-all ${
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

              <Button
                variant="outline"
                size="sm"
                className={`rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 border-border/50 ml-auto flex-shrink-0 ${searchOpen ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
                title={language === 'el' ? 'Αναζήτηση' : 'Search'}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 border-border/50 flex-shrink-0"
                onClick={() => setManualEntryOpen(true)}
                title={language === 'el' ? 'Προσθήκη' : 'Add'}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {/* Date picker for filtering reservations */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-6 sm:h-9 sm:w-7 p-0"
                  onClick={() => setSelectedDate(prev => prev ? subDays(prev, 1) : subDays(new Date(), 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm rounded-full border-border/50 whitespace-nowrap"
                    >
                      {selectedDate
                        ? format(selectedDate, 'dd MMM', { locale: language === 'el' ? el : enUS })
                        : (language === 'el' ? 'Όλες' : 'All')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-2 border-b border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => { setSelectedDate(null); setDatePickerOpen(false); }}
                      >
                        {language === 'el' ? 'Εμφάνιση Όλων' : 'Show All'}
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={selectedDate || undefined}
                      onSelect={(date) => { setSelectedDate(date || null); setDatePickerOpen(false); }}
                      locale={language === 'el' ? el : enUS}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-6 sm:h-9 sm:w-7 p-0"
                  onClick={() => setSelectedDate(prev => prev ? addDays(prev, 1) : addDays(new Date(), 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {searchOpen && (
              <div className="flex items-center gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'el' ? 'Αναζήτηση ονόματος...' : 'Search name...'}
                  className="h-8 text-sm rounded-full"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </>
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
            <DirectReservationsList
              businessId={businessId}
              language={language}
              onReservationCountChange={undefined}
              selectedEventId={diningSelectedEventId}
              selectedEventType={diningSelectedEvent?.event_type || null}
              payAtDoor={diningSelectedEvent?.pay_at_door || false}
              forceEventMode
              manualEntryOpen={manualEntryOpen}
              onManualEntryOpenChange={setManualEntryOpen}
              searchQuery={searchQuery}
              selectedDate={selectedDate}
            />
          ) : (
            <DirectReservationsList
              businessId={businessId}
              language={language}
              onReservationCountChange={isTicketLinked ? handleReservationCountChange : undefined}
              selectedEventId={isTicketLinked ? selectedEventId : undefined}
              selectedEventType={isTicketLinked ? (selectedEvent?.event_type || null) : null}
              payAtDoor={isTicketLinked ? (selectedEvent?.pay_at_door || false) : false}
              manualEntryOpen={manualEntryOpen}
              onManualEntryOpenChange={setManualEntryOpen}
              searchQuery={searchQuery}
              selectedDate={!isTicketLinked ? selectedDate : null}
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

      {/* Archive button for ended events — only shows 12h after end_at */}
      {(() => {
        const eventToArchive = isTicketLinked ? selectedEvent : (isDiningEventMode ? diningSelectedEvent : null);
        if (!eventToArchive) return null;
        const twelveHoursAfterEnd = new Date(new Date(eventToArchive.end_at).getTime() + 12 * 60 * 60 * 1000);
        if (new Date() < twelveHoursAfterEnd) return null;
        return (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground"
              onClick={() => archiveEvent(eventToArchive.id)}
            >
              <Archive className="h-3.5 w-3.5" />
              {language === 'el' ? 'Αρχειοθέτηση εκδήλωσης' : 'Archive event'}
            </Button>
          </div>
        );
      })()}

      {/* Archive toggle — bottom right */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1.5"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {showArchived 
            ? (language === 'el' ? 'Ενεργές' : 'Active')
            : (language === 'el' ? 'Αρχειοθετημένα' : 'Archived')
          }
        </Button>
      </div>
      </>
      )}
    </div>
  );
};
