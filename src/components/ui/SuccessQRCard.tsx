import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Calendar, Clock, CreditCard, QrCode as QrCodeIcon, Ticket, Tag, Users, User, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

export type SuccessType = "ticket" | "reservation" | "offer" | "event_reservation";

interface SuccessQRCardProps {
  type: SuccessType;
  qrToken: string;
  title: string;
  businessName: string;
  businessLogo?: string | null;
  language: "el" | "en";
  // For tickets
  ticketTier?: string;
  eventDate?: string;
  // For reservations
  reservationDate?: string;
  reservationTime?: string;
  confirmationCode?: string;
  partySize?: number;
  // For offers
  discountPercent?: number;
  purchaseDate?: string;
  expiryDate?: string;
  // For event reservations
  prepaidAmountCents?: number;
  // Guest info (for individual tickets in group bookings)
  guestName?: string;
  guestAge?: number;
  // Seat info (for seated/performance events)
  seatZone?: string;
  seatRow?: string;
  seatNumber?: number;
  // Actions
  onDownloadQR?: () => void;
  onClose?: () => void;
  onViewDashboard?: () => void;
  viewDashboardLabel?: string;
  // Show success animation
  showSuccessMessage?: boolean;
}

const translations = {
  el: {
    success: {
      ticket: "Η λήψη εισιτηρίων έγινε επιτυχώς!",
      reservation: "Η κράτησή σας έγινε επιτυχώς!",
      offer: "Η προσφορά εξαργυρώθηκε επιτυχώς!",
      event_reservation: "Η κράτησή σας έγινε επιτυχώς!",
    },
    scanAt: {
      ticket: "Σαρώστε στην είσοδο",
      reservation: "Σαρώστε στην επιχείρηση",
      offer: "Δείξτε αυτόν τον κώδικα στο κατάστημα",
      event_reservation: "Σαρώστε στην επιχείρηση",
    },
    downloadQR: "QR Εικόνα",
    copyLink: "Αντιγραφή",
    copied: "Αντιγράφηκε!",
    date: "ΗΜΕΡΟΜΗΝΙΑ",
    time: "ΩΡΑ",
    name: "ΟΝΟΜΑ",
    code: "ΚΩΔΙΚΟΣ",
    seat: "ΘΕΣΗ",
    ticket: "ΕΙΣΙΤΗΡΙΟ",
    reservation: "ΚΡΑΤΗΣΗ",
    offer: "ΠΡΟΣΦΟΡΑ",
    purchase: "ΑΓΟΡΑ",
    expiry: "ΛΗΞΗ",
    people: "ΑΤΟΜΑ",
    done: "Κλείσιμο",
  },
  en: {
    success: {
      ticket: "Ticket download successful!",
      reservation: "Your reservation was successful!",
      offer: "Offer redeemed successfully!",
      event_reservation: "Your reservation was successful!",
    },
    scanAt: {
      ticket: "Scan at entry",
      reservation: "Scan at the venue",
      offer: "Show this code at the venue",
      event_reservation: "Scan at the venue",
    },
    downloadQR: "QR Image",
    copyLink: "Copy",
    copied: "Copied!",
    date: "DATE",
    time: "TIME",
    name: "NAME",
    code: "CODE",
    seat: "SEAT",
    ticket: "TICKET",
    reservation: "RESERVATION",
    offer: "OFFER",
    purchase: "PURCHASE",
    expiry: "EXPIRY",
    people: "PEOPLE",
    done: "Close",
  },
};

