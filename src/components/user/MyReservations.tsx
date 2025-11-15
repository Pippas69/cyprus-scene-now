import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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
    }
    setLoading(false);
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservationId)
        .eq('user_id', userId);

      if (error) throw error;

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
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {reservations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{t.noReservations}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3">
                      {reservation.events?.businesses?.logo_url && (
                        <img
                          src={reservation.events.businesses.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      {reservation.events?.title || 'Unknown Event'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {reservation.events?.businesses?.name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {reservation.preferred_time
                          ? format(new Date(reservation.preferred_time), 'PPP p')
                          : format(new Date(reservation.events?.start_at), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {reservation.party_size} {t.people}
                      </span>
                    </div>
                    {reservation.events?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{reservation.events.location}</span>
                      </div>
                    )}
                    {reservation.seating_preference && reservation.seating_preference !== 'no_preference' && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{t[reservation.seating_preference]}</span>
                      </div>
                    )}
                    {reservation.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{reservation.phone_number}</span>
                      </div>
                    )}
                  </div>

                  {reservation.special_requests && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">{t.specialRequests}:</p>
                      <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
                    </div>
                  )}

                  {reservation.business_notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">{t.businessNotes}:</p>
                      <p className="text-sm text-muted-foreground">{reservation.business_notes}</p>
                    </div>
                  )}

                  {reservation.status === 'pending' && (
                    <div className="pt-3 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t.cancelReservation}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, reservationId: null })}
      >
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
