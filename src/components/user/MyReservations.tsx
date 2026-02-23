import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, QrCode, Clock, ChevronDown, Building2, Ticket } from 'lucide-react';
import { el, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { toastTranslations } from '@/translations/toastTranslations';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReservationQRCard } from './ReservationQRCard';

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
}

export const MyReservations = ({ userId, language }: MyReservationsProps) => {
  const navigate = useNavigate();
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
  const [selectedReservationForQR, setSelectedReservationForQR] = useState<ReservationData | null>(null);
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

    const reservationFields = `
      id, event_id, business_id, user_id, reservation_name, party_size, status,
      created_at, checked_in_at, phone_number, preferred_time, seating_preference, special_requests,
      business_notes, confirmation_code, qr_code_token,
      seating_type_id, prepaid_min_charge_cents, prepaid_charge_status
    `;

    // Fetch offer_purchases to identify offer-based reservations (we'll exclude them)
    const { data: offerPurchases } = await supabase
      .from('offer_purchases')
      .select('reservation_id')
      .eq('user_id', userId)
      .not('reservation_id', 'is', null);

    const offerReservationIds = new Set(
      (offerPurchases || []).map(p => p.reservation_id).filter(Boolean)
    );

    // 1. Event-based reservations (upcoming)
    const { data: upcomingEventRes } = await supabase
      .from('reservations')
      .select(`
        ${reservationFields},
        events!inner(
          id, title, start_at, end_at, location, event_type,
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
          id, title, start_at, end_at, location, event_type,
          businesses(id, name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .not('event_id', 'is', null)
      .lt('events.end_at', now);

    // 3. Direct business reservations (upcoming)
    const { data: upcomingDirectRes } = await supabase
      .from('reservations')
      .select(`${reservationFields}, businesses(id, name, logo_url, address)`)
      .eq('user_id', userId)
      .is('event_id', null)
      .not('business_id', 'is', null)
      .neq('status', 'cancelled')
      .gte('preferred_time', now);

    // 4. Direct business reservations (past)
    const { data: pastDirectRes } = await supabase
      .from('reservations')
      .select(`${reservationFields}, businesses(id, name, logo_url, address)`)
      .eq('user_id', userId)
      .is('event_id', null)
      .not('business_id', 'is', null)
      .lt('preferred_time', now);

    // Filter out offer-based reservations
    const filterOutOffers = (reservations: ReservationData[]) =>
      reservations.filter(r => !offerReservationIds.has(r.id));

    const allUpcoming = filterOutOffers([
      ...(upcomingEventRes as unknown as ReservationData[] || []),
      ...(upcomingDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
      const dateA = a.events?.start_at || a.preferred_time || '';
      const dateB = b.events?.start_at || b.preferred_time || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const allPast = filterOutOffers([
      ...(pastEventRes as unknown as ReservationData[] || []),
      ...(pastDirectRes as unknown as ReservationData[] || [])
    ]).sort((a, b) => {
      const dateA = a.events?.end_at || a.preferred_time || '';
      const dateB = b.events?.end_at || b.preferred_time || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Preview-only seeding
    try {
      const hasAnyEventReservations = (upcomingEventRes?.length || 0) + (pastEventRes?.length || 0) > 0;
      const seedKey = `seeded_event_reservation_${userId}`;
      if (isPreviewOrigin && !hasAnyEventReservations && !localStorage.getItem(seedKey)) {
        localStorage.setItem(seedKey, '1');
        await supabase.functions.invoke('create-free-reservation-event', { body: {} });
        await fetchReservations();
        return;
      }
    } catch (e) {
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
      if (reservation.qr_code_token) {
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
    setCancelDialog({ open: false, reservationId: null });
    setUpcomingReservations((prev) => prev.filter((r) => r.id !== reservationId));
    toast.success(tt.reservationCancelled);

    try {
      const cancelReservation = supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .eq('user_id', userId);

      const cancelLinkedOffer = supabase
        .from('offer_purchases')
        .update({ status: 'cancelled' })
        .eq('reservation_id', reservationId)
        .neq('status', 'redeemed')
        .neq('status', 'cancelled');

      const [resResult] = await Promise.all([cancelReservation, cancelLinkedOffer]);
      if (resResult.error) throw resResult.error;

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

      supabase.functions.invoke('send-reservation-notification', {
        body: { reservationId, type: 'cancellation' }
      }).catch(console.error);

      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(tt.failed);
      fetchReservations();
    }
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
      directTab: 'Απλές Κρατήσεις',
      eventTab: 'Μέσω Εκδηλώσεων',
      noDirectReservations: 'Δεν υπάρχουν απλές κρατήσεις',
      noEventReservations: 'Δεν υπάρχουν κρατήσεις μέσω εκδηλώσεων',
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
      directTab: 'Direct Reservations',
      eventTab: 'Via Events',
      noDirectReservations: 'No direct reservations',
      noEventReservations: 'No reservations via events',
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'el' ? 'el-GR' : 'en-GB';
    const timeZone = 'Europe/Nicosia';
    const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(date);
    const month = new Intl.DateTimeFormat(locale, { timeZone, month: 'long' }).format(date);
    const time = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return language === 'el' ? `${day} ${month}, ${time}` : `${month} ${day}, ${time}`;
  };

  // ============= RESERVATION CARD (shared for direct & event) =============
  const renderReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const isEvent = !!reservation.events;
    const businessInfo = isEvent ? reservation.events?.businesses : reservation.businesses;
    const dateTime = reservation.preferred_time || reservation.events?.start_at;
    const location = isEvent ? reservation.events?.location : reservation.businesses?.address;
    const title = isEvent ? reservation.events?.title : t.tableReservation;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-0.5">
          {/* Row 1: Title + Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-base line-clamp-1">{title}</h4>
            {getStatusBadge(reservation)}
          </div>

          {/* Row 2: Business */}
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
            isEvent ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs truncate">{location}</span>
              </a>
            ) : (
              <button
                onClick={() => reservation.business_id && navigate(`/xartis?business=${reservation.business_id}&src=dashboard_user`)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs truncate">{location}</span>
              </button>
            )
          )}

          {/* QR Code + Cancel on same line */}
          {!isPast && (
            <div className="flex items-center gap-1.5 mt-2">
              {/* QR Code Button */}
              {reservation.confirmation_code && (
                <button
                  type="button"
                  onClick={() => qrCodes[reservation.id] && setSelectedReservationForQR(reservation)}
                  className="flex-1 flex items-center justify-between bg-muted/50 border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{t.code}</span>
                    <span className="text-xs font-semibold text-foreground tracking-wider">{reservation.confirmation_code}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary">
                    <QrCode className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">QR</span>
                  </div>
                </button>
              )}

              {/* Cancel Button - compact */}
              {(reservation.status === 'pending' || reservation.status === 'accepted') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[30px] text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10 px-2.5 shrink-0"
                  onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
                >
                  {t.cancelReservation}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Categorize
  const directReservations = upcomingReservations.filter(r => !r.events);
  const eventReservations = upcomingReservations.filter(r => !!r.events);

  const pastDirectReservations = pastReservations.filter(r => !r.events);
  const pastEventReservations = pastReservations.filter(r => !!r.events);

  const hasPast = pastReservations.length > 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="w-full h-auto p-1 sm:p-1.5 bg-muted/40 rounded-xl gap-0.5 sm:gap-1">
          <TabsTrigger
            value="direct"
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t.directTab}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {directReservations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="event"
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">{t.eventTab}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {eventReservations.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-4">
          {directReservations.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">{t.noDirectReservations}</p>
          ) : (
            <div className="grid gap-3">
              {directReservations.map(r => renderReservationCard(r, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="event" className="mt-4">
          {eventReservations.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">{t.noEventReservations}</p>
          ) : (
            <div className="grid gap-3">
              {eventReservations.map(r => renderReservationCard(r, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* History */}
      {hasPast && (
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
            <Tabs defaultValue="past-direct" className="w-full">
              <TabsList className="w-full h-auto gap-1 bg-muted/30 p-1 rounded-lg">
                <TabsTrigger value="past-direct" className="flex-1 text-xs px-2 py-1.5">
                  {t.directTab} ({pastDirectReservations.length})
                </TabsTrigger>
                <TabsTrigger value="past-event" className="flex-1 text-xs px-2 py-1.5">
                  {t.eventTab} ({pastEventReservations.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="past-direct" className="mt-4">
                {pastDirectReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">{t.noDirectReservations}</p>
                ) : (
                  <div className="grid gap-3">
                    {pastDirectReservations.map(r => renderReservationCard(r, true))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="past-event" className="mt-4">
                {pastEventReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">{t.noEventReservations}</p>
                ) : (
                  <div className="grid gap-3">
                    {pastEventReservations.map(r => renderReservationCard(r, true))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
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

      <ReservationQRCard
        reservation={selectedReservationForQR ? {
          qrCodeToken: selectedReservationForQR.qr_code_token || undefined,
          qrCode: qrCodes[selectedReservationForQR.id],
          confirmationCode: selectedReservationForQR.confirmation_code || '',
          businessName: selectedReservationForQR.events?.businesses?.name || selectedReservationForQR.businesses?.name || '',
          businessLogo: selectedReservationForQR.events?.businesses?.logo_url || selectedReservationForQR.businesses?.logo_url,
          reservationDate: selectedReservationForQR.preferred_time || selectedReservationForQR.events?.start_at,
          partySize: selectedReservationForQR.party_size,
          seatingType: selectedReservationForQR.seating_preference || undefined,
          eventTitle: selectedReservationForQR.events?.title,
          prepaidAmountCents: selectedReservationForQR.prepaid_min_charge_cents || 0,
          isEventBased: !!selectedReservationForQR.events,
        } : null}
        language={language}
        onClose={() => setSelectedReservationForQR(null)}
      />
    </div>
  );
};
