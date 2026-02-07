import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Clock, Tag, Wallet, Store } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface OfferQRCardProps {
  offer: {
    id: string;
    qrToken: string;
    title: string;
    businessName: string;
    businessLogo?: string | null;
    discountPercent?: number;
    expiresAt: string;
    purchasedAt: string;
    isCredit?: boolean;
    balanceRemaining?: number;
  } | null;
  language: "el" | "en";
  onClose: () => void;
}

const translations = {
  el: {
    scanAtVenue: "Δείξτε αυτόν τον κώδικα στο κατάστημα",
    downloadQR: "QR Εικόνα",
    expiry: "Λήξη",
    purchased: "Αγορά",
    offer: "Προσφορά",
    balance: "Υπόλοιπο",
  },
  en: {
    scanAtVenue: "Show this code at the venue",
    downloadQR: "QR Image",
    expiry: "Expiry",
    purchased: "Purchased",
    offer: "Offer",
    balance: "Balance",
  },
};

export const OfferQRCard = ({ offer, language, onClose }: OfferQRCardProps) => {
  const text = translations[language];
  const dateLocale = language === "el" ? el : enUS;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (offer?.qrToken) {
      QRCode.toDataURL(offer.qrToken, {
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
  }, [offer?.qrToken]);

  const handleDownloadQR = () => {
    if (!qrDataUrl || !offer) return;
    
    const link = document.createElement("a");
    link.download = `fomo-offer-${offer.title.slice(0, 20)}-${offer.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Parse dates
  const expiryDate = offer?.expiresAt ? new Date(offer.expiresAt) : null;
  const purchaseDate = offer?.purchasedAt ? new Date(offer.purchasedAt) : null;
  const formattedExpiry = expiryDate 
    ? format(expiryDate, "d MMM", { locale: dateLocale })
    : "";
  const formattedPurchase = purchaseDate 
    ? format(purchaseDate, "d MMM", { locale: dateLocale })
    : "";

  return (
    <Dialog open={!!offer} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent max-h-[90vh] overflow-y-auto flex flex-col items-start">
        <VisuallyHidden>
          <DialogTitle>{offer?.title || "Offer QR Code"}</DialogTitle>
        </VisuallyHidden>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full">
          {/* Header with ΦΟΜΟ branding - Compact */}
          <div className="bg-gradient-to-br from-[#102b4a] to-[#1a3d5c] px-4 pt-5 pb-3 text-center">
            <h1 className="text-xl font-bold text-white tracking-wider">ΦΟΜΟ</h1>
            {offer?.businessName && (
              <p className="text-white/70 text-[10px] mt-0.5">by {offer.businessName}</p>
            )}
          </div>

          {/* Main Content - Frosted Glass Effect - Compact */}
          <div className="bg-white/95 backdrop-blur-xl px-4 py-3">
            {/* Offer Title */}
            <h2 className="text-sm font-semibold text-[#102b4a] text-center mb-2 line-clamp-2">
              {offer?.title}
            </h2>

            {/* Info Grid - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Purchase Date */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Calendar className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.purchased}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedPurchase}</p>
              </div>
              
              {/* Expiry Date */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                <Clock className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.expiry}</p>
                <p className="text-xs font-semibold text-[#102b4a]">{formattedExpiry}</p>
              </div>
              
              {/* Discount/Credit */}
              <div className="bg-[#f0f9ff] rounded-lg p-2 text-center">
                {offer?.isCredit ? (
                  <>
                    <Wallet className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                    <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.balance}</p>
                    <p className="text-xs font-semibold text-[#102b4a]">
                      €{((offer.balanceRemaining ?? 0) / 100).toFixed(0)}
                    </p>
                  </>
                ) : (
                  <>
                    <Tag className="h-3 w-3 text-[#3ec3b7] mx-auto mb-0.5" />
                    <p className="text-[8px] text-[#64748b] uppercase tracking-wide">{text.offer}</p>
                    <p className="text-xs font-semibold text-[#102b4a]">
                      -{offer?.discountPercent ?? 0}%
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* QR Code - Slightly smaller */}
            {qrDataUrl && (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-[#3ec3b7]">
                  <img 
                    src={qrDataUrl} 
                    alt="Offer QR Code" 
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-2 text-center">
                  {text.scanAtVenue}
                </p>
              </div>
            )}

            {/* Download Button */}
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
          {offer?.businessLogo && (
            <div className="relative h-24 overflow-hidden">
              <img 
                src={offer.businessLogo} 
                alt={offer.businessName}
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

export default OfferQRCard;
