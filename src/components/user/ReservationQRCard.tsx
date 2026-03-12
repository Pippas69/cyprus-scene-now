import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CreditCard, QrCode, ChevronLeft, ChevronRight, User, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import QRCode from "qrcode";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReservationQRCardProps {
  reservation: {
    qrCodeToken?: string;
    qrCode?: string;
    confirmationCode: string;
    businessName: string;
    businessLogo?: string | null;
    reservationDate?: string;
    reservationTime?: string;
    partySize?: number;
    seatingType?: string;
    eventTitle?: string;
    prepaidAmountCents?: number;
    isEventBased?: boolean;
    // Guest navigation
    guestName?: string;
    totalGuests?: number;
    currentGuestIndex?: number;
    onPrevGuest?: () => void;
    onNextGuest?: () => void;
  } | null;
  language: "el" | "en";
  onClose: () => void;
}

const translations = {
  el: {
    scanAtVenue: "Σαρώστε στην επιχείρηση",
    downloadQR: "QR Εικόνα",
    date: "ΗΜΕΡΟΜΗΝΙΑ",
    time: "ΩΡΑ",
    reservation: "ΚΡΑΤΗΣΗ",
    code: "ΚΩΔΙΚΟΣ",
  },
  en: {
    scanAtVenue: "Scan at the venue",
    downloadQR: "QR Image",
    date: "DATE",
    time: "TIME",
    reservation: "RESERVATION",
    code: "CODE",
  },
};

export const ReservationQRCard = ({ reservation, language, onClose }: ReservationQRCardProps) => {
  const text = translations[language];
  const dateLocale = language === "el" ? el : enUS;
  const isMobile = useIsMobile();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reservation?.qrCodeToken) {
      QRCode.toDataURL(reservation.qrCodeToken, {
        width: 512,
        margin: 2,
        color: {
          dark: "#102b4a",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    } else if (reservation?.qrCode) {
      setQrDataUrl(reservation.qrCode);
    }
  }, [reservation?.qrCodeToken, reservation?.qrCode]);

  const handleDownloadQR = () => {
    if (!qrDataUrl || !reservation) return;
    const link = document.createElement("a");
    link.download = `fomo-reservation-${reservation.confirmationCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyLink = async () => {
    if (!reservation?.qrCodeToken) return;
    const shareUrl = `${window.location.origin}/reservation-view/${reservation.qrCodeToken}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reservationDateObj = reservation?.reservationDate ? new Date(reservation.reservationDate) : null;
  const locale = language === 'el' ? 'el-GR' : 'en-GB';
  const timeZone = 'Europe/Nicosia';

  const formattedDate = reservationDateObj
    ? new Intl.DateTimeFormat(locale, {
        timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(reservationDateObj)
    : '';

  const formattedTime = reservationDateObj
    ? new Intl.DateTimeFormat(locale, {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(reservationDateObj)
    : reservation?.reservationTime || "";

  const formatPrice = (cents: number) => {
    if (cents === 0) return language === "el" ? "Δωρεάν" : "Free";
    return `€${(cents / 100).toFixed(2)}`;
  };

  const isEventBased = reservation?.isEventBased || !!reservation?.eventTitle;
  const hasGuestNav = reservation?.guestName && (reservation?.totalGuests || 0) > 0;

  // Build the info grid based on mode
  const renderInfoGrid = () => {
    if (hasGuestNav) {
      // Guest mode: Name, Date, Time
      return (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
            <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
            <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{language === "el" ? "ΟΝΟΜΑ" : "NAME"}</p>
            <p className="text-xs font-semibold text-[#102b4a] truncate">{reservation?.guestName}</p>
          </div>
          <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
            <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
            <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
            <p className="text-xs font-semibold text-[#102b4a]">{formattedDate || '-'}</p>
          </div>
          <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
            <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
            <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
            <p className="text-xs font-semibold text-[#102b4a]">{formattedTime || '-'}</p>
          </div>
        </div>
      );
    }

    // Default mode: Date, Time, Code/Amount
    const thirdColumnLabel = isEventBased ? text.reservation : text.code;
    const thirdColumnValue = isEventBased 
      ? formatPrice(reservation?.prepaidAmountCents || 0)
      : reservation?.confirmationCode || "";

    return (
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
          <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
          <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
          <p className="text-xs font-semibold text-[#102b4a]">{formattedDate || '-'}</p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
          <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
          <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
          <p className="text-xs font-semibold text-[#102b4a]">{formattedTime || '-'}</p>
        </div>
        <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
          {isEventBased ? (
            <CreditCard className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
          ) : (
            <QrCode className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
          )}
          <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{thirdColumnLabel}</p>
          <p className="text-xs font-semibold text-[#102b4a] truncate">{thirdColumnValue}</p>
        </div>
      </div>
    );
  };

  const cardContent = (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
        <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
        {reservation?.businessName && (
          <p className="text-white/70 text-[10px] mt-0.5">by {reservation.businessName}</p>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-white backdrop-blur-xl px-4 py-3">
        <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
          {reservation?.eventTitle || (language === "el" ? "Κράτηση Τραπεζιού" : "Table Reservation")}
        </h2>

        {renderInfoGrid()}

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
              <img src={qrDataUrl} alt="Reservation QR Code" className="w-44 h-44" />
            </div>
            <p className="text-[10px] text-[#64748b] mt-2 text-center">{text.scanAtVenue}</p>
          </div>
        )}

        {/* Guest navigation */}
        {hasGuestNav && (reservation?.totalGuests || 0) > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={reservation?.onPrevGuest}
              disabled={!reservation?.onPrevGuest}
              className="h-7 w-7 p-0 border-[#3ec3b7] text-[#102b4a] bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-[#102b4a]">
              {(reservation?.currentGuestIndex || 0) + 1}/{reservation?.totalGuests}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={reservation?.onNextGuest}
              disabled={!reservation?.onNextGuest}
              className="h-7 w-7 p-0 border-[#3ec3b7] text-[#102b4a] bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Copy link (ticket-style) */}
        <div className="mt-2 flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 bg-[#f0f9ff] rounded-lg px-3 py-2 text-[10px] text-[#64748b] font-mono truncate">
            {`${window.location.origin}/reservation-view/${reservation?.qrCodeToken || ''}`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 px-3 shrink-0"
          >
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? (language === "el" ? "Αντιγράφηκε!" : "Copied!") : (language === "el" ? "Αντιγραφή" : "Copy")}
          </Button>
        </div>
      </div>

      {/* Wave Decoration */}
      <div className="relative h-6 bg-white dark:bg-white">
        <svg viewBox="0 0 400 24" className="absolute bottom-0 left-0 w-full h-6" preserveAspectRatio="none">
          <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.3" />
          <path d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.5" />
        </svg>
      </div>

      {/* Business Logo */}
      {reservation?.businessLogo && (
        <div className="relative h-24 overflow-hidden">
          <img src={reservation.businessLogo} alt={reservation.businessName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102b4a]/60 to-transparent" />
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={!!reservation} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {cardContent}
      </DialogContent>
    </Dialog>
  );
};

export default ReservationQRCard;
