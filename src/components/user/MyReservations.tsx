import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, X, QrCode, Clock, ChevronDown, Building2, CreditCard, Tag, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { toastTranslations } from '@/translations/toastTranslations';
import { useNavigate } from 'react-router-dom';
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
    businesses: { id: string; name: string; logo_url: string | null };
  } | null;
  businesses?: {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
  } | null;
  isOfferBased?: boolean;
  offerTitle?: string;
  offerPercentOff?: number;
  offerPurchaseId?: string;
}

type ReservationType = 'direct' | 'offer' | 'event';

export const MyReservations = ({ userId, language }: MyReservationsProps) => {
  const navigate = useNavigate();
  const dateLocale = language === 'el' ? el : enUS;
  const isPreviewOrigin =
    typeof window !== 'undefined' &&
    (window.location.origin.includes('lovable.app') || window.location.origin.includes('localhost'));
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
  const [offerLinkedReservationIds, setOfferLinkedReservationIds] = useState<Map<string, { title: string; percentOff: number; purchaseId: string }>>(new Map());
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

    const reservationFields = `
      id, event_id, business_id, user_id, reservation_name, party_size, status,
      created_at, checked_in_at, phone_number, preferred_time, seating_preference, special_requests,
      business_notes, confirmation_code, qr_code_token,
      seating_type_id, prepaid_min_charge_cents, prepaid_charge_status
    `;

    // Fetch offer_purchases with discount info
    const { data: offerPurchases } = await supabase
      .from('offer_purchases')
      .select(`
        id,
        reservation_id,
        discounts (
          title,
          percent_off
        )
      `)
      .eq('user_id', userId)
      .not('reservation_id', 'is', null);

const offerReservationMap = new Map<string, { title: string; percentOff: number; purchaseId: string }>();
    (offerPurchases || []).forEach(p => {
      if (p.reservation_id && p.discounts) {
        offerReservationMap.set(p.reservation_id, {
          title: (p.discounts as any).title || '',
          percentOff: (p.discounts as any).percent_off || 0,
          purchaseId: (p as any).id || ''
        });
      }
    });
    setOfferLinkedReservationIds(offerReservationMap);

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
          businesses(id, name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .not('event_id', 'is', null)
      .neq('status', 'cancelled')
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
          businesses(id, name, logo_url)
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
      .neq('status', 'cancelled')
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

    const markOfferBased = (reservations: ReservationData[]) => 
      reservations.map(r => {
        const offerInfo = offerReservationMap.get(r.id);
        return {
          ...r,
          isOfferBased: !!offerInfo,
          offerTitle: offerInfo?.title,
          offerPercentOff: offerInfo?.percentOff,
          offerPurchaseId: offerInfo?.purchaseId
        };
      });

    allUpcoming = markOfferBased([
      ...(upcomingEventRes as unknown as ReservationData[] || []),
      ...(upcomingDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
      const dateA = a.events?.start_at || a.preferred_time || '';
      const dateB = b.events?.start_at || b.preferred_time || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    allPast = markOfferBased([
      ...(pastEventRes as unknown as ReservationData[] || []),
      ...(pastDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
      const dateA = a.events?.end_at || a.preferred_time || '';
      const dateB = b.events?.end_at || b.preferred_time || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Preview-only: if the user has no event-based reservations at all,
    // create one demo reservation so the section can be previewed.
    try {
      const hasAnyEventReservations = (upcomingEventRes?.length || 0) + (pastEventRes?.length || 0) > 0;
      const seedKey = `seeded_event_reservation_${userId}`;

      if (isPreviewOrigin && !hasAnyEventReservations && !localStorage.getItem(seedKey)) {
        localStorage.setItem(seedKey, '1');
        await supabase.functions.invoke('create-free-reservation-event', { body: {} });
        // Re-fetch after seeding
        await fetchReservations();
        return;
      }
    } catch (e) {
      // Silent fail: seeding is just for preview UX.
      console.warn('Event reservation seeding failed', e);
    }

    setUpcomingReservations(allUpcoming);
    setPastReservations(allPast);
    generateQRCodes([...allUpcoming, ...allPast]);
    setLoading(false);
  };

  const generateQRCodes = async (reservations: ReservationData[]) => {
    const codes: Record<string, string> = {};
    for (const reservation of reservations) {
      if (reservation.qr_code_token && !reservation.isOfferBased) {
        try {
          const qrDataUrl = await QRCode.toDataURL(reservation.qr_code_token, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
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
      setUpcomingReservations((prev) => prev.filter((r) => r.id !== reservationId));

      const { data: updatedRows, error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .eq('user_id', userId)
        .select('id, status');

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No reservation row updated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('reservation_cancellation_count')
        .eq('id', userId)
        .single();

      const newCount = (profile?.reservation_cancellation_count || 0) + 1;
      const updateData: any = { reservation_cancellation_count: newCount };
      
      if (newCount >= 3) {
        const restrictedUntil = new Date();
        restrictedUntil.setDate(restrictedUntil.getDate() + 14);
        updateData.reservation_restricted_until = restrictedUntil.toISOString();
      }

      await supabase.from('profiles').update(updateData).eq('id', userId);

      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: { reservationId: reservationId, type: 'cancellation' }
        });
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
      }

      toast.success(tt.reservationCancelled);
      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(tt.failed);
      fetchReservations();
    } finally {
      setCancelDialog({ open: false, reservationId: null });
    }
  };

  const getReservationType = (reservation: ReservationData): ReservationType => {
    if (reservation.events) return 'event';
    if (reservation.isOfferBased) return 'offer';
    return 'direct';
  };

  const text = {
    el: {
      title: 'Οι Κρατήσεις Μου',
      noReservations: 'Δεν έχετε κρατήσεις ακόμα',
      people: 'άτομα',
      cancelReservation: 'Ακύρωση',
      confirmCancel: 'Επιβεβαίωση Ακύρωσης',
      confirmCancelDescription: 'Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτήν την κράτηση;',
      cancel: 'Όχι',
      confirm: 'Ναι, Ακύρωση',
      history: 'Ιστορικό Κρατήσεων',
      tableReservation: 'Κράτηση Τραπεζιού',
      confirmed: 'Επιβεβαιωμένη',
      pending: 'Εκκρεμής',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      prepaidCredit: 'Προπληρωμένη Πίστωση',
      directReservationsSection: 'Απλές Κρατήσεις',
      offerReservationsSection: 'Κρατήσεις μέσω Προσφορών',
      eventReservationsSection: 'Κρατήσεις μέσω Εκδηλώσεων',
      noDirectReservations: 'Δεν υπάρχουν απλές κρατήσεις',
      noOfferReservations: 'Δεν υπάρχουν κρατήσεις μέσω προσφορών',
      noEventReservations: 'Δεν υπάρχουν κρατήσεις μέσω εκδηλώσεων',
      qrInOffers: 'QR στις Προσφορές',
      code: 'Κωδικός',
    },
    en: {
      title: 'My Reservations',
      noReservations: 'You have no reservations yet',
      people: 'people',
      cancelReservation: 'Cancel',
      confirmCancel: 'Confirm Cancellation',
      confirmCancelDescription: 'Are you sure you want to cancel this reservation?',
      cancel: 'No',
      confirm: 'Yes, Cancel',
      history: 'Reservation History',
      tableReservation: 'Table Reservation',
      confirmed: 'Confirmed',
      pending: 'Pending',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      prepaidCredit: 'Prepaid Credit',
      directReservationsSection: 'Direct Reservations',
      offerReservationsSection: 'Reservations via Offers',
      eventReservationsSection: 'Reservations via Events',
      noDirectReservations: 'No direct reservations',
      noOfferReservations: 'No reservations via offers',
      noEventReservations: 'No reservations via events',
      qrInOffers: 'QR in Offers',
      code: 'Code',
    },
  };

  const t = text[language];

  const getStatusBadge = (reservation: ReservationData) => {
    if (reservation.checked_in_at) {
      return <Badge className="bg-green-500 text-white text-xs h-7 px-3">{t.checkedIn}</Badge>;
    }

    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = new Date(slotTime.getTime() + 15 * 60 * 1000);
      if (new Date() > graceEnd) {
        return <Badge variant="destructive" className="text-xs h-7 px-3">{t.noShow}</Badge>;
      }
      return <Badge className="bg-primary text-primary-foreground text-xs h-7 px-3">{t.confirmed}</Badge>;
    }

    if (reservation.status === 'pending') {
      return <Badge variant="secondary" className="text-xs h-7 px-3">{t.pending}</Badge>;
    }

    return <Badge className="bg-primary text-primary-foreground text-xs h-7 px-3">{t.confirmed}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Format date without year: "31 Ιανουαρίου, 19:00"
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB', { month: 'long' });
    const time = date.toLocaleTimeString(language === 'el' ? 'el-GR' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return language === 'el' ? `${day} ${month}, ${time}` : `${month} ${day}, ${time}`;
  };

  // ============= DIRECT RESERVATION CARD =============
  const renderDirectReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const businessInfo = reservation.businesses;
    const dateTime = reservation.preferred_time;
    const location = reservation.businesses?.address;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-0.5">
          {/* Row 1: Title + Status Badge */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-base">{t.tableReservation}</h4>
            {getStatusBadge(reservation)}
          </div>

          {/* Row 2: Business name with logo */}
          <div className="flex items-center gap-1.5">
            {businessInfo?.logo_url && (
              <img src={businessInfo.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
            )}
            <span className="text-sm font-medium">{businessInfo?.name}</span>
          </div>

          {/* Row 3: Date/Time */}
          {dateTime && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs">{formatDateTime(dateTime)}</span>
            </div>
          )}

          {/* Row 4: Party size */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">{reservation.party_size} {t.people}</span>
          </div>

          {/* Row 5: Location */}
          {location && (
            <button
              onClick={() => reservation.business_id && navigate(`/xartis?business=${reservation.business_id}&src=dashboard_user`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs truncate">{location}</span>
            </button>
          )}

          {/* QR Code Button - Styled like mockup */}
          {reservation.confirmation_code && !isPast && (
            <button
              type="button"
              onClick={() => qrCodes[reservation.id] && setQrDialog({
                open: true,
                qrCode: qrCodes[reservation.id],
                confirmationCode: reservation.confirmation_code || '',
                businessName: businessInfo?.name || ''
              })}
              className="mt-2 w-full flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.code}</span>
                <span className="text-sm font-bold text-foreground tracking-wider">{reservation.confirmation_code}</span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <QrCode className="h-4 w-4" />
                <span className="text-xs font-medium">QR</span>
              </div>
            </button>
          )}

          {/* Cancel Button */}
          {(reservation.status === 'pending' || reservation.status === 'accepted') && !isPast && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
            >
              {t.cancelReservation}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============= OFFER-BASED RESERVATION CARD =============
  const renderOfferReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const businessInfo = reservation.businesses;
    const dateTime = reservation.preferred_time;
    const location = reservation.businesses?.address;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-0.5">
          {/* Row 1: Business + Discount Badge + Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              {businessInfo?.logo_url && (
                <img src={businessInfo.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              )}
              <span className="font-semibold text-sm">{businessInfo?.name}</span>
              {reservation.offerPercentOff && reservation.offerPercentOff > 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-5 px-1.5">
                  -{reservation.offerPercentOff}%
                </Badge>
              )}
            </div>
            {getStatusBadge(reservation)}
          </div>

          {/* Row 2: Offer Title */}
          {reservation.offerTitle && (
            <h4 className="font-medium text-sm text-foreground">{reservation.offerTitle}</h4>
          )}

          {/* Row 3: Date/Time */}
          {dateTime && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs">{formatDateTime(dateTime)}</span>
            </div>
          )}

          {/* Row 4: Party size */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">{reservation.party_size} {t.people}</span>
          </div>

          {/* Row 5: Location */}
          {location && (
            <button
              onClick={() => reservation.business_id && navigate(`/xartis?business=${reservation.business_id}&src=dashboard_user`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs truncate">{location}</span>
            </button>
          )}

          {/* QR in Offers Button - Orange styled */}
          {!isPast && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-2 w-full h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300"
            >
              <Link to={`/dashboard-user?tab=offers${reservation.offerPurchaseId ? `&purchaseId=${reservation.offerPurchaseId}` : ''}`}>
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {t.qrInOffers}
              </Link>
            </Button>
          )}

          {/* Cancel Button */}
          {(reservation.status === 'pending' || reservation.status === 'accepted') && !isPast && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
            >
              {t.cancelReservation}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============= EVENT-BASED RESERVATION CARD =============
  const renderEventReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const eventInfo = reservation.events;
    const businessInfo = eventInfo?.businesses;
    const dateTime = reservation.preferred_time || eventInfo?.start_at;
    const location = eventInfo?.location;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-0.5">
          {/* Row 1: Business + Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              {businessInfo?.logo_url && (
                <img src={businessInfo.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              )}
              <span className="font-semibold text-sm">{businessInfo?.name}</span>
            </div>
            {getStatusBadge(reservation)}
          </div>

          {/* Row 2: Event Title */}
          {eventInfo?.title && (
            <h4 className="font-medium text-sm text-foreground">{eventInfo.title}</h4>
          )}

          {/* Row 3: Date/Time */}
          {dateTime && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs">{formatDateTime(dateTime)}</span>
            </div>
          )}

          {/* Row 4: Party size */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">{reservation.party_size} {t.people}</span>
          </div>

          {/* Row 5: Location */}
          {location && (
            <button
              onClick={() => businessInfo?.id && navigate(`/xartis?business=${businessInfo.id}&src=dashboard_user`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs truncate">{location}</span>
            </button>
          )}

          {/* Prepaid Credit Info */}
          {reservation.prepaid_min_charge_cents && reservation.prepaid_min_charge_cents > 0 && !isPast && (
            <div className="mt-2 flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">{t.prepaidCredit}</span>
              </div>
              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                €{(reservation.prepaid_min_charge_cents / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* QR Code Button - Same style as direct reservations */}
          {reservation.confirmation_code && !isPast && (
            <button
              type="button"
              onClick={() => qrCodes[reservation.id] && setQrDialog({
                open: true,
                qrCode: qrCodes[reservation.id],
                confirmationCode: reservation.confirmation_code || '',
                businessName: businessInfo?.name || ''
              })}
              className="mt-2 w-full flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.code}</span>
                <span className="text-sm font-bold text-foreground tracking-wider">{reservation.confirmation_code}</span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <QrCode className="h-4 w-4" />
                <span className="text-xs font-medium">QR</span>
              </div>
            </button>
          )}

          {/* Cancel Button */}
          {(reservation.status === 'pending' || reservation.status === 'accepted') && !isPast && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
            >
              {t.cancelReservation}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const type = getReservationType(reservation);
    switch (type) {
      case 'direct':
        return renderDirectReservationCard(reservation, isPast);
      case 'offer':
        return renderOfferReservationCard(reservation, isPast);
      case 'event':
        return renderEventReservationCard(reservation, isPast);
    }
  };

  // Categorize reservations
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
          {upcomingReservations.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">{t.noReservations}</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {renderSection(
                directReservations,
                <Building2 className="h-4 w-4" />,
                t.directReservationsSection,
                t.noDirectReservations,
                'text-blue-700 dark:text-blue-400'
              )}

              {renderSection(
                offerReservations,
                <Tag className="h-4 w-4" />,
                t.offerReservationsSection,
                t.noOfferReservations,
                'text-orange-700 dark:text-orange-400'
              )}

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
                    <span className="font-medium">{t.history} ({pastReservations.length})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid gap-3">
                  {pastReservations.map(reservation => renderReservationCard(reservation, true))}
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
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!cancelDialog.reservationId) return;
                await handleCancelReservation(cancelDialog.reservationId);
              }}
            >
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog - Premium Style */}
      <Dialog open={qrDialog?.open || false} onOpenChange={(open) => !open && setQrDialog(null)}>
        <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent max-h-[90vh] overflow-y-auto flex flex-col items-start">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
            <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
              <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
              {qrDialog?.businessName && (
                <p className="text-white/70 text-[10px] mt-0.5">by {qrDialog.businessName}</p>
              )}
            </div>

            <div className="bg-white/95 backdrop-blur-xl px-4 py-3">
              {qrDialog?.confirmationCode && (
                <div className="text-center mb-2">
                  <p className="text-[8px] text-[#64748b] uppercase tracking-wide mb-0.5">
                    {language === 'el' ? 'Κωδικός' : 'Code'}
                  </p>
                  <p className="text-xl font-bold text-[#102b4a] tracking-widest">
                    {qrDialog.confirmationCode}
                  </p>
                </div>
              )}

              {qrDialog?.qrCode && (
                <div className="flex flex-col items-center">
                  <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                    <img src={qrDialog.qrCode} alt="QR Code" className="w-44 h-44" />
                  </div>
                  <p className="text-[10px] text-[#64748b] mt-2 text-center">
                    {language === 'el' 
                      ? 'Παρουσιάστε αυτόν τον κωδικό QR στην επιχείρηση'
                      : 'Present this QR code at the venue'}
                  </p>
                </div>
              )}
            </div>

            <div className="relative h-6 bg-white/95">
              <svg viewBox="0 0 400 24" className="absolute bottom-0 left-0 w-full h-6" preserveAspectRatio="none">
                <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.3" />
                <path d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.5" />
              </svg>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
