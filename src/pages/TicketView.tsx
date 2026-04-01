import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { Calendar, Ticket, User, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

const t = {
  el: {
    name: "ΟΝΟΜΑ",
    date: "ΗΜΕΡΟΜΗΝΙΑ",
    time: "ΩΡΑ",
    scanAtEntry: "Σαρώστε στην είσοδο",
    saveHint: "Αποθήκευσε το QR (ή κάνε screenshot). Δείξε το στην είσοδο.",
    copy: "Αντιγραφή",
    copied: "Ο σύνδεσμος αντιγράφηκε!",
    notFound: "Το εισιτήριο δεν βρέθηκε",
    used: "Χρησιμοποιημένο",
  },
  en: {
    name: "NAME",
    date: "DATE",
    time: "TIME",
    scanAtEntry: "Scan at entry",
    saveHint: "Save this QR (or screenshot). Show at entry.",
    copy: "Copy",
    copied: "Link copied!",
    notFound: "Ticket not found",
    used: "Used",
  },
};

const TicketView = () => {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const text = t[language];
  const dateLocale = language === "el" ? el : enUS;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchTicket = async () => {
      // Use the security definer RPC function — works without authentication
      const { data, error } = await supabase.rpc("get_ticket_by_token", {
        p_token: token,
      });

      const ticketData = data && data.length > 0 ? data[0] : null;
      setTicket(ticketData);
      setLoading(false);

      if (ticketData?.qr_code_token) {
        QRCode.toDataURL(ticketData.qr_code_token, {
          width: 512,
          margin: 2,
          color: { dark: "#102b4a", light: "#ffffff" },
        }).then(setQrDataUrl);
      }
    };

    fetchTicket();
  }, [token]);

  const handleCopyLink = async () => {
    if (!ticket?.qr_code_token) return;
    const shareUrl = `${window.location.origin}/ticket-view/${ticket.qr_code_token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success(text.copied);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><OceanLoader size="lg" /></div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{text.notFound}</div>;

  const eventDateObj = ticket.event_start_at ? new Date(ticket.event_start_at) : null;
  const displayName = ticket.guest_name || "-";
  const displayDate = eventDateObj ? format(eventDateObj, "EEE, d MMM", { locale: dateLocale }) : "-";
  const displayTime = eventDateObj ? format(eventDateObj, "HH:mm", { locale: dateLocale }) : "-";
  const isUsed = ticket.status === "used";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
          <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
          {ticket.business_name && <p className="text-white/70 text-[10px] mt-0.5">by {ticket.business_name}</p>}
        </div>

        <div className="bg-white dark:bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">{ticket.event_title}</h2>

          {isUsed && (
            <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-orange-50 rounded-lg">
              <Ticket className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">{text.used}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.name}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{displayName}</p>
            </div>

            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.date}</p>
              <p className="text-[11px] font-semibold text-[#102b4a] leading-tight">{displayDate}</p>
            </div>

            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Ticket className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.time}</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{displayTime}</p>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className={`p-2 bg-white rounded-xl shadow-lg border-2 ${isUsed ? 'border-orange-300 opacity-50' : 'border-[#3ec3b7]'}`}>
                <img src={qrDataUrl} alt="Ticket QR Code" className="w-44 h-44" />
              </div>
              <p className="text-[10px] text-[#64748b] mt-2">{text.scanAtEntry}</p>
              <p className="text-[8px] text-[#94a3b8] mt-1 text-center italic">{text.saveHint}</p>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-[#f0f9ff] rounded-lg px-3 py-2 text-[10px] text-[#64748b] font-mono truncate">
              {`${window.location.origin}/ticket-view/${ticket.qr_code_token}`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 px-3 shrink-0"
            >
              <Copy className="h-3 w-3 mr-1" />
              {text.copy}
            </Button>
          </div>
        </div>

        <div className="relative h-6 bg-white dark:bg-white rounded-b-2xl">
          <svg viewBox="0 0 400 24" className="absolute bottom-0 left-0 w-full h-6" preserveAspectRatio="none">
            <path d="M0,24 C100,0 300,0 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.3" />
            <path d="M0,24 C150,8 250,8 400,24 L400,24 L0,24 Z" fill="#3ec3b7" opacity="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default TicketView;