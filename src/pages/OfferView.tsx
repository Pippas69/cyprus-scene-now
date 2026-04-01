import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { Calendar, Clock, User, Copy, Tag, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { format } from "date-fns";
import { el as elLocale, enUS } from "date-fns/locale";

const t = {
  el: {
    offer: "ΠΡΟΣΦΟΡΑ",
    discount: "ΕΚΠΤΩΣΗ",
    expires: "ΛΗΞΗ",
    scanAtVenue: "Σαρώστε στην επιχείρηση",
    saveHint: "Αποθήκευσε το QR (ή κάνε screenshot). Δείξε το στο κατάστημα.",
    copy: "Αντιγραφή",
    copied: "Ο σύνδεσμος αντιγράφηκε!",
    notFound: "Η προσφορά δεν βρέθηκε",
    redeemed: "Εξαργυρώθηκε",
    expired: "Έληξε",
    name: "ΟΝΟΜΑ",
  },
  en: {
    offer: "OFFER",
    discount: "DISCOUNT",
    expires: "EXPIRES",
    scanAtVenue: "Scan at the venue",
    saveHint: "Save this QR (or screenshot). Show at the venue.",
    copy: "Copy",
    copied: "Link copied!",
    notFound: "Offer not found",
    redeemed: "Redeemed",
    expired: "Expired",
    name: "NAME",
  },
};

const OfferView = () => {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const text = t[language];
  const dateLocale = language === "el" ? elLocale : enUS;

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchOffer = async () => {
      // Try main offer_purchases first
      const { data: mainData, error: mainError } = await supabase.rpc("get_offer_by_token", { p_token: token });
      
      if (mainError) {
        console.error("[OfferView] get_offer_by_token error:", mainError);
      }
      
      if (mainData && mainData.length > 0) {
        setOffer(mainData[0]);
        setIsGuest(false);
        setLoading(false);
        QRCode.toDataURL(mainData[0].qr_code_token, {
          width: 512, margin: 2,
          color: { dark: "#102b4a", light: "#ffffff" },
        }).then(setQrDataUrl);
        return;
      }

      // Try guest tokens (offer_purchase_guests)
      const { data: guestData, error: guestError } = await supabase.rpc("get_offer_guest_by_token", { p_token: token });
      
      if (guestError) {
        console.error("[OfferView] get_offer_guest_by_token error:", guestError);
      }
      
      if (guestData && guestData.length > 0) {
        const g = guestData[0];
        setOffer({
          qr_code_token: g.qr_code_token,
          guest_name: g.guest_name,
          status: g.purchase_status,
          created_at: g.purchase_created_at,
          expires_at: g.purchase_expires_at,
          redeemed_at: g.purchase_redeemed_at,
          discount_title: g.discount_title,
          discount_percent: g.discount_percent,
          offer_type: g.offer_type,
          business_name: g.business_name,
          business_logo_url: g.business_logo_url,
        });
        setIsGuest(true);
        setLoading(false);
        QRCode.toDataURL(g.qr_code_token, {
          width: 512, margin: 2,
          color: { dark: "#102b4a", light: "#ffffff" },
        }).then(setQrDataUrl);
        return;
      }

      // Try reservation_guests tokens (offers claimed with reservation)
      const { data: resGuestData, error: resGuestError } = await supabase.rpc("get_offer_by_reservation_guest_token" as any, { p_token: token });
      
      if (resGuestError) {
        console.error("[OfferView] get_offer_by_reservation_guest_token error:", resGuestError);
      }
      
      if (resGuestData && (resGuestData as any[]).length > 0) {
        const g = (resGuestData as any[])[0];
        setOffer({
          qr_code_token: g.qr_code_token,
          guest_name: g.guest_name,
          status: g.purchase_status,
          created_at: g.purchase_created_at,
          expires_at: g.purchase_expires_at,
          redeemed_at: g.purchase_redeemed_at,
          discount_title: g.discount_title,
          discount_percent: g.discount_percent,
          offer_type: g.offer_type,
          business_name: g.business_name,
          business_logo_url: g.business_logo_url,
        });
        setIsGuest(true);
        setLoading(false);
        QRCode.toDataURL(g.qr_code_token, {
          width: 512, margin: 2,
          color: { dark: "#102b4a", light: "#ffffff" },
        }).then(setQrDataUrl);
        return;
      }

      console.error("[OfferView] No offer found for token:", token);
      setLoading(false);
    };

    fetchOffer();
  }, [token]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(text.copied);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><OceanLoader size="lg" /></div>;
  if (!offer) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{text.notFound}</div>;

  const isRedeemed = offer.status === "redeemed";
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date() && offer.status !== "redeemed";
  const expiryDate = offer.expires_at ? format(new Date(offer.expires_at), "d MMM yyyy", { locale: dateLocale }) : "-";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
          <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
          {offer.business_name && <p className="text-white/70 text-[10px] mt-0.5">by {offer.business_name}</p>}
        </div>

        <div className="bg-white dark:bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">{offer.discount_title}</h2>

          {isRedeemed && (
            <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-green-50 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-green-500" />
              <p className="text-sm font-semibold text-green-700">{text.redeemed}</p>
            </div>
          )}

          {isExpired && !isRedeemed && (
            <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-orange-50 rounded-lg">
              <Clock className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">{text.expired}</p>
            </div>
          )}

          <div className={`grid ${isGuest ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3`}>
            {isGuest && offer.guest_name && (
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <User className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.name}</p>
                <p className="text-xs font-semibold text-[#102b4a] truncate">{offer.guest_name}</p>
              </div>
            )}
            {offer.discount_percent && (
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Tag className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.discount}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{offer.discount_percent}%</p>
              </div>
            )}
            <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
              <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
              <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.expires}</p>
              <p className="text-[11px] font-semibold text-[#102b4a] leading-tight">{expiryDate}</p>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center">
              <div className={`p-2 bg-white rounded-xl shadow-lg border-2 ${isRedeemed || isExpired ? 'border-orange-300 opacity-50' : 'border-[#3ec3b7]'}`}>
                <img src={qrDataUrl} alt="Offer QR Code" className="w-44 h-44" />
              </div>
              <p className="text-[10px] text-[#64748b] mt-2">{text.scanAtVenue}</p>
              <p className="text-[8px] text-[#94a3b8] mt-1 text-center italic">{text.saveHint}</p>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-[#f0f9ff] rounded-lg px-3 py-2 text-[10px] text-[#64748b] font-mono truncate">
              {window.location.href}
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

export default OfferView;
