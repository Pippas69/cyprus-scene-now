import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Ticket, FileText } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { generateTicketPdf } from "@/lib/ticketPdf";

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
  } | null;
  onClose: () => void;
}

const t = {
  el: {
    yourTicket: "Το Εισιτήριό Σας",
    scanAtEntry: "Σαρώστε αυτό το QR στην είσοδο",
    downloadQR: "QR Εικόνα",
    downloadPdf: "PDF Εισιτήριο",
  },
  en: {
    yourTicket: "Your Ticket",
    scanAtEntry: "Scan this QR code at entry",
    downloadQR: "QR Image",
    downloadPdf: "PDF Ticket",
  },
};

export const TicketQRDialog = ({ ticket, onClose }: TicketQRDialogProps) => {
  const { language } = useLanguage();
  const text = t[language];
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (ticket?.qrToken) {
      QRCode.toDataURL(ticket.qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
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
    link.download = `ticket-${ticket.eventTitle.slice(0, 20)}-${ticket.id.slice(0, 8)}.png`;
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

  return (
    <Dialog open={!!ticket} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {text.yourTicket}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-center">
            <h3 className="font-semibold">{ticket?.eventTitle}</h3>
            {ticket?.businessName && (
              <p className="text-xs text-muted-foreground">by {ticket.businessName}</p>
            )}
            <p className="text-sm text-primary mt-1">{ticket?.tierName}</p>
          </div>

          {qrDataUrl && (
            <div className="p-4 bg-white rounded-lg shadow-md">
              <img src={qrDataUrl} alt="Ticket QR Code" className="w-64 h-64" />
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {text.scanAtEntry}
          </p>

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleDownloadQR} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {text.downloadQR}
            </Button>
            <Button 
              variant="default" 
              onClick={handleDownloadPdf} 
              className="flex-1"
              disabled={isGeneratingPdf}
            >
              <FileText className="h-4 w-4 mr-2" />
              {text.downloadPdf}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketQRDialog;
