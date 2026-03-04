import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';

interface KalivaStaffControlsProps {
  businessId: string;
  language: 'el' | 'en';
  selectedEventId?: string | null;
}

interface SeatingTypeTier {
  id: string;
  seating_type_id: string;
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
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
    tiers: SeatingTypeTier[];
  }[];
  ticketTiers: {
    id: string;
    name: string;
    quantity_total: number;
    active: boolean;
    actualSold: number;
  }[];
}

interface RangeDraft {
  min_people: string;
  max_people: string;
  prepaid_min_charge_eur: string;
}

const text = {
  el: {
    title: 'Διαχείριση Διαθεσιμότητας',
    description: 'Διαχειριστείτε τη διαθεσιμότητα σε πραγματικό χρόνο',
    refresh: 'Ανανέωση',
    tables: 'ΤΡΑΠΕΖΙΑ',
    tickets: 'ΕΙΣΙΤΗΡΙΑ (Walk-ins)',
    open: 'Ανοιχτό',
    closed: 'Κλειστό',
    noEvents: 'Δεν υπάρχουν ενεργές εκδηλώσεις',
    updated: 'Ενημερώθηκε',
    error: 'Σφάλμα',
    selectEvent: 'Επιλέξτε εκδήλωση',
    saved: 'Αποθηκεύτηκε!',
    editRanges: 'Εύρος & Τιμή',
    editRangesTitle: 'Επεξεργασία Εύρους Ατόμων & Τιμής',
    rangeHint: 'Έως 3 εύρη ανά τύπο. Το ποσό αφορά όλη την παρέα.',
    addRange: 'Προσθήκη εύρους',
    invalidRange: 'Συμπληρώστε σωστά min/max και τιμή.',
    save: 'Αποθήκευση',
    cancel: 'Ακύρωση',
  },
  en: {
    title: 'Availability Management',
    description: 'Manage availability in real-time',
    refresh: 'Refresh',
    tables: 'Tables',
    tickets: 'Tickets (Walk-ins)',
    open: 'Open',
    closed: 'Closed',
    noEvents: 'No active events',
    updated: 'Updated',
    error: 'Error',
    selectEvent: 'Select event',
    saved: 'Saved!',
    editRanges: 'Range & Price',
    editRangesTitle: 'Edit Party Range & Price',
    rangeHint: 'Up to 3 ranges per type. Price is for the whole group.',
    addRange: 'Add range',
    invalidRange: 'Please enter valid min/max and price values.',
    save: 'Save',
    cancel: 'Cancel',
  }
};

