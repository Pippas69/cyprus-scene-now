import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Clock, Ticket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { generateTicketPdf } from "@/lib/ticketPdf";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

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
  } | null;
  onClose: () => void;
}

const t = {
  el: {
    scanAtEntry: "Σαρώστε στην είσοδο",
    downloadQR: "QR Εικόνα",
    downloadPdf: "PDF Εισιτήριο",
    date: "Ημερομηνία",
    time: "Ώρα",
    ticket: "Εισιτήριο",
  },
  en: {
    scanAtEntry: "Scan at entry",
    downloadQR: "QR Image",
    downloadPdf: "PDF Ticket",
    date: "Date",
    time: "Time",
    ticket: "Ticket",
  },
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
          light: "#ffffff",
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [ticket?.qrToken]);

  const handleDownloadQR = () => {
    if (!qrDataUrl || !ticket) return;
    
    const link = document.createElement("a");
    link.download = `fomo-qr-${ticket.eventTitle.slice(0, 20)}-${ticket.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
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
        customerName: ticket.customerName,
        purchaseDate: ticket.purchaseDate,
        pricePaid: ticket.pricePaid,
        businessName: ticket.businessName,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Parse date and time
  const eventDateObj = ticket?.eventDate ? new Date(ticket.eventDate) : null;
  const formattedDate = eventDateObj 
    ? format(eventDateObj, "EEE, d MMM", { locale: dateLocale })
    : "";
  const formattedTime = eventDateObj 
    ? format(eventDateObj, "HH:mm", { locale: dateLocale })
    : "";

  return (
    <Dialog open={!!ticket} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent max-h-[90vh] overflow-y-auto flex flex-col items-start">
        {/* Ticket Card Container - Start from top on mobile */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
          {/* Header with ΦΟΜΟ branding - Compact */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
            <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            {ticket?.businessName && (
              <p className="text-white/70 text-[10px] mt-0.5">by {ticket.businessName}</p>
            )}
          </div>

          {/* Main Content - Frosted Glass Effect - Compact */}
          <div className="bg-white dark:bg-white backdrop-blur-xl px-4 py-3">
            {/* Event Title */}
            <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
              {ticket?.eventTitle}
            </h2>

            {/* Info Grid - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Date */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedDate}</p>
              </div>
              
              {/* Time */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedTime}</p>
              </div>
              
              {/* Ticket Tier */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Ticket className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.ticket}</p>
                <p className="text-xs font-semibold text-[#102b4a] truncate">{ticket?.tierName}</p>
              </div>
            </div>

            {/* QR Code - Slightly smaller */}
            {qrDataUrl && (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                  <img 
                    src={qrDataUrl} 
                    alt="Ticket QR Code" 
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 text-center">
                  {text.scanAtEntry}
                </p>
              </div>
            )}

            {/* Download Buttons - Compact */}
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                onClick={handleDownloadQR} 
                className="flex-1 border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 text-xs px-2"
              >
                <Download className="h-3 w-3 mr-1.5 shrink-0" />
                {text.downloadQR}
              </Button>
              <Button 
                onClick={handleDownloadPdf} 
                className="flex-1 bg-[#102b4a] hover:bg-[#1a3d5c] text-white h-8 text-xs px-2"
                disabled={isGeneratingPdf}
              >
                <FileText className="h-3 w-3 mr-1.5 shrink-0" />
                {text.downloadPdf}
              </Button>
            </div>
          </div>

          {/* Wave Decoration */}
          <div className="relative h-6 bg-white dark:bg-white">
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

          {/* Event Cover Image */}
          {ticket?.eventCoverImage && (
            <div className="relative h-24 overflow-hidden">
              <img 
                src={ticket.eventCoverImage} 
                alt={ticket.eventTitle}
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

export default TicketQRDialog;
