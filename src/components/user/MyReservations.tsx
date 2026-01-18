import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, X, QrCode, Clock, ChevronDown, Building2, CreditCard, Wallet, Tag, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { toastTranslations } from '@/translations/toastTranslations';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  checked_in_at?: string | null;
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
  // Track if this reservation is linked to an offer
  isOfferBased?: boolean;
}

type ReservationType = 'direct' | 'offer' | 'event';

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
  const [qrDialog, setQrDialog] = useState<{ open: boolean; qrCode: string; confirmationCode: string; businessName: string } | null>(null);
  const [offerLinkedReservationIds, setOfferLinkedReservationIds] = useState<Set<string>>(new Set());
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
      created_at, checked_in_at, phone_number, preferred_time, seating_preference, special_requests,
      business_notes, confirmation_code, qr_code_token,
      seating_type_id, prepaid_min_charge_cents, prepaid_charge_status
    `;

    // Fetch offer_purchases to find which reservations are offer-based
    const { data: offerPurchases } = await supabase
      .from('offer_purchases')
      .select('reservation_id')
      .eq('user_id', userId)
      .not('reservation_id', 'is', null);

    const offerReservationIds = new Set(
      (offerPurchases || []).map(p => p.reservation_id).filter(Boolean) as string[]
    );
    setOfferLinkedReservationIds(offerReservationIds);

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

    // Mark offer-based reservations
    const markOfferBased = (reservations: ReservationData[]) => 
      reservations.map(r => ({
        ...r,
        isOfferBased: offerReservationIds.has(r.id)
      }));

    // Merge and sort upcoming
    allUpcoming = markOfferBased([
      ...(upcomingEventRes as unknown as ReservationData[] || []),
      ...(upcomingDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
      const dateA = a.events?.start_at || a.preferred_time || '';
      const dateB = b.events?.start_at || b.preferred_time || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Merge and sort past
    allPast = markOfferBased([
      ...(pastEventRes as unknown as ReservationData[] || []),
      ...(pastDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
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
      // Only generate QR for non-offer-based reservations
      if (reservation.qr_code_token && !reservation.isOfferBased) {
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

  // Helper to determine reservation type
  const getReservationType = (reservation: ReservationData): ReservationType => {
    if (reservation.events) return 'event';
    if (reservation.isOfferBased) return 'offer';
    return 'direct';
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
      offerReservation: 'Μέσω Προσφοράς',
      eventReservation: 'Μέσω Εκδήλωσης',
      // Status
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      confirmed: 'Επιβεβαιωμένη',
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
      // Section headers
      directReservationsSection: 'Απλές Κρατήσεις',
      offerReservationsSection: 'Κρατήσεις μέσω Προσφορών',
      eventReservationsSection: 'Κρατήσεις μέσω Εκδηλώσεων',
      qrInOffers: 'Το QR code βρίσκεται στις "Οι Προσφορές Μου"',
      goToOffers: 'Πήγαινε στις Προσφορές',
      noDirectReservations: 'Δεν υπάρχουν απλές κρατήσεις',
      noOfferReservations: 'Δεν υπάρχουν κρατήσεις μέσω προσφορών',
      noEventReservations: 'Δεν υπάρχουν κρατήσεις μέσω εκδηλώσεων',
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
      offerReservation: 'Via Offer',
      eventReservation: 'Via Event',
      // Status
      checkedIn: 'Check-in',
      noShow: 'No-show',
      confirmed: 'Confirmed',
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
      // Section headers
      directReservationsSection: 'Direct Reservations',
      offerReservationsSection: 'Reservations via Offers',
      eventReservationsSection: 'Reservations via Events',
      qrInOffers: 'QR code is in "My Offers"',
      goToOffers: 'Go to Offers',
      noDirectReservations: 'No direct reservations',
      noOfferReservations: 'No reservations via offers',
      noEventReservations: 'No reservations via events',
    },
  };

  const t = text[language];

  const getStatusBadge = (reservation: ReservationData) => {
    // Check-in takes priority
    if (reservation.checked_in_at) {
      return (
        <Badge className="bg-green-500 text-white">
          {t.checkedIn}
        </Badge>
      );
    }

    // No-show (15min grace) for accepted upcoming direct/offer reservations
    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = new Date(slotTime.getTime() + 15 * 60 * 1000);
      if (new Date() > graceEnd) {
        return <Badge variant="destructive">{t.noShow}</Badge>;
      }

      // Still within grace window
      return <Badge variant="default">{t.confirmed}</Badge>;
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      cancelled: 'outline',
    };
    return (
      <Badge variant={variants[reservation.status] || 'outline'}>
        {t[reservation.status as keyof typeof t] || reservation.status}
      </Badge>
    );
  };

  const getTypeBadge = (reservation: ReservationData) => {
    const type = getReservationType(reservation);
    
    if (type === 'offer') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          <Tag className="h-3 w-3 mr-1" />
          {t.offerReservation}
        </Badge>
      );
    }
    
    if (type === 'event') {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
          <Ticket className="h-3 w-3 mr-1" />
          {t.eventReservation}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
        <Building2 className="h-3 w-3 mr-1" />
        {t.directReservation}
      </Badge>
    );
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
    const reservationType = getReservationType(reservation);
    const isOfferBased = reservationType === 'offer';

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-70' : ''}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{title}</CardTitle>
                {getTypeBadge(reservation)}
              </div>
              <CardDescription className="mt-1 flex items-center gap-2">
                {businessInfo?.logo_url && (
                  <img
                    src={businessInfo.logo_url}
                    alt={businessInfo.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                )}
                <span className="text-sm">{businessInfo?.name}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isPast && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {t.eventEnded}
                </Badge>
              )}
              {getStatusBadge(reservation)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2 pb-4 px-4">
          {/* For offer-based reservations, show notice about QR in Offers - compact */}
          {isOfferBased && !isPast && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-orange-600 shrink-0" />
                <p className="text-xs font-medium text-orange-800 dark:text-orange-300 flex-1">
                  {t.qrInOffers}
                </p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
                >
                  <Link to="/dashboard-user?tab=offers">
                    <Tag className="h-3 w-3 mr-1" />
                    {t.goToOffers}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation Code & QR Code - only for non-offer reservations - compact */}
          {reservation.confirmation_code && !isPast && !isOfferBased && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{t.confirmationCode}</p>
                  <p className="text-xl font-bold text-primary tracking-wider">
                    {reservation.confirmation_code}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'el' 
                      ? 'Παρουσιάστε αυτόν τον κωδικό ή το QR κατά την άφιξή σας'
                      : 'Present this code or QR upon arrival'
                    }
                  </p>
                </div>
                {qrCodes[reservation.id] && (
                  <button
                    type="button"
                    onClick={() => setQrDialog({
                      open: true,
                      qrCode: qrCodes[reservation.id],
                      confirmationCode: reservation.confirmation_code || '',
                      businessName: businessInfo?.name || ''
                    })}
                    className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity group shrink-0"
                  >
                    <img 
                      src={qrCodes[reservation.id]} 
                      alt="QR Code" 
                      className="w-16 h-16 rounded border border-primary/20 group-hover:border-primary/50 transition-colors"
                    />
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary mt-0.5">
                      {language === 'el' ? 'Μεγέθυνση' : 'Enlarge'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            {dateTime && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs">
                  {isDirectReservation 
                    ? format(new Date(dateTime), 'PPP p')
                    : format(new Date(dateTime), 'PPP')
                  }
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs">{reservation.party_size} {t.people}</span>
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{location}</span>
              </div>
            )}
            {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs">{t[reservation.seating_preference as keyof typeof t]}</span>
              </div>
            )}
            {reservation.phone_number && (
              <div className="flex items-center gap-2 col-span-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs">{reservation.phone_number}</span>
              </div>
            )}
          </div>

          {/* Prepaid reservation info - for event reservations - compact */}
          {reservation.seating_type_id && reservation.prepaid_min_charge_cents && reservation.prepaid_min_charge_cents > 0 && !isPast && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-800 dark:text-green-300">{t.prepaidCredit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    €{(reservation.prepaid_min_charge_cents / 100).toFixed(2)}
                  </span>
                  {reservation.prepaid_charge_status === 'completed' ? (
                    <Badge variant="default" className="bg-green-600 text-[10px] h-5">{t.paymentCompleted}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-5">{t.paymentPending}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Special requests - only show for direct (non-offer) reservations */}
          {reservation.special_requests && !isOfferBased && (
            <div className="bg-muted px-3 py-2 rounded-lg">
              <p className="text-xs font-medium">{t.specialRequests}</p>
              <p className="text-xs text-muted-foreground">{reservation.special_requests}</p>
            </div>
          )}

          {reservation.business_notes && (
            <div className="bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">
              <p className="text-xs font-medium">{t.businessNotes}</p>
              <p className="text-xs text-muted-foreground">{reservation.business_notes}</p>
            </div>
          )}

          {reservation.status === 'pending' && !isPast && (
            <Button
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
            >
              <X className="h-3.5 w-3.5 mr-2" />
              {t.cancelReservation}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Categorize upcoming reservations by type
  const directReservations = upcomingReservations.filter(r => getReservationType(r) === 'direct');
  const offerReservations = upcomingReservations.filter(r => getReservationType(r) === 'offer');
  const eventReservations = upcomingReservations.filter(r => getReservationType(r) === 'event');

  const renderSection = (
    reservations: ReservationData[], 
    icon: React.ReactNode, 
    title: string, 
    emptyMessage: string,
    colorClass: string
  ) => (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 px-1 ${colorClass}`}>
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">({reservations.length})</span>
      </div>
      {reservations.length === 0 ? (
        <Card className="p-4 text-center bg-muted/30">
          <p className="text-muted-foreground text-xs">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reservations.map(r => renderReservationCard(r, false))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {upcomingReservations.length === 0 && pastReservations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">{t.noReservations}</p>
        </Card>
      ) : (
        <>
          {/* Upcoming Reservations - split by type */}
          {upcomingReservations.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">{t.noReservations}</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Direct Reservations */}
              {renderSection(
                directReservations,
                <Building2 className="h-4 w-4" />,
                t.directReservationsSection,
                t.noDirectReservations,
                'text-blue-700 dark:text-blue-400'
              )}

              {/* Offer-based Reservations */}
              {renderSection(
                offerReservations,
                <Tag className="h-4 w-4" />,
                t.offerReservationsSection,
                t.noOfferReservations,
                'text-orange-700 dark:text-orange-400'
              )}

              {/* Event-based Reservations */}
              {renderSection(
                eventReservations,
                <Ticket className="h-4 w-4" />,
                t.eventReservationsSection,
                t.noEventReservations,
                'text-purple-700 dark:text-purple-400'
              )}
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

      {/* QR Code Enlarged Dialog */}
      <Dialog open={qrDialog?.open || false} onOpenChange={(open) => !open && setQrDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'el' ? 'Κωδικός Επιβεβαίωσης' : 'Confirmation Code'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {qrDialog?.businessName && (
              <p className="text-muted-foreground text-sm">{qrDialog.businessName}</p>
            )}
            {qrDialog?.qrCode && (
              <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-lg">
                <img 
                  src={qrDialog.qrCode} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              </div>
            )}
            {qrDialog?.confirmationCode && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'el' ? 'Κωδικός' : 'Code'}
                </p>
                <p className="text-3xl font-bold text-primary tracking-widest">
                  {qrDialog.confirmationCode}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {language === 'el' 
                ? 'Παρουσιάστε αυτόν τον κωδικό QR στην επιχείρηση'
                : 'Present this QR code at the venue'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
