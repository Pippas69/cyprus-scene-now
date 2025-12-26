import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Ticket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface TicketQRDialogProps {
  ticket: {
    id: string;
    qrToken: string;
    tierName: string;
    eventTitle: string;
  } | null;
  onClose: () => void;
}

const t = {
  el: {
    yourTicket: "Το Εισιτήριό Σας",
    scanAtEntry: "Σαρώστε αυτό το QR στην είσοδο",
    download: "Λήψη",
  },
  en: {
    yourTicket: "Your Ticket",
    scanAtEntry: "Scan this QR code at entry",
    download: "Download",
  },
};

export const TicketQRDialog = ({ ticket, onClose }: TicketQRDialogProps) => {
  const { language } = useLanguage();
  const text = t[language];
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  const handleDownload = () => {
    if (!qrDataUrl || !ticket) return;
    
    const link = document.createElement("a");
    link.download = `ticket-${ticket.eventTitle.slice(0, 20)}-${ticket.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
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
            <p className="text-sm text-primary">{ticket?.tierName}</p>
          </div>

          {qrDataUrl && (
            <div className="p-4 bg-white rounded-lg shadow-md">
              <img src={qrDataUrl} alt="Ticket QR Code" className="w-64 h-64" />
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {text.scanAtEntry}
          </p>

          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            {text.download}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketQRDialog;
