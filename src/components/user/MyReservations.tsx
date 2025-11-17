import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, X, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

interface MyReservationsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyReservations = ({ userId, language }: MyReservationsProps) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; reservationId: string | null }>({
    open: false,
    reservationId: null,
  });
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

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
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        events!inner(
          id,
          title,
          start_at,
          location,
          businesses(name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setReservations(data as any);
      // Generate QR codes for each reservation
      generateQRCodes(data as any);
    }
    setLoading(false);
  };

  const generateQRCodes = async (reservations: any[]) => {
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

      toast.success(t.cancelled);
      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(t.error);
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
      error: 'Σφάλμα κατά την ακύρωση',
      specialRequests: 'Ειδικές Απαιτήσεις',
      businessNotes: 'Σημειώσεις Επιχείρησης',
      confirmationCode: 'Κωδικός Επιβεβαίωσης',
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
      error: 'Error cancelling reservation',
      specialRequests: 'Special Requests',
      businessNotes: 'Business Notes',
      confirmationCode: 'Confirmation Code',
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground mt-2">{t.description}</p>
      </div>

      {reservations.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t.noReservations}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{reservation.events?.title}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2">
                      {reservation.events?.businesses?.logo_url && (
                        <img
                          src={reservation.events.businesses.logo_url}
                          alt={reservation.events.businesses.name}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      )}
                      {reservation.events?.businesses?.name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Confirmation Code & QR Code */}
                {reservation.confirmation_code && (
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
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(reservation.events.start_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.events?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{reservation.events.location}</span>
                    </div>
                  )}
                  {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{t[reservation.seating_preference]}</span>
                    </div>
                  )}
                  {reservation.phone_number && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{reservation.phone_number}</span>
                    </div>
                  )}
                </div>

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

                {reservation.status === 'pending' && (
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
          ))}
        </div>
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
