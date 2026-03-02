import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { Calendar, Clock, Ticket, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TicketView = () => {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, qr_code_token, guest_name, guest_age, status, ticket_tiers(name), events(title, start_at, location, businesses(name))")
        .eq("qr_code_token", token)
        .single();
      setTicket(data);
      setLoading(false);
      if (data?.qr_code_token) {
        QRCode.toDataURL(data.qr_code_token, { width: 512, margin: 2, color: { dark: "#102b4a", light: "#ffffff" } })
          .then(setQrDataUrl);
      }
    };
    fetch();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><OceanLoader size="lg" /></div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ticket not found</div>;

  const event = ticket.events as any;
  const tier = ticket.ticket_tiers as any;
  const eventDate = event?.start_at ? new Date(event.start_at) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
          <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
          {event?.businesses?.name && <p className="text-white/70 text-[10px] mt-0.5">by {event.businesses.name}</p>}
        </div>
        <div className="bg-white dark:bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2">{event?.title}</h2>
          {ticket.guest_name && (
            <div className="bg-[#f0f9ff] rounded-lg p-2 mb-3 flex items-center justify-center gap-2">
              <User className="h-4 w-4 text-[#3ec3b7]" />
              <span className="text-sm font-semibold text-[#102b4a]">{ticket.guest_name}</span>
              {ticket.guest_age && <span className="text-[10px] text-[#64748b]">({ticket.guest_age})</span>}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase">DATE</p>
              <p className="text-xs font-semibold text-[#102b4a]">{eventDate ? format(eventDate, "EEE, d MMM") : "-"}</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase">TIME</p>
              <p className="text-xs font-semibold text-[#102b4a]">{eventDate ? format(eventDate, "HH:mm") : "-"}</p>
            </div>
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Ticket className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase">TICKET</p>
              <p className="text-xs font-semibold text-[#102b4a] truncate">{tier?.name || "-"}</p>
            </div>
          </div>
          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44" />
              </div>
              <p className="text-[10px] text-[#64748b] mt-2">Scan at entry</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => { if (qrDataUrl) { const a = document.createElement("a"); a.download = `fomo-ticket-${ticket.id.slice(0,8)}.png`; a.href = qrDataUrl; a.click(); } }}
            className="w-full mt-3 border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 text-xs"
          >
            <Download className="h-3 w-3 mr-1.5" />
            Download QR
          </Button>
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
