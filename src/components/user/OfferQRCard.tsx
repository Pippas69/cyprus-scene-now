import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OfferQRCardProps {
  offer: {
    id: string;
    qrToken: string;
    title: string;
    businessName: string;
    businessLogo?: string | null;
    discountPercent?: number;
    expiresAt: string;
    purchasedAt: string;
    isCredit?: boolean;
    balanceRemaining?: number;
    // Reservation guest data
    guests?: { guest_name: string; qr_code_token: string }[];
    hasReservation?: boolean;
    reservationDate?: string;
    reservationTime?: string;
  } | null;
  language: "el" | "en";
  onClose: () => void;
}

export const OfferQRCard = ({ offer, language, onClose }: OfferQRCardProps) => {
  const isMobile = useIsMobile();
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);

  if (!offer) return null;

  const hasGuests = offer.guests && offer.guests.length > 1;

  const content = hasGuests ? (
    <div className="space-y-4">
      <SuccessQRCard
        type="offer"
        qrToken={offer.guests![currentGuestIndex]?.qr_code_token || offer.qrToken}
        title={offer.title}
        businessName={offer.businessName}
        businessLogo={offer.businessLogo}
        language={language}
        guestName={offer.guests![currentGuestIndex]?.guest_name}
        discountPercent={offer.discountPercent}
        expiryDate={offer.expiresAt}
        showSuccessMessage={false}
        onClose={onClose}
      />
      {offer.guests!.length > 1 && (
        <div className="flex items-center justify-center gap-3 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentGuestIndex(Math.max(0, currentGuestIndex - 1))}
            disabled={currentGuestIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {offer.guests![currentGuestIndex]?.guest_name} ({currentGuestIndex + 1}/{offer.guests!.length})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentGuestIndex(Math.min(offer.guests!.length - 1, currentGuestIndex + 1))}
            disabled={currentGuestIndex === offer.guests!.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  ) : (
    <SuccessQRCard
      type="offer"
      qrToken={offer.qrToken}
      title={offer.title}
      businessName={offer.businessName}
      businessLogo={offer.businessLogo}
      language={language}
      discountPercent={offer.discountPercent}
      purchaseDate={offer.purchasedAt}
      expiryDate={offer.expiresAt}
      showSuccessMessage={false}
      onClose={onClose}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={!!offer} onOpenChange={() => onClose()}>
        <DrawerContent className="max-h-[95vh] bg-transparent border-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{offer.title}</DrawerTitle>
            <DrawerDescription>Offer QR Code</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!offer} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent">
        <VisuallyHidden>
          <DialogTitle>{offer.title}</DialogTitle>
        </VisuallyHidden>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default OfferQRCard;