export const SuccessQRCard = ({
  type,
  qrToken,
  title,
  businessName,
  businessLogo,
  language,
  ticketTier,
  eventDate,
  reservationDate,
  reservationTime,
  confirmationCode,
  partySize,
  discountPercent,
  purchaseDate,
  expiryDate,
  prepaidAmountCents,
  guestName,
  guestAge,
  seatZone,
  seatRow,
  seatNumber,
  onDownloadQR,
  onClose,
  onViewDashboard,
  viewDashboardLabel,
  showSuccessMessage = true,
}: SuccessQRCardProps) => {
  const text = translations[language];
  const dateLocale = language === "el" ? el : enUS;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (qrToken) {
      QRCode.toDataURL(qrToken, {
        width: 512,
        margin: 2,
        color: {
          dark: "#102b4a",
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [qrToken]);

  const handleDownload = () => {
    if (onDownloadQR) {
      onDownloadQR();
    } else if (qrDataUrl) {
      const link = document.createElement("a");
      link.download = `fomo-${type}-qr.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  // Format helpers
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE, d MMM", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "HH:mm", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return language === "el" ? "Δωρεάν" : "Free";
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Render info grid based on type
  const renderInfoGrid = () => {
    switch (type) {
      case "ticket": {
        const ticketHolderName = guestName || "-";
        const ticketDate = eventDate ? formatDate(eventDate) : "-";
        const ticketTime = eventDate ? formatTime(eventDate) : "-";
        const hasSeat = seatZone || seatRow || seatNumber;
        const seatLabel = hasSeat
          ? [seatRow && `${seatRow}`, seatNumber && `${seatNumber}`].filter(Boolean).join("")
          : null;

        return (
          <>
            <div className={`grid ${hasSeat ? "grid-cols-2" : "grid-cols-3"} gap-2 mb-2`}>
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.name}</p>
                <p className="text-xs font-semibold text-[#102b4a] truncate">{ticketHolderName}</p>
              </div>
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
                <p className="text-[11px] font-semibold text-[#102b4a] leading-tight">{ticketDate}</p>
              </div>
              {!hasSeat && (
                <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                  <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                  <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
                  <p className="text-xs font-semibold text-[#102b4a] truncate">{ticketTime}</p>
                </div>
              )}
            </div>
            {hasSeat && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                  <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                  <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
                  <p className="text-xs font-semibold text-[#102b4a] truncate">{ticketTime}</p>
                </div>
                <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                  <Ticket className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                  <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.seat}</p>
                  <p className="text-xs font-semibold text-[#102b4a] truncate">
                    {seatZone && <span className="text-[10px] text-[#64748b]">{seatZone} </span>}
                    {seatLabel}
                  </p>
                </div>
              </div>
            )}
          </>
        );
      }

      case "reservation":
        return (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
              <p className="text-xs font-semibold text-[#102b4a]">
                {reservationDate ? formatDate(reservationDate) : "-"}
              </p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
              <p className="text-xs font-semibold text-[#102b4a]">
                {reservationTime || (reservationDate ? formatTime(reservationDate) : "-")}
              </p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <QrCodeIcon className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.code}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{confirmationCode || "-"}</p>
            </div>
          </div>
        );

      case "offer": {
        const offerHolderName = guestName || (language === "el" ? "Εσύ" : "You");
        const offerLabel = discountPercent ? `-${discountPercent}%` : title;
        const offerExpiry = expiryDate ? formatShortDate(expiryDate) : (language === "el" ? "Ανοιχτή" : "Open");
        return (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.name}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{offerHolderName}</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Tag className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.offer}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{offerLabel}</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.expiry}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{offerExpiry}</p>
            </div>
          </div>
        );
      }

      case "event_reservation":
        return (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
              <p className="text-xs font-semibold text-[#102b4a]">
                {reservationDate ? formatDate(reservationDate) : "-"}
              </p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
              <p className="text-xs font-semibold text-[#102b4a]">
                {reservationDate ? formatTime(reservationDate) : "-"}
              </p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <CreditCard className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.reservation}</p>
              <p className="text-xs font-semibold text-[#102b4a]">
                {prepaidAmountCents !== undefined ? formatPrice(prepaidAmountCents) : "-"}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto">
      {/* Header with ΦΟΜΟ branding */}
      <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
        <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
        {businessName && (
          <p className="text-white/70 text-[10px] mt-0.5">by {businessName}</p>
        )}
      </div>

      {/* Main Content - Frosted Glass Effect */}
      <div className="bg-white dark:bg-white backdrop-blur-xl px-4 py-3">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm font-semibold text-green-700">
              {text.success[type]}
            </p>
          </div>
        )}

        {/* Title */}
        <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
          {title}
        </h2>

        {/* Guest Name & Age (not for offers - shown in grid instead) */}
        {type !== "ticket" && type !== "offer" && guestName && (
          <div className="bg-[#f0f9ff] rounded-lg p-2 mb-3 flex items-center justify-center gap-2">
            <User className="h-4 w-4 text-[#3ec3b7]" />
            <span className="text-sm font-semibold text-[#102b4a]">{guestName}</span>
            {guestAge && (
              <span className="text-[10px] text-[#64748b]">({guestAge})</span>
            )}
          </div>
        )}

        {/* Info Grid */}
        {renderInfoGrid()}

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="w-44 h-44"
              />
            </div>
            <p className="text-[10px] text-[#64748b] mt-2 text-center">
              {text.scanAt[type]}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button 
            onClick={handleDownload}
            variant="outline"
            className="flex-1 border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 text-xs px-2"
          >
            <Download className="h-3 w-3 mr-1" />
            {text.downloadQR}
          </Button>
          {onViewDashboard && viewDashboardLabel && (
            <Button 
              onClick={onViewDashboard}
              className="flex-1 bg-[#102b4a] hover:bg-[#1a3d5c] text-white h-8 text-xs px-2"
            >
              {viewDashboardLabel}
            </Button>
          )}
          {!onViewDashboard && onClose && (
            <Button 
              onClick={onClose}
              className="flex-1 bg-[#102b4a] hover:bg-[#1a3d5c] text-white h-8 text-xs px-2"
            >
              {text.done}
            </Button>
          )}
        </div>
      </div>

      {/* Wave Decoration */}
      <div className="relative h-6 bg-white dark:bg-white rounded-b-2xl">
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
    </div>
  );
};

export default SuccessQRCard;
