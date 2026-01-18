import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Download, Users, Phone, Calendar, MessageSquare, Building2, 
  Tag, Clock, CheckCircle2, XCircle, Loader2, QrCode
} from 'lucide-react';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { QRScanner } from '../QRScanner';
import { toastTranslations } from '@/translations/toastTranslations';

interface DirectReservation {
  id: string;
  business_id: string;
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
  checked_in_at: string | null;
  profiles?: { name: string; email: string };
  // Track if linked to an offer
  offer_purchase?: { id: string; discount: { title: string } } | null;
}

interface DirectReservationsListProps {
  businessId: string;
  language: 'el' | 'en';
}

export const DirectReservationsList = ({ businessId, language }: DirectReservationsListProps) => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; reservation: DirectReservation | null }>({
    open: false,
    reservation: null,
  });
  const [businessNotes, setBusinessNotes] = useState('');
  const tt = toastTranslations[language];

  const text = {
    el: {
      title: 'Κρατήσεις Προφίλ & Προσφορών',
      subtitle: 'Κρατήσεις που έγιναν μέσω του προφίλ σας ή προσφορών (ενιαία διαθεσιμότητα)',
      allStatuses: 'Όλες οι Καταστάσεις',
      allTypes: 'Όλοι οι Τύποι',
      profileOnly: 'Μόνο Προφίλ',
      offerOnly: 'Μόνο Προσφορές',
      pending: 'Εκκρεμής',
      accepted: 'Επιβεβαιωμένη',
      declined: 'Απορρίφθηκε',
      cancelled: 'Ακυρώθηκε',
      checkedIn: 'Check-in',
      expired: 'Έληξε',
      export: 'Εξαγωγή CSV',
      name: 'Όνομα',
      contact: 'Επικοινωνία',
      details: 'Λεπτομέρειες',
      dateTime: 'Ημ/νία & Ώρα',
      type: 'Τύπος',
      status: 'Κατάσταση',
      actions: 'Ενέργειες',
      people: 'άτομα',
      noReservations: 'Δεν υπάρχουν κρατήσεις ακόμα',
      fromProfile: 'Από Προφίλ',
      fromOffer: 'Από Προσφορά',
      confirmationCode: 'Κωδικός',
      addNotes: 'Σημειώσεις',
      businessNotesTitle: 'Σημειώσεις Επιχείρησης',
      businessNotesDescription: 'Προσθέστε σημειώσεις για αυτήν την κράτηση',
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      checkIn: 'Check-in',
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      noShow: 'No-Show',
      stats: 'Στατιστικά',
      total: 'Σύνολο',
      upcoming: 'Επερχόμενες',
      today: 'Σήμερα',
      checkedInCount: 'Check-ins',
      graceEnding: 'Λήγει σύντομα',
    },
    en: {
      title: 'Profile & Offer Reservations',
      subtitle: 'Reservations made via your profile or offers (unified availability)',
      allStatuses: 'All Statuses',
      allTypes: 'All Types',
      profileOnly: 'Profile Only',
      offerOnly: 'Offers Only',
      pending: 'Pending',
      accepted: 'Confirmed',
      declined: 'Declined',
      cancelled: 'Cancelled',
      checkedIn: 'Checked In',
      expired: 'Expired',
      export: 'Export CSV',
      name: 'Name',
      contact: 'Contact',
      details: 'Details',
      dateTime: 'Date & Time',
      type: 'Type',
      status: 'Status',
      actions: 'Actions',
      people: 'people',
      noReservations: 'No reservations yet',
      fromProfile: 'From Profile',
      fromOffer: 'From Offer',
      confirmationCode: 'Code',
      addNotes: 'Notes',
      businessNotesTitle: 'Business Notes',
      businessNotesDescription: 'Add notes for this reservation',
      save: 'Save',
      cancel: 'Cancel',
      checkIn: 'Check-in',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      noShow: 'No-Show',
      stats: 'Statistics',
      total: 'Total',
      upcoming: 'Upcoming',
      today: 'Today',
      checkedInCount: 'Check-ins',
      graceEnding: 'Grace ending',
    },
  };

  const t = text[language];

  useEffect(() => {
    fetchReservations();
    const channel = supabase
      .channel('direct_reservations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      // Fetch direct reservations (event_id is null)
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, business_id, user_id, reservation_name, party_size, status,
          created_at, phone_number, preferred_time, seating_preference, special_requests,
          business_notes, confirmation_code, qr_code_token, checked_in_at,
          profiles(name, email)
        `)
        .eq('business_id', businessId)
        .is('event_id', null)
        .order('preferred_time', { ascending: true });

      if (error) throw error;

      // Check which reservations are linked to offers
      const reservationIds = data?.map(r => r.id) || [];
      
      let offerLinkedIds = new Set<string>();
      if (reservationIds.length > 0) {
        const { data: offerPurchases } = await supabase
          .from('offer_purchases')
          .select('reservation_id, discounts(title)')
          .in('reservation_id', reservationIds)
          .not('reservation_id', 'is', null);

        if (offerPurchases) {
          offerPurchases.forEach(p => {
            if (p.reservation_id) offerLinkedIds.add(p.reservation_id);
          });
        }
      }

      const enrichedData = (data || []).map(r => ({
        ...r,
        offer_purchase: offerLinkedIds.has(r.id) ? { id: r.id, discount: { title: 'Offer' } } : null
      })) as DirectReservation[];

      setReservations(enrichedData);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;
      toast.success(tt.reservationVerified);
      fetchReservations();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(tt.error);
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
      toast.success(tt.notesSaved);
      setNotesDialog({ open: false, reservation: null });
      setBusinessNotes('');
      fetchReservations();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error(tt.error);
    }
  };

  const exportToCSV = () => {
    const headers = [t.name, 'Email', t.contact, t.details, t.dateTime, t.type, t.status];
    const rows = filteredReservations.map((r) => [
      r.reservation_name,
      r.profiles?.email || '',
      r.phone_number || '',
      `${r.party_size} ${t.people}`,
      r.preferred_time ? format(new Date(r.preferred_time), 'yyyy-MM-dd HH:mm') : '',
      r.offer_purchase ? t.fromOffer : t.fromProfile,
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

  const filteredReservations = reservations.filter((r) => {
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedType === 'profile' && r.offer_purchase) return false;
    if (selectedType === 'offer' && !r.offer_purchase) return false;
    return true;
  });

  // Calculate stats
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const stats = {
    total: reservations.length,
    upcoming: reservations.filter(r => r.preferred_time && isAfter(new Date(r.preferred_time), now) && r.status === 'accepted').length,
    today: reservations.filter(r => r.preferred_time && format(new Date(r.preferred_time), 'yyyy-MM-dd') === todayStr).length,
    checkedIn: reservations.filter(r => r.checked_in_at).length,
  };

  const getStatusBadge = (reservation: DirectReservation) => {
    if (reservation.checked_in_at) {
      return <Badge className="bg-green-500">{t.checkedIn}</Badge>;
    }
    
    // Check if grace period expired
    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = addMinutes(slotTime, 15);
      if (isAfter(now, graceEnd)) {
        return <Badge variant="destructive">{t.noShow}</Badge>;
      }
      // Within grace period
      if (isAfter(now, slotTime) && isBefore(now, graceEnd)) {
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
            {t.graceEnding}
          </Badge>
        );
      }
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      cancelled: 'outline',
    };
    return <Badge variant={variants[reservation.status] || 'outline'}>{t[reservation.status as keyof typeof t] || reservation.status}</Badge>;
  };

  const getTypeBadge = (reservation: DirectReservation) => {
    if (reservation.offer_purchase) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          <Tag className="h-3 w-3 mr-1" />
          {t.fromOffer}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
        <Building2 className="h-3 w-3 mr-1" />
        {t.fromProfile}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">{t.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
            <div className="text-sm text-muted-foreground">{t.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-orange-600">{stats.upcoming}</div>
            <div className="text-sm text-muted-foreground">{t.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">{t.checkedInCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center w-full sm:w-auto">
          <QRScanner 
            businessId={businessId} 
            language={language}
            onReservationVerified={() => {
              toast.success(tt.reservationVerified);
              fetchReservations();
            }}
          />
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTypes}</SelectItem>
              <SelectItem value="profile">{t.profileOnly}</SelectItem>
              <SelectItem value="offer">{t.offerOnly}</SelectItem>
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
              <SelectItem value="cancelled">{t.cancelled}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            {t.export}
          </Button>
        </div>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t.noReservations}</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{reservation.reservation_name}</CardTitle>
                      {getTypeBadge(reservation)}
                    </div>
                    {reservation.profiles?.email && (
                      <p className="text-sm text-muted-foreground mt-1">{reservation.profiles.email}</p>
                    )}
                  </div>
                  {getStatusBadge(reservation)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.preferred_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}</span>
                    </div>
                  )}
                  {reservation.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{reservation.phone_number}</span>
                    </div>
                  )}
                  {reservation.confirmation_code && (
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{reservation.confirmation_code}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  {reservation.status === 'accepted' && !reservation.checked_in_at && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(reservation.id)}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t.checkIn}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNotesDialog({ open: true, reservation });
                      setBusinessNotes(reservation.business_notes || '');
                    }}
                    className={reservation.status === 'accepted' && !reservation.checked_in_at ? '' : 'flex-1'}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t.addNotes}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.dateTime}</TableHead>
                <TableHead>{t.details}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.confirmationCode}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reservation.reservation_name}</div>
                      <div className="text-sm text-muted-foreground">{reservation.profiles?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reservation.preferred_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {reservation.party_size} {t.people}
                    </div>
                    {reservation.phone_number && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        {reservation.phone_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getTypeBadge(reservation)}</TableCell>
                  <TableCell>
                    {reservation.confirmation_code && (
                      <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                        {reservation.confirmation_code}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(reservation)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {reservation.status === 'accepted' && !reservation.checked_in_at && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(reservation.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
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

      {/* Notes Dialog */}
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