export const KalivaStaffControls = ({ businessId, language, selectedEventId: externalSelectedEventId }: KalivaStaffControlsProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventWithControls[]>([]);
  const [internalSelectedEventId, setInternalSelectedEventId] = useState<string | null>(null);
  const selectedEventId = externalSelectedEventId ?? internalSelectedEventId;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [rangeEditorSeating, setRangeEditorSeating] = useState<{ eventId: string; seatingId: string; seatingName: string } | null>(null);
  const [rangeDrafts, setRangeDrafts] = useState<RangeDraft[]>([]);
  const [savingRanges, setSavingRanges] = useState(false);

  const t = text[language];
  const getEditKey = (type: 'seating' | 'tier', id: string) => `${type}:${id}`;

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

      const [seatingRes, tiersRes, reservationsRes, ticketsRes, ordersRes] = await Promise.all([
        supabase.from('reservation_seating_types').select('id, event_id, seating_type, available_slots, paused').in('event_id', eventIds),
        supabase.from('ticket_tiers').select('id, event_id, name, quantity_total, active').in('event_id', eventIds).neq('quantity_total', 999999),
        supabase.from('reservations').select('event_id, seating_type_id').in('event_id', eventIds).in('status', ['pending', 'accepted']),
        supabase.from('tickets').select('tier_id, order_id, event_id').in('event_id', eventIds).in('status', ['valid', 'used']),
        supabase.from('ticket_orders').select('id, event_id, linked_reservation_id').in('event_id', eventIds),
      ]);

      const seatingTypes = seatingRes.data || [];
      const walkInTicketTiers = tiersRes.data || [];
      const reservations = reservationsRes.data || [];
      const tickets = ticketsRes.data || [];
      const orders = ordersRes.data || [];

      const seatingIds = seatingTypes.map((st) => st.id);
      const { data: seatingTypeTiers } = seatingIds.length > 0
        ? await supabase
            .from('seating_type_tiers')
            .select('id, seating_type_id, min_people, max_people, prepaid_min_charge_cents')
            .in('seating_type_id', seatingIds)
            .order('min_people', { ascending: true })
        : { data: [] };

      const reservationCounts: Record<string, number> = {};
      reservations.forEach((r) => {
        const key = r.seating_type_id;
        if (key) reservationCounts[key] = (reservationCounts[key] || 0) + 1;
      });

      const walkInOrderIds = new Set((orders || []).filter((o) => !o.linked_reservation_id).map((o) => o.id));
      const tierIds = new Set(walkInTicketTiers.map((t) => t.id));
      const ticketCounts: Record<string, number> = {};
      tickets.forEach((t) => {
        if (tierIds.has(t.tier_id) && (!t.order_id || walkInOrderIds.has(t.order_id))) {
          ticketCounts[t.tier_id] = (ticketCounts[t.tier_id] || 0) + 1;
        }
      });

      const seatingTypeOrder = ['table', 'vip', 'bar', 'sofa'];

      const enrichedEvents: EventWithControls[] = eventsData.map((event) => ({
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        seatingTypes: seatingTypes
          .filter((st) => st.event_id === event.id)
          .sort((a, b) => {
            const aType = (a.seating_type || '').toLowerCase();
            const bType = (b.seating_type || '').toLowerCase();
            const aIndex = seatingTypeOrder.indexOf(aType);
            const bIndex = seatingTypeOrder.indexOf(bType);

            if (aIndex === -1 && bIndex === -1) return aType.localeCompare(bType);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          })
          .map((st) => ({
            id: st.id,
            seating_type: st.seating_type,
            available_slots: st.available_slots,
            paused: st.paused ?? false,
            actualBooked: reservationCounts[st.id] || 0,
            tiers: (seatingTypeTiers || []).filter((tier) => tier.seating_type_id === st.id),
          })),
        ticketTiers: walkInTicketTiers
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

      if (!externalSelectedEventId && (!internalSelectedEventId || !enrichedEvents.find((e) => e.id === internalSelectedEventId))) {
        setInternalSelectedEventId(enrichedEvents[0]?.id || null);
      }
    } catch (error) {
      console.error('Error fetching Kaliva staff data:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId, externalSelectedEventId, internalSelectedEventId]);

  useEffect(() => {
    if (!editingKey) {
      fetchData();
    }
    // Pause auto-refresh while editing to prevent re-render shifting
    if (editingKey) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, editingKey]);

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
    const key = getEditKey(type, id);
    setEditingKey(key);
    setEditDrafts((prev) => ({ ...prev, [key]: String(currentValue) }));
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const saveEdit = async ({ id, type, eventId }: { id: string; type: 'seating' | 'tier'; eventId: string }) => {
    const key = getEditKey(type, id);
    if (editingKey !== key) return;

    const rawValue = editDrafts[key] ?? '';
    const newVal = parseInt(rawValue, 10);
    if (isNaN(newVal) || newVal < 0) {
      cancelEdit();
      return;
    }

    try {
      if (type === 'seating') {
        const { error } = await supabase
          .from('reservation_seating_types')
          .update({ available_slots: newVal })
          .eq('id', id)
          .eq('event_id', eventId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ticket_tiers')
          .update({ quantity_total: newVal })
          .eq('id', id)
          .eq('event_id', eventId);
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
                      const isEditing = editingKey === getEditKey('seating', st.id);

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
                                    value={editDrafts[getEditKey('seating', st.id)] ?? String(st.available_slots)}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '' || /^\d+$/.test(v)) {
                                        const key = getEditKey('seating', st.id);
                                        setEditDrafts((prev) => ({ ...prev, [key]: v }));
                                      }
                                    }}
                                    className="h-5 w-14 text-xs px-1 rounded border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                    inputMode="numeric"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit({ id: st.id, type: 'seating', eventId: selectedEvent.id });
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                  />
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => saveEdit({ id: st.id, type: 'seating', eventId: selectedEvent.id })}>
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
                      const isEditing = editingKey === getEditKey('tier', tt.id);

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
                                    value={editDrafts[getEditKey('tier', tt.id)] ?? String(tt.quantity_total)}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '' || /^\d+$/.test(v)) {
                                        const key = getEditKey('tier', tt.id);
                                        setEditDrafts((prev) => ({ ...prev, [key]: v }));
                                      }
                                    }}
                                    className="h-5 w-14 text-xs px-1 rounded border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring"
                                    inputMode="numeric"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit({ id: tt.id, type: 'tier', eventId: selectedEvent.id });
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                  />
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => saveEdit({ id: tt.id, type: 'tier', eventId: selectedEvent.id })}>
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
