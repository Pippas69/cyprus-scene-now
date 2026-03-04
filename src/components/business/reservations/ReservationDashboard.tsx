import { useEffect, useMemo, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { KalivaStaffControls } from './KalivaStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarDays } from 'lucide-react';
import { isClubOrEventBusiness } from '@/lib/isClubOrEventBusiness';

interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

interface EventOption {
  id: string;
  title: string;
  start_at: string;
  reservationCount: number;
}

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');
  const [isTicketLinked, setIsTicketLinked] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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
      const { data } = await supabase
        .from('businesses')
        .select('ticket_reservation_linked, category')
        .eq('id', businessId)
        .single();
      const linked = !!data?.ticket_reservation_linked || isClubOrEventBusiness(data?.category || []);
      setIsTicketLinked(linked);
    };
    checkLinked();
  }, [businessId]);

  // Fetch events for ticket-linked businesses
  const fetchEvents = useCallback(async () => {
    if (!isTicketLinked) return;

    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, start_at')
      .eq('business_id', businessId)
      .gte('end_at', new Date().toISOString())
      .order('start_at', { ascending: true });

    if (!eventsData || eventsData.length === 0) {
      setEvents([]);
      setSelectedEventId(null);
      return;
    }

    const eventIds = eventsData.map(e => e.id);

    // Get reservation counts per event
    const { data: reservations } = await supabase
      .from('reservations')
      .select('event_id')
      .in('event_id', eventIds)
      .in('status', ['pending', 'accepted']);

    const counts: Record<string, number> = {};
    (reservations || []).forEach(r => {
      if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
    });

    const options: EventOption[] = eventsData.map(e => ({
      id: e.id,
      title: e.title,
      start_at: e.start_at,
      reservationCount: counts[e.id] || 0,
    }));

    setEvents(options);

    if (!selectedEventId || !options.find(e => e.id === selectedEventId)) {
      setSelectedEventId(options[0]?.id || null);
    }
  }, [isTicketLinked, businessId, selectedEventId]);

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
            {t.reservations}
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
                    { day: 'numeric', month: 'short' }
                  );
                  return (
                    <SelectItem key={event.id} value={event.id} className="text-sm rounded-md">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{event.title}</span>
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
            selectedEventId={isTicketLinked ? selectedEventId : undefined}
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
