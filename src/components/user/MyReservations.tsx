import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, X, QrCode, Clock, ChevronDown, Building2, CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { toastTranslations } from '@/translations/toastTranslations';
import QRCode from 'qrcode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MyReservationsProps {
  userId: string;
  language: 'el' | 'en';
}

interface ReservationData {
  id: string;
  event_id: string | null;
  business_id: string | null;
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
  // Prepaid reservation fields
  seating_type_id: string | null;
  prepaid_min_charge_cents: number | null;
  prepaid_charge_status: string | null;
  events?: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    location: string;
    event_type: string | null;
    businesses: { name: string; logo_url: string | null };
  } | null;
  businesses?: {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
  } | null;
}

export const MyReservations = ({ userId, language }: MyReservationsProps) => {
  const [upcomingReservations, setUpcomingReservations] = useState<ReservationData[]>([]);
  const [pastReservations, setPastReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; reservationId: string | null }>({
    open: false,
    reservationId: null,
  });
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const tt = toastTranslations[language];

  useEffect(() => {
    fetchReservations();
    const channel = supabase
      .channel('my_reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${userId}` },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchReservations = async () => {
    setLoading(true);
    const now = new Date().toISOString();

    let allUpcoming: ReservationData[] = [];
    let allPast: ReservationData[] = [];

    // Define the reservation fields to select
    const reservationFields = `
      id, event_id, business_id, user_id, reservation_name, party_size, status,
      created_at, phone_number, preferred_time, seating_preference, special_requests,
      business_notes, confirmation_code, qr_code_token,
      seating_type_id, prepaid_min_charge_cents, prepaid_charge_status
    `;

    // 1. Event-based reservations (upcoming)
    const { data: upcomingEventRes } = await supabase
      .from('reservations')
      .select(`
        ${reservationFields},
        events!inner(
          id,
          title,
          start_at,
          end_at,
          location,
          event_type,
          businesses(name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .not('event_id', 'is', null)
      .gte('events.end_at', now);

    // 2. Event-based reservations (past)
    const { data: pastEventRes } = await supabase
      .from('reservations')
      .select(`
        ${reservationFields},
        events!inner(
          id,
          title,
          start_at,
          end_at,
          location,
          event_type,
          businesses(name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .not('event_id', 'is', null)
      .lt('events.end_at', now);

    // 3. Direct business reservations (upcoming)
    const { data: upcomingDirectRes } = await supabase
      .from('reservations')
      .select(`
        ${reservationFields},
        businesses(id, name, logo_url, address)
      `)
      .eq('user_id', userId)
      .is('event_id', null)
      .not('business_id', 'is', null)
      .gte('preferred_time', now);

    // 4. Direct business reservations (past)
    const { data: pastDirectRes } = await supabase
      .from('reservations')
      .select(`
        ${reservationFields},
        businesses(id, name, logo_url, address)
      `)
      .eq('user_id', userId)
      .is('event_id', null)
      .not('business_id', 'is', null)
      .lt('preferred_time', now);

    // Merge and sort upcoming
    allUpcoming = [
      ...(upcomingEventRes as unknown as ReservationData[] || []),
      ...(upcomingDirectRes as unknown as ReservationData[] || [])
    ].sort((a, b) => {
      const dateA = a.events?.start_at || a.preferred_time || '';
      const dateB = b.events?.start_at || b.preferred_time || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Merge and sort past
    allPast = [
      ...(pastEventRes as unknown as ReservationData[] || []),
      ...(pastDirectRes as unknown as ReservationData[] || [])
    ].sort((a, b) => {
      const dateA = a.events?.end_at || a.preferred_time || '';
      const dateB = b.events?.end_at || b.preferred_time || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setUpcomingReservations(allUpcoming);
    setPastReservations(allPast);
    generateQRCodes(allUpcoming);
    setLoading(false);
  };

  const generateQRCodes = async (reservations: ReservationData[]) => {
    const codes: Record<string, string> = {};
    for (const reservation of reservations) {
      if (reservation.qr_code_token) {
        try {
          const qrDataUrl = await QRCode.toDataURL(reservation.qr_code_token, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          codes[reservation.id] = qrDataUrl;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    }
    setQrCodes(codes);
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Send cancellation notification
      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: {
            reservationId: reservationId,
            type: 'cancellation'
          }
        });
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
      }

      toast.success(tt.reservationCancelled);
      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(tt.failed);
    } finally {
      setCancelDialog({ open: false, reservationId: null });
    }
  };

  const text = {
    el: {
      title: 'Οι Κρατήσεις Μου',
      description: 'Διαχειριστείτε τις κρατήσεις σας',
      noReservations: 'Δεν έχετε κρατήσεις ακόμα',
      pending: 'Εκκρεμής',
      accepted: 'Εγκεκριμένη',
      declined: 'Απορρίφθηκε',
      cancelled: 'Ακυρώθηκε',
      people: 'άτομα',
      indoor: 'Εσωτερικός χώρος',
      outdoor: 'Εξωτερικός χώρος',
      cancelReservation: 'Ακύρωση',
      confirmCancel: 'Επιβεβαίωση Ακύρωσης',
      confirmCancelDescription: 'Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτήν την κράτηση;',
      cancel: 'Όχι',
      confirm: 'Ναι, Ακύρωση',
      specialRequests: 'Ειδικές Απαιτήσεις',
      businessNotes: 'Σημειώσεις Επιχείρησης',
      confirmationCode: 'Κωδικός Επιβεβαίωσης',
      history: 'Ιστορικό Κρατήσεων',
      pastReservations: 'Παλαιότερες Κρατήσεις',
      noHistoryReservations: 'Δεν υπάρχει ιστορικό κρατήσεων',
      eventEnded: 'Η εκδήλωση ολοκληρώθηκε',
      showHistory: 'Εμφάνιση Ιστορικού',
      hideHistory: 'Απόκρυψη Ιστορικού',
      tableReservation: 'Κράτηση Τραπεζιού',
      directReservation: 'Άμεση Κράτηση',
      // Prepaid fields
      seatingType: 'Τύπος Θέσης',
      prepaidCredit: 'Προπληρωμένη Πίστωση',
      paymentPending: 'Εκκρεμής Πληρωμή',
      paymentCompleted: 'Πληρώθηκε',
      bar: 'Μπάρα',
      table: 'Τραπέζι',
      vip: 'VIP',
      sofa: 'Καναπές',
      creditInfo: 'Αυτό το ποσό μπορεί να χρησιμοποιηθεί για κατανάλωση στον χώρο',
    },
    en: {
      title: 'My Reservations',
      description: 'Manage your reservations',
      noReservations: 'You have no reservations yet',
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      cancelled: 'Cancelled',
      people: 'people',
      indoor: 'Indoor seating',
      outdoor: 'Outdoor seating',
      cancelReservation: 'Cancel',
      confirmCancel: 'Confirm Cancellation',
      confirmCancelDescription: 'Are you sure you want to cancel this reservation?',
      cancel: 'No',
      confirm: 'Yes, Cancel',
      specialRequests: 'Special Requests',
      businessNotes: 'Business Notes',
      confirmationCode: 'Confirmation Code',
      history: 'Reservation History',
      pastReservations: 'Past Reservations',
      noHistoryReservations: 'No reservation history',
      eventEnded: 'Event has ended',
      showHistory: 'Show History',
      hideHistory: 'Hide History',
      tableReservation: 'Table Reservation',
      directReservation: 'Direct Reservation',
      // Prepaid fields
      seatingType: 'Seating Type',
      prepaidCredit: 'Prepaid Credit',
      paymentPending: 'Payment Pending',
      paymentCompleted: 'Paid',
      bar: 'Bar',
      table: 'Table',
      vip: 'VIP',
      sofa: 'Sofa',
      creditInfo: 'This amount can be used for consumption at the venue',
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
    return <Badge variant={variants[status] || 'outline'}>{t[status as keyof typeof t] || status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const renderReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const isDirectReservation = !reservation.events;
    const title = isDirectReservation ? t.tableReservation : reservation.events?.title;
    const businessInfo = isDirectReservation ? reservation.businesses : reservation.events?.businesses;
    const dateTime = isDirectReservation ? reservation.preferred_time : reservation.events?.start_at;
    const location = isDirectReservation ? reservation.businesses?.address : reservation.events?.location;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-70' : ''}`}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{title}</CardTitle>
                {isDirectReservation && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    <Building2 className="h-3 w-3 mr-1" />
                    {t.directReservation}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-2 flex items-center gap-2">
                {businessInfo?.logo_url && (
                  <img
                    src={businessInfo.logo_url}
                    alt={businessInfo.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                )}
                {businessInfo?.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isPast && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                  <Clock className="h-3 w-3 mr-1" />
                  {t.eventEnded}
                </Badge>
              )}
              {getStatusBadge(reservation.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Confirmation Code & QR Code */}
          {reservation.confirmation_code && !isPast && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <p className="text-xs text-muted-foreground mb-1">{t.confirmationCode}</p>
                  <p className="text-2xl font-bold text-primary tracking-wider">
                    {reservation.confirmation_code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {language === 'el' 
                      ? 'Παρουσιάστε αυτόν τον κωδικό ή το QR κατά την άφιξή σας'
                      : 'Present this code or QR upon arrival'
                    }
                  </p>
                </div>
                {qrCodes[reservation.id] && (
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src={qrCodes[reservation.id]} 
                      alt="QR Code" 
                      className="w-24 h-24 rounded border border-primary/20"
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <QrCode className="h-3 w-3" />
                      <span>QR Code</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {dateTime && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {isDirectReservation 
                    ? format(new Date(dateTime), 'PPP p')
                    : format(new Date(dateTime), 'PPP')
                  }
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{reservation.party_size} {t.people}</span>
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{t[reservation.seating_preference as keyof typeof t]}</span>
              </div>
            )}
            {reservation.phone_number && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.phone_number}</span>
              </div>
            )}
          </div>

          {/* Prepaid reservation info */}
          {reservation.seating_type_id && reservation.prepaid_min_charge_cents && reservation.prepaid_min_charge_cents > 0 && !isPast && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-300">{t.prepaidCredit}</span>
                </div>
                {reservation.prepaid_charge_status === 'completed' ? (
                  <Badge variant="default" className="bg-green-600">{t.paymentCompleted}</Badge>
                ) : (
                  <Badge variant="secondary">{t.paymentPending}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  <span>{t.seatingType}</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  €{(reservation.prepaid_min_charge_cents / 100).toFixed(2)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t.creditInfo}</p>
            </div>
          )}

          {reservation.special_requests && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">{t.specialRequests}</p>
              <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
            </div>
          )}

          {reservation.business_notes && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
              <p className="text-sm font-medium mb-1">{t.businessNotes}</p>
              <p className="text-sm">{reservation.business_notes}</p>
            </div>
          )}

          {reservation.status === 'pending' && !isPast && (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
            >
              <X className="h-4 w-4 mr-2" />
              {t.cancelReservation}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {upcomingReservations.length === 0 && pastReservations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">{t.noReservations}</p>
        </Card>
      ) : (
        <>
          {/* Upcoming Reservations */}
          {upcomingReservations.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">{t.noReservations}</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {upcomingReservations.map((reservation) => renderReservationCard(reservation, false))}
            </div>
          )}

          {/* History Section */}
          {pastReservations.length > 0 && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {t.history} ({pastReservations.length})
                    </span>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid gap-3">
                  {pastReservations.map((reservation) => (
                    renderReservationCard(reservation, true)
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmCancel}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmCancelDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog.reservationId && handleCancelReservation(cancelDialog.reservationId)}
            >
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
