import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Armchair } from 'lucide-react';

interface KalivaStaffControlsProps {
  businessId: string;
  language: 'el' | 'en';
}

interface EventWithControls {
  id: string;
  title: string;
  start_at: string;
  seatingTypes: {
    id: string;
    seating_type: string;
    available_slots: number;
    paused: boolean;
    actualBooked: number;
  }[];
  ticketTiers: {
    id: string;
    name: string;
    quantity_total: number;
    active: boolean;
    actualSold: number;
  }[];
}

const text = {
  el: {
    title: 'Διαχείριση Διαθεσιμότητας',
    description: 'Διαχειριστείτε τη διαθεσιμότητα σε πραγματικό χρόνο',
    refresh: 'Ανανέωση',
    tables: 'ΤΡΑΠΕΖΙΑ',
    tickets: 'Εισιτηρια',
    open: 'Ανοιχτό',
    closed: 'Κλειστό',
    noEvents: 'Δεν υπάρχουν ενεργές εκδηλώσεις',
    updated: 'Ενημερώθηκε',
    error: 'Σφάλμα'
  },
  en: {
    title: 'Availability Management',
    description: 'Manage availability in real-time',
    refresh: 'Refresh',
    tables: 'Tables',
    tickets: 'Tickets',
    open: 'Open',
    closed: 'Closed',
    noEvents: 'No active events',
    updated: 'Updated',
    error: 'Error'
  }
};

export const KalivaStaffControls = ({ businessId, language }: KalivaStaffControlsProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventWithControls[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const t = text[language];

  const fetchData = useCallback(async () => {
    try {
      // Get upcoming events for this business
      const { data: eventsData } = await supabase.
      from('events').
      select('id, title, start_at').
      eq('business_id', businessId).
      gte('end_at', new Date().toISOString()).
      order('start_at', { ascending: true });

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      const eventIds = eventsData.map((e) => e.id);

      // Fetch seating types, ticket tiers, real reservation counts, real ticket counts in parallel
      const [seatingRes, tiersRes, reservationsRes, ticketsRes] = await Promise.all([
      supabase.
      from('reservation_seating_types').
      select('id, event_id, seating_type, available_slots, paused').
      in('event_id', eventIds),
      supabase.
      from('ticket_tiers').
      select('id, event_id, name, quantity_total, active').
      in('event_id', eventIds),
      supabase.
      from('reservations').
      select('event_id, seating_type_id').
      in('event_id', eventIds).
      in('status', ['pending', 'accepted']),
      supabase.
      from('tickets').
      select('tier_id').
      in('status', ['valid', 'used'])]
      );

      const seatingTypes = seatingRes.data || [];
      const ticketTiers = tiersRes.data || [];
      const reservations = reservationsRes.data || [];
      const tickets = ticketsRes.data || [];

      // Count reservations per seating type
      const reservationCounts: Record<string, number> = {};
      reservations.forEach((r) => {
        const key = r.seating_type_id;
        if (key) reservationCounts[key] = (reservationCounts[key] || 0) + 1;
      });

      // Count tickets per tier
      const tierIds = ticketTiers.map((t) => t.id);
      const ticketCounts: Record<string, number> = {};
      tickets.forEach((t) => {
        if (tierIds.includes(t.tier_id)) {
          ticketCounts[t.tier_id] = (ticketCounts[t.tier_id] || 0) + 1;
        }
      });

      const enrichedEvents: EventWithControls[] = eventsData.map((event) => ({
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        seatingTypes: seatingTypes.
        filter((st) => st.event_id === event.id).
        map((st) => ({
          id: st.id,
          seating_type: st.seating_type,
          available_slots: st.available_slots,
          paused: st.paused ?? false,
          actualBooked: reservationCounts[st.id] || 0
        })),
        ticketTiers: ticketTiers.
        filter((tt) => tt.event_id === event.id).
        map((tt) => ({
          id: tt.id,
          name: tt.name,
          quantity_total: tt.quantity_total,
          active: tt.active,
          actualSold: ticketCounts[tt.id] || 0
        }))
      }));

      setEvents(enrichedEvents);
    } catch (error) {
      console.error('Error fetching Kaliva staff data:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleSeatingType = async (id: string, currentPaused: boolean) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.
      from('reservation_seating_types').
      update({ paused: !currentPaused }).
      eq('id', id);
      if (error) throw error;
      toast.success(t.updated);
      await fetchData();
    } catch {
      toast.error(t.error);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleTicketTier = async (id: string, currentActive: boolean) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.
      from('ticket_tiers').
      update({ active: !currentActive }).
      eq('id', id);
      if (error) throw error;
      toast.success(t.updated);
      await fetchData();
    } catch {
      toast.error(t.error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>);

  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base">{t.title}</CardTitle>
              

              
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">
              
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1.5">{t.refresh}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {events.length === 0 ?
          <div className="text-center py-8 bg-muted/50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">{t.noEvents}</p>
            </div> :

          events.map((event) =>
          <div key={event.id} className="space-y-3">
                {/* Event title */}
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm sm:text-base">{event.title}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {new Date(event.start_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
                  </p>
                </div>

                {/* Seating types toggles */}
                {event.seatingTypes.length > 0 &&
            <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t.tables}
                    </div>
                    <div className="space-y-2">
                      {event.seatingTypes.map((st) => {
                  const remaining = Math.max(st.available_slots - st.actualBooked, 0);
                  const isOpen = !st.paused;
                  return (
                    <div
                      key={st.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isOpen ?
                      'border-green-500/30 bg-green-500/5' :
                      'border-red-500/30 bg-red-500/5'}`
                      }>
                      
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm capitalize truncate">{st.seating_type}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {st.actualBooked}/{st.available_slots} — {remaining} {language === 'el' ? 'διαθέσιμα' : 'available'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className={`text-[10px] sm:text-xs font-medium ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                                {isOpen ? t.open : t.closed}
                              </span>
                              {updatingId === st.id ?
                        <Loader2 className="h-4 w-4 animate-spin" /> :

                        <Switch
                          checked={isOpen}
                          onCheckedChange={() => toggleSeatingType(st.id, st.paused)} />

                        }
                            </div>
                          </div>);

                })}
                    </div>
                  </div>
            }

                {/* Ticket tiers toggles */}
                {event.ticketTiers.length > 0 &&
            <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      
                      {t.tickets}
                    </div>
                    <div className="space-y-2">
                      {event.ticketTiers.map((tt) => {
                  const remaining = Math.max(tt.quantity_total - tt.actualSold, 0);
                  return (
                    <div
                      key={tt.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      tt.active ?
                      'border-green-500/30 bg-green-500/5' :
                      'border-red-500/30 bg-red-500/5'}`
                      }>
                      
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{tt.name}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {tt.actualSold}/{tt.quantity_total} — {remaining} {language === 'el' ? 'διαθέσιμα' : 'available'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className={`text-[10px] sm:text-xs font-medium ${tt.active ? 'text-green-500' : 'text-red-500'}`}>
                                {tt.active ? t.open : t.closed}
                              </span>
                              {updatingId === tt.id ?
                        <Loader2 className="h-4 w-4 animate-spin" /> :

                        <Switch
                          checked={tt.active}
                          onCheckedChange={() => toggleTicketTier(tt.id, tt.active)} />

                        }
                            </div>
                          </div>);

                })}
                    </div>
                  </div>
            }
              </div>
          )
          }
        </CardContent>
      </Card>
    </div>);

};