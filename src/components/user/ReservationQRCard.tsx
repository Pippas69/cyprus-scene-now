import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface ReservationQRCardProps {
  reservation: {
    qrCode: string;
    confirmationCode: string;
    businessName: string;
    businessLogo?: string | null;
    reservationDate?: string;
    reservationTime?: string;
    partySize?: number;
    seatingType?: string;
  } | null;
  language: "el" | "en";
  onClose: () => void;
}

const translations = {
  el: {
    scanAtVenue: "Παρουσιάστε αυτόν τον κωδικό QR στην επιχείρηση",
    downloadQR: "QR Εικόνα",
    date: "Ημερομηνία",
    time: "Ώρα",
    party: "Άτομα",
    code: "Κωδικός",
  },
  en: {
    scanAtVenue: "Present this QR code at the venue",
    downloadQR: "QR Image",
    date: "Date",
    time: "Time",
    party: "Party",
    code: "Code",
  },
};

export const ReservationQRCard = ({ reservation, language, onClose }: ReservationQRCardProps) => {
  const text = translations[language];
  const dateLocale = language === "el" ? el : enUS;

  const handleDownloadQR = () => {
    if (!reservation?.qrCode) return;
    
    const link = document.createElement("a");
    link.download = `fomo-reservation-${reservation.confirmationCode}.png`;
    link.href = reservation.qrCode;
    link.click();
  };

  // Parse date
  const reservationDateObj = reservation?.reservationDate ? new Date(reservation.reservationDate) : null;
  const formattedDate = reservationDateObj 
    ? format(reservationDateObj, "EEE, d MMM", { locale: dateLocale })
    : "";

  return (
    <Dialog open={!!reservation} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-transparent">
        {/* Reservation Card Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Header with ΦΟΜΟ branding */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-6 py-5 text-center">
            <h1 className="text-2xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            {reservation?.businessName && (
              <p className="text-white/70 text-xs mt-1">by {reservation.businessName}</p>
            )}
          </div>

          {/* Main Content - Frosted Glass Effect */}
          <div className="bg-white/95 backdrop-blur-xl px-6 py-5">
            {/* Confirmation Code - Prominent Display */}
            <div className="text-center mb-4">
              <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{text.code}</p>
              <p className="text-3xl font-bold text-[#102b4a] tracking-widest">
                {reservation?.confirmationCode}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Date */}
              <div className="bg-[#f0f9ff] rounded-xl p-3 text-center">
                <Calendar className="h-4 w-4 text-[#3ec3b7] mx-auto mb-1" />
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedDate || '-'}</p>
              </div>
              
              {/* Time */}
              <div className="bg-[#f0f9ff] rounded-xl p-3 text-center">
                <Clock className="h-4 w-4 text-[#3ec3b7] mx-auto mb-1" />
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
                <p className="text-sm font-semibold text-[#102b4a]">{reservation?.reservationTime || '-'}</p>
              </div>
              
              {/* Party Size */}
              <div className="bg-[#f0f9ff] rounded-xl p-3 text-center">
                <Users className="h-4 w-4 text-[#3ec3b7] mx-auto mb-1" />
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide">{text.party}</p>
                <p className="text-sm font-semibold text-[#102b4a]">
                  {reservation?.partySize || 1}
                </p>
              </div>
            </div>

            {/* QR Code */}
            {reservation?.qrCode && (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-[#3ec3b7]">
                  <img 
                    src={reservation.qrCode} 
                    alt="Reservation QR Code" 
                    className="w-56 h-56"
                  />
                </div>
                <p className="text-xs text-[#64748b] mt-3 text-center">
                  {text.scanAtVenue}
                </p>
              </div>
            )}

            {/* Download Button */}
            <div className="flex gap-2 mt-5">
              <Button 
                variant="outline" 
                onClick={handleDownloadQR} 
                className="flex-1 border-[#3ec3b7] text-[#102b4a] hover:bg-[#3ec3b7]/10"
              >
                <Download className="h-4 w-4 mr-2" />
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
