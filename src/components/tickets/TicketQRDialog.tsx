import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent } from
"@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Ticket, Copy, User } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { generateTicketPdf } from "@/lib/ticketPdf";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { toast } from "sonner";

interface TicketQRDialogProps {
  ticket: {
    id: string;
    qrToken: string;
    tierName: string;
    eventTitle: string;
    eventDate?: string;
    eventLocation?: string;
    customerName?: string;
    purchaseDate?: string;
    pricePaid?: string;
    businessName?: string;
    eventCoverImage?: string;
    eventTime?: string;
    guestName?: string;
    guestAge?: number;
  } | null;
  onClose: () => void;
}

const t = {
  el: {
    scanAtEntry: "Σαρώστε στην είσοδο",
    downloadQR: "QR Εικόνα",
    downloadPdf: "PDF Εισιτήριο",
    name: "ΟΝΟΜΑ",
    dateAndTime: "ΗΜ/ΝΙΑ & ΩΡΑ",
    ticket: "Εισιτήριο",
    copyLink: "Αντιγραφή",
    copied: "Ο σύνδεσμος αντιγράφηκε!",
    guest: "ΚΑΛΕΣΜΕΝΟΣ",
    age: "ΗΛΙΚΙΑ"
  },
  en: {
    scanAtEntry: "Scan at entry",
    downloadQR: "QR Image",
    downloadPdf: "PDF Ticket",
    name: "NAME",
    dateAndTime: "DATE & TIME",
    ticket: "Ticket",
    copyLink: "Copy",
    copied: "Link copied!",
    guest: "GUEST",
    age: "AGE"
  }
};

export const TicketQRDialog = ({ ticket, onClose }: TicketQRDialogProps) => {
  const { language } = useLanguage();
  const text = t[language];
  const dateLocale = language === "el" ? el : enUS;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (ticket?.qrToken) {
      QRCode.toDataURL(ticket.qrToken, {
        width: 512,
        margin: 2,
        color: {
          dark: "#102b4a",
          light: "#ffffff"
        }
      }).
      then(setQrDataUrl).
      catch(console.error);
    }
  }, [ticket?.qrToken]);

  const handleDownloadQR = () => {
    if (!qrDataUrl || !ticket) return;

    const link = document.createElement("a");
    const guestSuffix = ticket.guestName ? `-${ticket.guestName.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    link.download = `fomo-qr-${ticket.eventTitle.slice(0, 20)}${guestSuffix}-${ticket.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyLink = async () => {
    if (!ticket) return;
    const shareUrl = `${window.location.origin}/ticket-view/${ticket.qrToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success(text.copied);
  };

  const handleDownloadPdf = async () => {
    if (!ticket) return;
    setIsGeneratingPdf(true);
    try {
      await generateTicketPdf({
        eventTitle: ticket.eventTitle,
        eventDate: ticket.eventDate || "",
        eventLocation: ticket.eventLocation || "",
        tierName: ticket.tierName,
        ticketId: ticket.id,
        qrToken: ticket.qrToken,
        customerName: ticket.guestName || ticket.customerName,
        purchaseDate: ticket.purchaseDate,
        pricePaid: ticket.pricePaid,
        businessName: ticket.businessName
      });
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Parse date and time
  const eventDateObj = ticket?.eventDate ? new Date(ticket.eventDate) : null;
  const formattedDate = eventDateObj ?
  format(eventDateObj, "EEE, d MMM", { locale: dateLocale }) :
  "";
  const formattedTime = eventDateObj ?
  format(eventDateObj, "HH:mm", { locale: dateLocale }) :
  "";
  const displayName = ticket?.guestName || ticket?.customerName || "-";
  const displayDateTime = eventDateObj ? `${formattedDate}  ${formattedTime}` : "-";

  return (
    <Dialog open={!!ticket} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent max-h-[90vh] overflow-y-auto flex flex-col items-start">
        {/* Ticket Card Container - Start from top on mobile */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
          {/* Header with ΦΟΜΟ branding - Compact */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
            <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            {ticket?.businessName &&
            <p className="text-white/70 text-[10px] mt-0.5">by {ticket.businessName}</p>
            }
          </div>

          {/* Main Content - Frosted Glass Effect - Compact */}
          <div className="bg-white dark:bg-white backdrop-blur-xl px-4 py-3">
            {/* Event Title */}
            <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
              {ticket?.eventTitle}
            </h2>

            {/* Info Grid - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Name */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.name}</p>
                <p className="text-xs font-semibold text-[#102b4a] truncate">{displayName}</p>
                {ticket?.guestAge !== undefined && ticket?.guestAge !== null &&
                <p className="text-[9px] text-[#64748b]">{text.age}: {ticket.guestAge}</p>
                }
              </div>

              {/* Date & Time */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.dateAndTime}</p>
                <p className="text-[11px] font-semibold text-[#102b4a] leading-tight">{displayDateTime}</p>
              </div>

              {/* Ticket Tier */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Ticket className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.ticket}</p>
                <p className="text-xs font-semibold text-[#102b4a] truncate">{ticket?.tierName}</p>
              </div>
            </div>

            {/* QR Code - Slightly smaller */}
            {qrDataUrl &&
            <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                  <img
                  src={qrDataUrl}
                  alt="Ticket QR Code"
                  className="w-44 h-44" />
                
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 text-center">
                  {text.scanAtEntry}
                </p>
              </div>
            }

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              






              
              






              
            </div>

            {/* Copyable Link */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-[#f0f9ff] rounded-lg px-3 py-2 text-[10px] text-[#64748b] font-mono truncate">
                {`${window.location.origin}/ticket-view/${ticket?.qrToken}`}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 px-3 shrink-0">
                
                <Copy className="h-3 w-3 mr-1" />
                {text.copyLink}
              </Button>
            </div>
          </div>

        {/* Wave Decoration */}
        <div className="relative h-6 bg-white dark:bg-white rounded-b-2xl">
          <svg
              viewBox="0 0 400 24"
              className="absolute bottom-0 left-0 w-full h-6"
              preserveAspectRatio="none">
              
            <path
                d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z"
                fill="#3ec3b7"
                opacity="0.3" />
              
            <path
                d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z"
                fill="#3ec3b7"
                opacity="0.5" />
              
          </svg>
        </div>
      </div>
      </DialogContent>
    </Dialog>);

};

export default TicketQRDialog;