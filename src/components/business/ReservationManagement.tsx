import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Check, X, Users, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { QRScanner } from './QRScanner';
import { toastTranslations } from '@/translations/toastTranslations';

interface ReservationWithEvent {
  id: string;
  event_id: string;
  user_id: string;
  reservation_name: string;
  party_size: number;
  status: string;
  created_at: string;
  phone_number: string | null;
  preferred_time: string | null;
  seating_preference: string | null;
  special_requests: string | null;
  business_notes: string | null;
  confirmation_code: string | null;
  qr_code_token: string | null;
  events: { id: string; title: string; start_at: string };
  profiles?: { name: string; email: string };
}

interface ReservationManagementProps {
  businessId: string;
  language: 'el' | 'en';
}

export const ReservationManagement = ({ businessId, language }: ReservationManagementProps) => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<ReservationWithEvent[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; accepts_reservations: boolean }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; reservation: ReservationWithEvent | null }>({
    open: false,
    reservation: null,
  });
  const [businessNotes, setBusinessNotes] = useState('');

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('reservations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, accepts_reservations')
      .eq('business_id', businessId)
      .eq('accepts_reservations', true);

    if (eventsData) {
      setEvents(eventsData);
      const eventIds = eventsData.map((e) => e.id);

      if (eventIds.length > 0) {
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            events!inner(id, title, start_at)
          `)
          .in('event_id', eventIds)
          .order('created_at', { ascending: false });

        if (reservationsError) {
          console.error('Error fetching reservations:', reservationsError);
        }

        if (reservationsData) {
          setReservations(reservationsData as any);
        }
      }
    }

    setLoading(false);
  };

  const filteredReservations = reservations.filter((r) => {
    if (selectedEvent !== 'all' && r.event_id !== selectedEvent) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    return true;
  });

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === 'pending').length,
    accepted: reservations.filter((r) => r.status === 'accepted').length,
    declined: reservations.filter((r) => r.status === 'declined').length,
  };

  const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reservationId);

      if (error) throw error;

      // Send status change notification
      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: {
            reservationId: reservationId,
            type: 'status_change'
          }
        });
      } catch (emailError) {
        console.error('Error sending status change email:', emailError);
      }

      toast.success(toastTranslations[language].statusUpdated);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(toastTranslations[language].error);
    }
  };

  const handleAddNotes = async () => {
    if (!notesDialog.reservation) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ business_notes: businessNotes, updated_at: new Date().toISOString() })
        .eq('id', notesDialog.reservation.id);

      if (error) throw error;

      toast.success(toastTranslations[language].notesSaved);
      setNotesDialog({ open: false, reservation: null });
      setBusinessNotes('');
      fetchData();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error(toastTranslations[language].error);
    }
  };

  const exportToCSV = () => {
    const headers = [t.event, t.name, 'Email', t.contact, t.details, t.status];
    const rows = filteredReservations.map((r) => [
      r.events?.title || t.unknownEvent,
      r.reservation_name,
      r.profiles?.email || '',
      r.phone_number || '',
      `${r.party_size} ${t.people}, ${r.seating_preference || ''}`,
      r.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${new Date().toISOString()}.csv`;
    a.click();
  };

  const text = {
    el: {
      title: 'Διαχείριση Κρατήσεων',
      stats: 'Στατιστικά',
      total: 'Σύνολο',
      pending: 'Εκκρεμείς',
      accepted: 'Εγκεκριμένες',
      declined: 'Απορριφθείσες',
      confirmationCode: 'Κωδικός',
      allEvents: 'Όλες οι Εκδηλώσεις',
      allStatuses: 'Όλες οι Καταστάσεις',
      export: 'Εξαγωγή CSV',
      event: 'Εκδήλωση',
      name: 'Όνομα',
      contact: 'Επικοινωνία',
      details: 'Λεπτομέρειες',
      status: 'Κατάσταση',
      actions: 'Ενέργειες',
      accept: 'Αποδοχή',
      decline: 'Απόρριψη',
      addNotes: 'Σημειώσεις',
      noReservations: 'Δεν υπάρχουν κρατήσεις ακόμα',
      people: 'άτομα',
      indoor: 'Εσωτερικός χώρος',
      outdoor: 'Εξωτερικός χώρος',
      noPreference: 'Χωρίς προτίμηση',
      cancelled: 'Ακυρώθηκε',
      statusUpdated: 'Η κατάσταση ενημερώθηκε',
      error: 'Σφάλμα',
      businessNotesTitle: 'Σημειώσεις Επιχείρησης',
      businessNotesDescription: 'Προσθέστε σημειώσεις για αυτήν την κράτηση',
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      notesSaved: 'Οι σημειώσεις αποθηκεύτηκαν',
      specialRequests: 'Ειδικές Απαιτήσεις',
      unknownEvent: 'Άγνωστη Εκδήλωση',
      anonymous: 'Ανώνυμος',
    },
    en: {
      title: 'Reservation Management',
      stats: 'Statistics',
      total: 'Total',
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      confirmationCode: 'Code',
      allEvents: 'All Events',
      allStatuses: 'All Statuses',
      export: 'Export CSV',
      event: 'Event',
      name: 'Name',
      contact: 'Contact',
      details: 'Details',
      status: 'Status',
      actions: 'Actions',
      accept: 'Accept',
      decline: 'Decline',
      addNotes: 'Notes',
      noReservations: 'No reservations yet',
      people: 'people',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      noPreference: 'No preference',
      cancelled: 'Cancelled',
      statusUpdated: 'Status updated',
      error: 'Error',
      businessNotesTitle: 'Business Notes',
      businessNotesDescription: 'Add notes for this reservation',
      save: 'Save',
      cancel: 'Cancel',
      notesSaved: 'Notes saved',
      specialRequests: 'Special Requests',
      unknownEvent: 'Unknown Event',
      anonymous: 'Anonymous',
    },
  };

  const t = text[language];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{t[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t.accepted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t.declined}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-3xl font-bold">
          {t.title} ({filteredReservations.length})
        </h2>
        <div className="flex gap-3 flex-wrap items-center w-full sm:w-auto">
          <QRScanner 
            businessId={businessId} 
            language={language}
            onReservationVerified={() => {
              toast.success(toastTranslations[language].reservationVerified);
              fetchData();
            }}
          />
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allEvents}</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="pending">{t.pending}</SelectItem>
              <SelectItem value="accepted">{t.accepted}</SelectItem>
              <SelectItem value="declined">{t.declined}</SelectItem>
              <SelectItem value="cancelled">{t.cancelled}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" className="gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            {t.export}
          </Button>
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t.noReservations}</p>
      ) : isMobile ? (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{reservation.events?.title || t.unknownEvent}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{reservation.reservation_name}</p>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {reservation.profiles?.name && (
                    <div className="text-muted-foreground">{reservation.profiles.name}</div>
                  )}
                  {reservation.profiles?.email && (
                    <div className="text-muted-foreground break-all">{reservation.profiles.email}</div>
                  )}
                  {reservation.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{reservation.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{t[reservation.seating_preference]}</span>
                    </div>
                  )}
                  {reservation.preferred_time && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{format(new Date(reservation.preferred_time), 'MMM dd, HH:mm')}</span>
                    </div>
                  )}
                  {reservation.special_requests && (
                    <div className="p-2 bg-muted rounded text-xs">
                      <strong>{t.specialRequests}:</strong> {reservation.special_requests}
                    </div>
                  )}
                  {reservation.confirmation_code && (
                    <div className="p-2 bg-primary/10 rounded text-xs font-mono">
                      <strong>{t.confirmationCode}:</strong> {reservation.confirmation_code}
                    </div>
                  )}
                </div>
                
                {reservation.status === 'pending' && (
                  <div className="flex gap-2 pt-3">
                    <Button
                      className="flex-1 h-11"
                      variant="outline"
                      onClick={() => handleStatusUpdate(reservation.id, 'accepted')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t.accept}
                    </Button>
                    <Button
                      className="flex-1 h-11"
                      variant="outline"
                      onClick={() => handleStatusUpdate(reservation.id, 'declined')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t.decline}
                    </Button>
                  </div>
                )}
                <Button
                  className="w-full h-11"
                  variant="outline"
                  onClick={() => {
                    setNotesDialog({ open: true, reservation });
                    setBusinessNotes(reservation.business_notes || '');
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t.addNotes}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.event}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.contact}</TableHead>
                <TableHead>{t.details}</TableHead>
                <TableHead>{t.confirmationCode}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{reservation.events?.title || t.unknownEvent}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reservation.reservation_name}</div>
                      <div className="text-sm text-muted-foreground">{reservation.profiles?.name || t.anonymous}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {reservation.profiles?.email && <div>{reservation.profiles.email}</div>}
                      {reservation.phone_number && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {reservation.phone_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {reservation.party_size} {t.people}
                      </div>
                      {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t[reservation.seating_preference]}
                        </div>
                      )}
                      {reservation.preferred_time && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm')}
                        </div>
                      )}
                      {reservation.special_requests && (
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {reservation.special_requests}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {reservation.confirmation_code && (
                      <div className="font-mono text-sm bg-primary/10 px-2 py-1 rounded inline-block">
                        {reservation.confirmation_code}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {reservation.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(reservation.id, 'accepted')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(reservation.id, 'declined')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNotesDialog({ open: true, reservation });
                          setBusinessNotes(reservation.business_notes || '');
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ ...notesDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.businessNotesTitle}</DialogTitle>
            <DialogDescription>{t.businessNotesDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">{t.addNotes}</Label>
              <Textarea
                id="notes"
                value={businessNotes}
                onChange={(e) => setBusinessNotes(e.target.value)}
                placeholder={t.businessNotesDescription}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setNotesDialog({ open: false, reservation: null })}>
                {t.cancel}
              </Button>
              <Button onClick={handleAddNotes}>{t.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
