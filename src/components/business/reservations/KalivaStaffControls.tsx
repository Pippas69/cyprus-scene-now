import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Edit2, Check, X } from 'lucide-react';

interface KalivaStaffControlsProps {
  businessId: string;
  language: 'el' | 'en';
  selectedEventId?: string | null;
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
    error: 'Σφάλμα',
    selectEvent: 'Επιλέξτε εκδήλωση',
    saved: 'Αποθηκεύτηκε!',
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
    error: 'Error',
    selectEvent: 'Select event',
    saved: 'Saved!',
  }
};

export const KalivaStaffControls = ({ businessId, language, selectedEventId: externalSelectedEventId }: KalivaStaffControlsProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventWithControls[]>([]);
  // Use external selectedEventId from parent if provided
  const [internalSelectedEventId, setInternalSelectedEventId] = useState<string | null>(null);
  const selectedEventId = externalSelectedEventId ?? internalSelectedEventId;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; type: 'seating' | 'tier' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const t = text[language];

  const fetchData = useCallback(async () => {
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_at')
        .eq('business_id', businessId)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      const eventIds = eventsData.map((e) => e.id);

      const [seatingRes, tiersRes, reservationsRes, ticketsRes] = await Promise.all([
        supabase.from('reservation_seating_types').select('id, event_id, seating_type, available_slots, paused').in('event_id', eventIds),
        supabase.from('ticket_tiers').select('id, event_id, name, quantity_total, active').in('event_id', eventIds),
        supabase.from('reservations').select('event_id, seating_type_id').in('event_id', eventIds).in('status', ['pending', 'accepted']),
        supabase.from('tickets').select('tier_id').in('status', ['valid', 'used']),
      ]);

      const seatingTypes = seatingRes.data || [];
      const ticketTiers = tiersRes.data || [];
      const reservations = reservationsRes.data || [];
      const tickets = ticketsRes.data || [];

      const reservationCounts: Record<string, number> = {};
      reservations.forEach((r) => {
        const key = r.seating_type_id;
        if (key) reservationCounts[key] = (reservationCounts[key] || 0) + 1;
      });

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
        seatingTypes: seatingTypes
          .filter((st) => st.event_id === event.id)
          .map((st) => ({
            id: st.id,
            seating_type: st.seating_type,
            available_slots: st.available_slots,
            paused: st.paused ?? false,
            actualBooked: reservationCounts[st.id] || 0,
          })),
        ticketTiers: ticketTiers
          .filter((tt) => tt.event_id === event.id)
          .map((tt) => ({
            id: tt.id,
            name: tt.name,
            quantity_total: tt.quantity_total,
            active: tt.active,
            actualSold: ticketCounts[tt.id] || 0,
          })),
      }));

      setEvents(enrichedEvents);

      // Auto-select first event if none selected or selected event no longer exists (only for internal mode)
      if (!externalSelectedEventId && (!internalSelectedEventId || !enrichedEvents.find(e => e.id === internalSelectedEventId))) {
        setInternalSelectedEventId(enrichedEvents[0]?.id || null);
      }
    } catch (error) {
      console.error('Error fetching Kaliva staff data:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedEventId]);

  useEffect(() => {
    if (!editingField) {
      fetchData();
    }
    // Pause auto-refresh while editing to prevent re-render shifting
    if (editingField) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, editingField]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleSeatingType = async (id: string, currentPaused: boolean) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('reservation_seating_types').update({ paused: !currentPaused }).eq('id', id);
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
      const { error } = await supabase.from('ticket_tiers').update({ active: !currentActive }).eq('id', id);
      if (error) throw error;
      toast.success(t.updated);
      await fetchData();
    } catch {
      toast.error(t.error);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEdit = (id: string, type: 'seating' | 'tier', currentValue: number) => {
    setEditingField({ id, type });
    setEditValue(String(currentValue));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const newVal = parseInt(editValue);
    if (isNaN(newVal) || newVal < 0) {
      cancelEdit();
      return;
    }

    try {
      if (editingField.type === 'seating') {
        const { error } = await supabase
          .from('reservation_seating_types')
          .update({ available_slots: newVal })
          .eq('id', editingField.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticket_tiers')
          .update({ quantity_total: newVal })
          .eq('id', editingField.id);
        if (error) throw error;
      }
      toast.success(t.saved);
      await fetchData();
    } catch {
      toast.error(t.error);
    } finally {
      cancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

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
              className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1.5">{t.refresh}</span>
            </Button>
          </div>

          {/* Event selector - only show when multiple events and no external selector */}
          {!externalSelectedEventId && events.length > 1 && (
            <div className="mt-3">
              <Select value={selectedEventId || ''} onValueChange={setInternalSelectedEventId}>
                <SelectTrigger className="h-8 text-xs sm:text-sm">
                  <SelectValue placeholder={t.selectEvent} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id} className="text-xs sm:text-sm">
                      {event.title} — {new Date(event.start_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                        day: 'numeric', month: 'short',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-8 bg-muted/50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">{t.noEvents}</p>
            </div>
          ) : selectedEvent ? (
            <div className="space-y-3">
              {/* Event title (only when single event) */}
              {events.length === 1 && (
                <div className="border-b border-border pb-2">
                  <h3 className="font-semibold text-sm sm:text-base">{selectedEvent.title}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {new Date(selectedEvent.start_at).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {/* Seating types */}
              {selectedEvent.seatingTypes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.tables}
                  </div>
                  <div className="space-y-2">
                    {selectedEvent.seatingTypes.map((st) => {
                      const remaining = Math.max(st.available_slots - st.actualBooked, 0);
                      const isOpen = !st.paused;
                      const isEditing = editingField?.id === st.id && editingField?.type === 'seating';

                      return (
                        <div
                          key={st.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isOpen ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm capitalize truncate">{st.seating_type}</p>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                              <span>{st.actualBooked}/</span>
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    value={editValue}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '' || /^\d+$/.test(v)) setEditValue(v);
                                    }}
                                    className="h-5 w-14 text-xs px-1 rounded border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                    inputMode="numeric"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit();
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                  />
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={saveEdit}>
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={cancelEdit}>
                                    <X className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline inline-flex items-center gap-0.5"
                                  onClick={() => startEdit(st.id, 'seating', st.available_slots)}
                                >
                                  {st.available_slots}
                                  <Edit2 className="h-2.5 w-2.5 opacity-50" />
                                </span>
                              )}
                              <span>— {remaining} {language === 'el' ? 'διαθέσιμα' : 'available'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={`text-[10px] sm:text-xs font-medium ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                              {isOpen ? t.open : t.closed}
                            </span>
                            {updatingId === st.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Switch checked={isOpen} onCheckedChange={() => toggleSeatingType(st.id, st.paused)} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ticket tiers */}
              {selectedEvent.ticketTiers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.tickets}
                  </div>
                  <div className="space-y-2">
                    {selectedEvent.ticketTiers.map((tt) => {
                      const remaining = Math.max(tt.quantity_total - tt.actualSold, 0);
                      const isEditing = editingField?.id === tt.id && editingField?.type === 'tier';

                      return (
                        <div
                          key={tt.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            tt.active ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{tt.name}</p>
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                              <span>{tt.actualSold}/</span>
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    value={editValue}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '' || /^\d+$/.test(v)) setEditValue(v);
                                    }}
                                    className="h-5 w-14 text-xs px-1 rounded border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                    inputMode="numeric"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit();
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                  />
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={saveEdit}>
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={cancelEdit}>
                                    <X className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline inline-flex items-center gap-0.5"
                                  onClick={() => startEdit(tt.id, 'tier', tt.quantity_total)}
                                >
                                  {tt.quantity_total}
                                  <Edit2 className="h-2.5 w-2.5 opacity-50" />
                                </span>
                              )}
                              <span>— {remaining} {language === 'el' ? 'διαθέσιμα' : 'available'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={`text-[10px] sm:text-xs font-medium ${tt.active ? 'text-green-500' : 'text-red-500'}`}>
                              {tt.active ? t.open : t.closed}
                            </span>
                            {updatingId === tt.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Switch checked={tt.active} onCheckedChange={() => toggleTicketTier(tt.id, tt.active)} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
