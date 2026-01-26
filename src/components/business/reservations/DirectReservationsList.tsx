import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Phone, Calendar, Building2, 
  Tag, Clock, Loader2, QrCode
} from 'lucide-react';
import { format, isAfter, addMinutes } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

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
  /** Increments when QR scan succeeds (to re-fetch list) */
  refreshNonce?: number;
}

export const DirectReservationsList = ({ businessId, language, refreshNonce }: DirectReservationsListProps) => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCapacity, setTodayCapacity] = useState<number>(0);

  const text = {
    el: {
      title: 'Κρατήσεις Προφίλ & Προσφορών',
      confirmed: 'Επιβεβαιωμένη',
      cancelled: 'Ακυρωμένη',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
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
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      stats: 'Στατιστικά',
      total: 'Σύνολο',
      today: 'Σήμερα',
      checkedInCount: 'Check-ins',
    },
    en: {
      title: 'Profile & Offer Reservations',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      checkedIn: 'Checked In',
      noShow: 'No-Show',
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
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      stats: 'Statistics',
      total: 'Total',
      today: 'Today',
      checkedInCount: 'Check-ins',
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

  // Re-fetch when a QR scan succeeds (parent increments refreshNonce)
  useEffect(() => {
    if (refreshNonce === undefined) return;
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // Fetch direct reservations + today's slot capacity in parallel
      const [reservationsResult, slotsResult] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            id, business_id, user_id, reservation_name, party_size, status,
            created_at, phone_number, preferred_time, seating_preference, special_requests,
            business_notes, confirmation_code, qr_code_token, checked_in_at,
            profiles(name, email)
          `)
          .eq('business_id', businessId)
          .is('event_id', null)
          .order('preferred_time', { ascending: true }),
        supabase.rpc('get_slots_availability', {
          p_business_id: businessId,
          p_date: todayStr,
        }),
      ]);

      const { data, error } = reservationsResult;
      if (error) throw error;

      // Sum today's capacity across all active slots
      if (!slotsResult.error && Array.isArray(slotsResult.data)) {
        const capacitySum = (slotsResult.data as Array<{ capacity: number }>).reduce(
          (acc, s) => acc + (Number(s.capacity) || 0),
          0
        );
        setTodayCapacity(capacitySum);
      } else {
        setTodayCapacity(0);
      }

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

  // ... keep existing code (no action buttons)

  // Show all reservations (no filters)
  const filteredReservations = reservations;

  // Calculate stats
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const isSameDay = (iso: string | null) => {
    if (!iso) return false;
    return format(new Date(iso), 'yyyy-MM-dd') === todayStr;
  };

  // Active reservations count excludes cancellations
  const isActiveReservation = (r: DirectReservation) => r.status === 'pending' || r.status === 'accepted';

  const stats = {
    // "Σύνολο" = today's slot capacity (returns to original when cancellations happen)
    total: todayCapacity,
    // "Σήμερα" = only active reservations scheduled for today (cancelled should not count)
    today: reservations.filter(r => isActiveReservation(r) && isSameDay(r.preferred_time)).length,
    // "Check-ins" = check-ins that happened today (independent of cancellations)
    checkedIn: reservations.filter(r => isSameDay(r.checked_in_at)).length,
  };

  const getStatusBadge = (reservation: DirectReservation) => {
    // Check-in: verified via QR scan
    if (reservation.checked_in_at) {
      return <Badge className="bg-green-500 text-white">{t.checkedIn}</Badge>;
    }
    
    // Cancelled by user
    if (reservation.status === 'cancelled') {
      return <Badge variant="outline" className="text-muted-foreground">{t.cancelled}</Badge>;
    }
    
    // No-Show: grace period (15 min) expired without check-in
    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = addMinutes(slotTime, 15);
      if (isAfter(now, graceEnd)) {
        return <Badge variant="destructive">{t.noShow}</Badge>;
      }
    }

    // Confirmed (default for accepted reservations)
    if (reservation.status === 'accepted') {
      return <Badge variant="default">{t.confirmed}</Badge>;
    }

    return <Badge variant="outline">{reservation.status}</Badge>;
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
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Stats Cards */}
      {/* Stats Cards - always 3 in a row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-full">
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.total}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.today}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.checkedIn}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.checkedInCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section title (single line) */}
      <div className="min-w-0">
        <h2 className="text-base font-semibold truncate">{t.title}</h2>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t.noReservations}</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{reservation.reservation_name}</CardTitle>
                      {getTypeBadge(reservation)}
                    </div>
                    {reservation.profiles?.email && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{reservation.profiles.email}</p>
                    )}
                  </div>
                  {getStatusBadge(reservation)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.preferred_time && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}
                      </span>
                    </div>
                  )}
                  {reservation.phone_number && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{reservation.phone_number}</span>
                    </div>
                  )}
                  {reservation.confirmation_code && (
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono truncate">{reservation.confirmation_code}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Tablet uses mobile card layout */
        <div className="space-y-3 lg:hidden">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{reservation.reservation_name}</CardTitle>
                      {getTypeBadge(reservation)}
                    </div>
                    {reservation.profiles?.email && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{reservation.profiles.email}</p>
                    )}
                  </div>
                  {getStatusBadge(reservation)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.preferred_time && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}
                      </span>
                    </div>
                  )}
                  {reservation.phone_number && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{reservation.phone_number}</span>
                    </div>
                  )}
                  {reservation.confirmation_code && (
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono truncate">{reservation.confirmation_code}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Desktop table - only on lg+ */}
      {filteredReservations.length > 0 && (
        <div className="rounded-md border w-full max-w-full overflow-x-auto hidden lg:block">
          <Table className="w-full min-w-[980px] table-fixed text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">{t.name}</TableHead>
                <TableHead className="w-1/6">{t.dateTime}</TableHead>
                <TableHead className="w-1/6">{t.details}</TableHead>
                <TableHead className="w-1/6">{t.type}</TableHead>
                <TableHead className="w-1/6">{t.confirmationCode}</TableHead>
                <TableHead className="w-1/6">{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="min-w-0 align-top">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{reservation.reservation_name}</div>
                      <div className="text-sm text-muted-foreground truncate">{reservation.profiles?.email}</div>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    {reservation.preferred_time && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {format(new Date(reservation.preferred_time), 'dd MMM, HH:mm', { locale: language === 'el' ? el : enUS })}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="whitespace-nowrap">{reservation.party_size} {t.people}</span>
                    </div>
                    {reservation.phone_number && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 min-w-0">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{reservation.phone_number}</span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="min-w-0 align-top">{getTypeBadge(reservation)}</TableCell>

                  <TableCell className="align-top">
                    {reservation.confirmation_code && (
                      <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded whitespace-nowrap inline-block">
                        {reservation.confirmation_code}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="align-top">{getStatusBadge(reservation)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      

    </div>
  );
};
