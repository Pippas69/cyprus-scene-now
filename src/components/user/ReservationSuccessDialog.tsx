import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { SuccessQRCard } from '@/components/ui/SuccessQRCard';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReservationSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    confirmation_code: string;
    qr_code_token: string;
    reservation_name: string;
    party_size: number;
    preferred_time: string;
    business_name: string;
    business_logo?: string | null;
    guests?: { guest_name: string; qr_code_token: string }[];
  } | null;
  language: 'el' | 'en';
}

export const ReservationSuccessDialog = ({
  open,
  onOpenChange,
  reservation,
  language,
}: ReservationSuccessDialogProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);

  if (!reservation) return null;

  const guests = reservation.guests || [];
  const hasGuests = guests.length > 0;

  const content = hasGuests ? (
    <div className="space-y-3">
      {/* Carousel navigation above the card */}
      {guests.length > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentGuestIndex(Math.max(0, currentGuestIndex - 1))}
            disabled={currentGuestIndex === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            {currentGuestIndex + 1}/{guests.length}
            <span className="ml-1 text-foreground font-semibold">
              — {guests[currentGuestIndex]?.guest_name}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentGuestIndex(Math.min(guests.length - 1, currentGuestIndex + 1))}
            disabled={currentGuestIndex === guests.length - 1}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <SuccessQRCard
        type="reservation"
        qrToken={guests[currentGuestIndex]?.qr_code_token || reservation.qr_code_token}
        title={language === 'el' ? 'Κράτηση Τραπεζιού' : 'Table Reservation'}
        businessName={reservation.business_name}
        language={language}
        reservationDate={reservation.preferred_time}
        confirmationCode={reservation.confirmation_code}
        partySize={reservation.party_size}
        guestName={guests[currentGuestIndex]?.guest_name}
        showSuccessMessage={currentGuestIndex === 0}
        onViewDashboard={() => { navigate('/dashboard-user?tab=reservations&subtab=direct'); onOpenChange(false); }}
        viewDashboardLabel={language === 'el' ? 'Οι Κρατήσεις Μου' : 'My Reservations'}
        onClose={() => onOpenChange(false)}
      />
    </div>
  ) : (
    <SuccessQRCard
      type="reservation"
      qrToken={reservation.qr_code_token}
      title={language === 'el' ? 'Κράτηση Τραπεζιού' : 'Table Reservation'}
      businessName={reservation.business_name}
      language={language}
      reservationDate={reservation.preferred_time}
      confirmationCode={reservation.confirmation_code}
      partySize={reservation.party_size}
      showSuccessMessage={true}
      onViewDashboard={() => { navigate('/dashboard-user?tab=reservations&subtab=direct'); onOpenChange(false); }}
      viewDashboardLabel={language === 'el' ? 'Οι Κρατήσεις Μου' : 'My Reservations'}
      onClose={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] bg-transparent border-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{language === 'el' ? 'Επιτυχής Κράτηση' : 'Reservation Success'}</DrawerTitle>
            <DrawerDescription>Your reservation was successful</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent">
        {content}
      </DialogContent>
    </Dialog>
  );
};