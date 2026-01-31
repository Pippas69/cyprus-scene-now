import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { SuccessQRCard } from '@/components/ui/SuccessQRCard';

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

  if (!reservation) return null;

  const content = (
    <SuccessQRCard
      type="reservation"
      qrToken={reservation.qr_code_token}
      title={language === 'el' ? 'Κράτηση Τραπεζιού' : 'Table Reservation'}
      businessName={reservation.business_name}
      businessLogo={reservation.business_logo}
      language={language}
      reservationDate={reservation.preferred_time}
      confirmationCode={reservation.confirmation_code}
      partySize={reservation.party_size}
      showSuccessMessage={true}
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
