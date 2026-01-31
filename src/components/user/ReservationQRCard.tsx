import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Clock, CreditCard, QrCode } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import QRCode from "qrcode";

interface ReservationQRCardProps {
  reservation: {
    qrCodeToken?: string;
    qrCode?: string; // Legacy: pre-generated data URL
    confirmationCode: string;
    businessName: string;
    businessLogo?: string | null;
    reservationDate?: string;
    reservationTime?: string;
    partySize?: number;
    seatingType?: string;
    // For event-based reservations
    eventTitle?: string;
    prepaidAmountCents?: number;
    isEventBased?: boolean;
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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
      // Legacy fallback
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

  // Parse date and time
  const reservationDateObj = reservation?.reservationDate ? new Date(reservation.reservationDate) : null;
  const formattedDate = reservationDateObj 
    ? format(reservationDateObj, "EEE, d MMM", { locale: dateLocale })
    : "";
  const formattedTime = reservationDateObj 
    ? format(reservationDateObj, "HH:mm", { locale: dateLocale })
    : reservation?.reservationTime || "";

  // Format price for event reservations
  const formatPrice = (cents: number) => {
    if (cents === 0) return language === "el" ? "Δωρεάν" : "Free";
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Determine the third column content
  const isEventBased = reservation?.isEventBased || !!reservation?.eventTitle;
  const thirdColumnLabel = isEventBased ? text.reservation : text.code;
  const thirdColumnValue = isEventBased 
    ? formatPrice(reservation?.prepaidAmountCents || 0)
    : reservation?.confirmationCode || "";

  return (
    <Dialog open={!!reservation} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent max-h-[90vh] overflow-y-auto flex flex-col items-start">
        {/* Reservation Card Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
          {/* Header with ΦΟΜΟ branding */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
            <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            {reservation?.businessName && (
              <p className="text-white/70 text-[10px] mt-0.5">by {reservation.businessName}</p>
            )}
          </div>

          {/* Main Content - Frosted Glass Effect */}
          <div className="bg-white/95 backdrop-blur-xl px-4 py-3">
            {/* Title - Event or Table Reservation */}
            <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
              {reservation?.eventTitle || (language === "el" ? "Κράτηση Τραπεζιού" : "Table Reservation")}
            </h2>

            {/* Info Grid - 3 columns like ticket */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Date */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedDate || '-'}</p>
              </div>
              
              {/* Time */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedTime || '-'}</p>
              </div>
              
              {/* Third Column: Code for direct, Amount for event */}
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

            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                  <img 
                    src={qrDataUrl} 
                    alt="Reservation QR Code" 
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 text-center">
                  {text.scanAtVenue}
                </p>
              </div>
            )}

            {/* Download Button - Only QR, no PDF */}
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                onClick={handleDownloadQR} 
                className="flex-1 border-[#3ec3b7] text-[#102b4a] hover:bg-[#3ec3b7]/10 h-8 text-xs px-2"
              >
                <Download className="h-3 w-3 mr-1.5 shrink-0" />
                {text.downloadQR}
              </Button>
            </div>
          </div>

          {/* Wave Decoration */}
          <div className="relative h-6 bg-white/95">
            <svg 
              viewBox="0 0 400 24" 
              className="absolute bottom-0 left-0 w-full h-6"
              preserveAspectRatio="none"
            >
              <path 
                d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" 
                fill="#3ec3b7"
                opacity="0.3"
              />
              <path 
                d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z" 
                fill="#3ec3b7"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Business Logo */}
          {reservation?.businessLogo && (
            <div className="relative h-24 overflow-hidden">
              <img 
                src={reservation.businessLogo} 
                alt={reservation.businessName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102b4a]/60 to-transparent" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationQRCard;
