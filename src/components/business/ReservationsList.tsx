import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface RSVPWithEvent {
  id: string;
  event_id: string;
  user_id: string;
  status: 'interested' | 'going';
  notes: string | null;
  created_at: string;
  events: { id: string; title: string; start_at: string };
  profiles: { name: string; email: string };
}

interface ReservationsListProps {
  businessId: string;
  language: 'el' | 'en';
}

export const ReservationsList = ({ businessId, language }: ReservationsListProps) => {
  const [reservations, setReservations] = useState<RSVPWithEvent[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch business events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title')
      .eq('business_id', businessId);

    if (eventsData) {
      setEvents(eventsData);
      const eventIds = eventsData.map(e => e.id);

      // Fetch RSVPs for these events
      const { data: rsvpsData } = await supabase
        .from('rsvps')
        .select(`
          *,
          events!inner(id, title, start_at),
          profiles(name, email)
        `)
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      if (rsvpsData) {
        // Filter out any RSVPs where event data is missing
        const validReservations = rsvpsData.filter(r => r.events && r.events.id);
        setReservations(validReservations as RSVPWithEvent[]);
      }
    }

    setLoading(false);
  };

  const filteredReservations = reservations.filter(r => {
    if (selectedEvent !== 'all' && r.event_id !== selectedEvent) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Event', 'User', 'Email', 'Status', 'Notes', 'Date'];
    const rows = filteredReservations.map(r => [
      r.events?.title || 'Deleted Event',
      r.profiles?.name || 'Anonymous',
      r.profiles?.email || '',
      r.status,
      r.notes || '',
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${Date.now()}.csv`;
    a.click();
  };

  const text = {
    el: {
      title: 'Κρατήσεις',
      allEvents: 'Όλες οι Εκδηλώσεις',
      allStatuses: 'Όλες οι Καταστάσεις',
      export: 'Εξαγωγή CSV',
      event: 'Εκδήλωση',
      user: 'Χρήστης',
      email: 'Email',
      status: 'Κατάσταση',
      notes: 'Σημειώσεις',
      date: 'Ημερομηνία',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα Πάω',
      noReservations: 'Δεν υπάρχουν κρατήσεις',
    },
    en: {
      title: 'Reservations',
      allEvents: 'All Events',
      allStatuses: 'All Statuses',
      export: 'Export CSV',
      event: 'Event',
      user: 'User',
      email: 'Email',
      status: 'Status',
      notes: 'Notes',
      date: 'Date',
      interested: 'Interested',
      going: 'Going',
      noReservations: 'No reservations yet',
    },
  };

  const t = text[language];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-3xl font-bold">{t.title} ({filteredReservations.length})</h2>
        <div className="flex gap-3">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allEvents}</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="interested">{t.interested}</SelectItem>
              <SelectItem value="going">{t.going}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t.export}
          </Button>
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t.noReservations}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.event}</TableHead>
                <TableHead>{t.user}</TableHead>
                <TableHead>{t.email}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.notes}</TableHead>
                <TableHead>{t.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map(reservation => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    {reservation.events?.title || 'Deleted Event'}
                  </TableCell>
                  <TableCell>{reservation.profiles?.name || 'Anonymous'}</TableCell>
                  <TableCell>{reservation.profiles?.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={reservation.status === 'going' ? 'default' : 'secondary'}>
                      {reservation.status === 'going' ? t.going : t.interested}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {reservation.notes || '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(reservation.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
