import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Store, CheckCircle, Calendar, Clock, QrCode, ShoppingBag, AlertCircle, Wallet, History, TrendingDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { CreditTransactionHistory } from "./CreditTransactionHistory";
import { OfferQRCard } from "./OfferQRCard";

interface MyOffersProps {
  userId: string;
  language: "el" | "en";
}

interface OfferPurchase {
  id: string;
  discount_id: string;
  original_price_cents: number;
  discount_percent: number;
  final_price_cents: number;
  status: string;
  qr_code_token: string | null;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
  balance_remaining_cents: number | null;
  claim_type: string | null;
  reservation_id: string | null;
  discounts: {
    id: string;
    title: string;
    description: string | null;
    percent_off: number | null;
    offer_type: string | null;
    bonus_percent: number | null;
    credit_amount_cents: number | null;
    offer_image_url: string | null;
    valid_start_time: string | null;
    valid_end_time: string | null;
    businesses: {
      id: string;
      name: string;
      logo_url: string | null;
      cover_url: string | null;
      city: string;
    };
  } | null;
  reservations: {
    preferred_time: string | null;
  } | null;
}

export function MyOffers({ userId, language }: MyOffersProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPurchase, setSelectedPurchase] = useState<OfferPurchase | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightedPurchaseId = searchParams.get('purchaseId');

  const text = {
    title: { el: "Οι Αγορές Μου", en: "My Purchases" },
    active: { el: "Ενεργές", en: "Active" },
    redeemed: { el: "Εξαργυρωμένες", en: "Redeemed" },
    expired: { el: "Ληγμένες", en: "Expired" },
    noPurchases: { el: "Δεν έχετε αγοράσει προσφορές ακόμα", en: "You haven't purchased any offers yet" },
    noRedeemed: { el: "Δεν έχετε εξαργυρώσει προσφορές ακόμα", en: "You haven't redeemed any offers yet" },
    noExpired: { el: "Δεν έχετε ληγμένες προσφορές", en: "No expired offers" },
    viewQR: { el: "Εμφάνιση QR", en: "Show QR Code" },
    expiresOn: { el: "Λήγει", en: "Expires" },
    purchasedOn: { el: "Αγοράστηκε", en: "Purchased" },
    redeemedOn: { el: "Εξαργυρώθηκε", en: "Redeemed on" },
    qrCodeTitle: { el: "QR Κωδικός", en: "QR Code" },
    showAtVenue: { el: "Δείξτε αυτόν τον κωδικό στο κατάστημα", en: "Show this code at the venue" },
    downloadQR: { el: "Λήψη QR", en: "Download QR" },
    expiresIn: { el: "Λήγει σε", en: "Expires in" },
    days: { el: "ημέρες", en: "days" },
    hours: { el: "ώρες", en: "hours" },
    minutes: { el: "λεπτά", en: "minutes" },
    day: { el: "ημέρα", en: "day" },
    hour: { el: "ώρα", en: "hour" },
    minute: { el: "λεπτό", en: "minute" },
    youPaid: { el: "Πληρώσατε", en: "You paid" },
    originalPrice: { el: "Αρχική τιμή", en: "Original price" },
    qrError: { el: "Αποτυχία δημιουργίας QR", en: "Failed to generate QR" },
    retry: { el: "Επανάληψη", en: "Retry" },
    browseOffers: { el: "Δείτε Προσφορές", en: "Browse Offers" },
    balance: { el: "Υπόλοιπο", en: "Balance" },
    storeCredit: { el: "Πίστωση Καταστήματος", en: "Store Credit" },
    viewHistory: { el: "Ιστορικό", en: "History" },
    depleted: { el: "Εξαντλημένο", en: "Depleted" },
    totalCredit: { el: "Συνολική Πίστωση", en: "Total Credit" },
    used: { el: "Χρησιμοποιημένα", en: "Used" },
    reservation: { el: "Κράτηση", en: "Reservation" },
  };

  const t = language === "el" ? {
    title: text.title.el,
    active: text.active.el,
    redeemed: text.redeemed.el,
    expired: text.expired.el,
    noPurchases: text.noPurchases.el,
    noRedeemed: text.noRedeemed.el,
    noExpired: text.noExpired.el,
    viewQR: text.viewQR.el,
    expiresOn: text.expiresOn.el,
    purchasedOn: text.purchasedOn.el,
    redeemedOn: text.redeemedOn.el,
    qrCodeTitle: text.qrCodeTitle.el,
    showAtVenue: text.showAtVenue.el,
    downloadQR: text.downloadQR.el,
    expiresIn: text.expiresIn.el,
    days: text.days.el,
    hours: text.hours.el,
    minutes: text.minutes.el,
    day: text.day.el,
    hour: text.hour.el,
    minute: text.minute.el,
    youPaid: text.youPaid.el,
    originalPrice: text.originalPrice.el,
    qrError: text.qrError.el,
    retry: text.retry.el,
    browseOffers: text.browseOffers.el,
    balance: text.balance.el,
    storeCredit: text.storeCredit.el,
    viewHistory: text.viewHistory.el,
    depleted: text.depleted.el,
    totalCredit: text.totalCredit.el,
    used: text.used.el,
    reservation: text.reservation.el,
  } : {
    title: text.title.en,
    active: text.active.en,
    redeemed: text.redeemed.en,
    expired: text.expired.en,
    noPurchases: text.noPurchases.en,
    noRedeemed: text.noRedeemed.en,
    noExpired: text.noExpired.en,
    viewQR: text.viewQR.en,
    expiresOn: text.expiresOn.en,
    purchasedOn: text.purchasedOn.en,
    redeemedOn: text.redeemedOn.en,
    qrCodeTitle: text.qrCodeTitle.en,
    showAtVenue: text.showAtVenue.en,
    downloadQR: text.downloadQR.en,
    expiresIn: text.expiresIn.en,
    days: text.days.en,
    hours: text.hours.en,
    minutes: text.minutes.en,
    day: text.day.en,
    hour: text.hour.en,
    minute: text.minute.en,
    youPaid: text.youPaid.en,
    originalPrice: text.originalPrice.en,
    qrError: text.qrError.en,
    retry: text.retry.en,
    browseOffers: text.browseOffers.en,
    balance: text.balance.en,
    storeCredit: text.storeCredit.en,
    viewHistory: text.viewHistory.en,
    depleted: text.depleted.en,
    totalCredit: text.totalCredit.en,
    used: text.used.en,
    reservation: text.reservation.en,
  };

  // Fetch purchased offers with expanded data
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["user-offer-purchases", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_purchases")
        .select(`
          *,
          discounts (
            id,
            title,
            description,
            percent_off,
            offer_type,
            bonus_percent,
            credit_amount_cents,
            offer_image_url,
            valid_start_time,
            valid_end_time,
            businesses (
              id,
              name,
              logo_url,
              cover_url,
              city
            )
          ),
          reservations (
            preferred_time
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfferPurchase[];
    },
  });

  // Filter out null discounts (deleted offers) and cancelled purchases BEFORE any categorization
  const validPurchases = purchases?.filter(p => p.discounts !== null && p.status !== 'cancelled') || [];

  // Helper: check if a purchase is expired (considers reservation time for reservation-linked offers)
  const isPurchaseExpired = (p: OfferPurchase) => {
    const now = new Date();
    // For reservation-linked purchases, check if the reservation time has passed
    if (p.claim_type === 'with_reservation' && p.reservations?.preferred_time) {
      return new Date(p.reservations.preferred_time) < now;
    }
    // For walk-in or other types, use expires_at
    return new Date(p.expires_at) <= now;
  };

  // Separate purchases by status
  const activePurchases = validPurchases.filter(p => {
    const isExpired = isPurchaseExpired(p);
    const isCredit = p.discounts?.offer_type === 'credit';
    if (isCredit) {
      return p.status === 'paid' && !isExpired && (p.balance_remaining_cents ?? 0) > 0;
    }
    return p.status === 'paid' && !isExpired;
  });
  
  const redeemedPurchases = validPurchases.filter(p => {
    const isCredit = p.discounts?.offer_type === 'credit';
    if (isCredit && p.status === 'paid') {
      return (p.balance_remaining_cents ?? 0) === 0;
    }
    return p.status === 'redeemed';
  });
  
  const expiredPurchases = validPurchases.filter(p => {
    const isExpired = isPurchaseExpired(p);
    return p.status === 'expired' || (p.status === 'paid' && isExpired);
  });

  // Navigate to map (Χάρτης) with business highlight
  const handleLocationClick = (businessId: string) => {
    navigate(`/xartis?business=${businessId}&src=offer_location`);
  };

  // Auto-scroll to highlighted purchase and clear the param after
  useEffect(() => {
    if (highlightedPurchaseId && !isLoading) {
      // Small delay to ensure cards are rendered
      setTimeout(() => {
        const cardElement = cardRefs.current.get(highlightedPurchaseId);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight animation
          cardElement.classList.add('ring-2', 'ring-orange-400', 'ring-offset-2');
          // Remove highlight after animation
          setTimeout(() => {
            cardElement.classList.remove('ring-2', 'ring-orange-400', 'ring-offset-2');
            // Clear the URL parameter
            searchParams.delete('purchaseId');
            setSearchParams(searchParams, { replace: true });
          }, 3000);
        }
      }, 300);
    }
  }, [highlightedPurchaseId, isLoading, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PurchaseCard = ({ purchase, showQR = true }: { purchase: OfferPurchase; showQR?: boolean }) => {
    // Guard against null discounts (can happen if discount was deleted)
    if (!purchase.discounts || !purchase.discounts.businesses) {
      return null;
    }

    const isCredit = purchase.discounts.offer_type === 'credit';
    const balanceRemaining = purchase.balance_remaining_cents ?? 0;
    const isDepleted = isCredit && balanceRemaining === 0;
    const isReservation = purchase.claim_type === 'with_reservation';
    const isExpired = isPurchaseExpired(purchase);
    const isRedeemed = purchase.status === 'redeemed';

    // Format expiry date - Greek style "Λήγει στις 4 Φεβρουαρίου"
    const formatExpiryDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const daysLeft = differenceInDays(date, now);
      
      if (daysLeft <= 0) return language === "el" ? "Λήγει σήμερα" : "Expires today";
      if (daysLeft === 1) return language === "el" ? "Λήγει αύριο" : "Expires tomorrow";
      
      const day = date.getDate();
      const month = date.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "long" });
      return language === "el" ? `Λήγει στις ${day} ${month}` : `Expires ${month} ${day}`;
    };

    // Format date with time - "5 Φεβρουαρίου, 20:00" (no year)
    const formatDateWithTime = () => {
      if (isReservation && purchase.reservations?.preferred_time) {
        // preferred_time is a timestamptz (ISO string) -> parse and format correctly
        const reservationDate = new Date(purchase.reservations.preferred_time);
        const day = reservationDate.getDate();
        const month = reservationDate.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "long" });
        const time = reservationDate.toLocaleTimeString(language === "el" ? "el-GR" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        return language === "el"
          ? `${day} ${month}, ${time}`
          : `${month} ${day}, ${time}`;
      } else {
        const date = new Date(purchase.expires_at);
        const day = date.getDate();
        const month = date.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "long" });
        // Walk-in: show time range
        const startTime = purchase.discounts?.valid_start_time?.slice(0, 5) || "00:00";
        const endTime = purchase.discounts?.valid_end_time?.slice(0, 5) || "23:59";
        return language === "el" 
          ? `${day} ${month}, ${startTime}-${endTime}` 
          : `${month} ${day}, ${startTime}-${endTime}`;
      }
    };

    // Image priority: offer_image_url → cover_url → logo_url
    const imageUrl =
      purchase.discounts.offer_image_url ||
      purchase.discounts.businesses.cover_url ||
      purchase.discounts.businesses.logo_url ||
      null;

    return (
      <Card 
        ref={(el) => { if (el) cardRefs.current.set(purchase.id, el); }}
        className="overflow-hidden relative transition-all duration-300"
      >
        {/* Image section - increased height */}
        <div className="aspect-square md:aspect-auto md:h-36 relative overflow-hidden rounded-t-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={purchase.discounts.businesses.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-muted" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
          
          {/* Reservation Badge - Top Left (only for reservations) */}
          {isReservation && (
            <Badge 
              variant="default" 
              className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 shadow-sm"
            >
              {t.reservation}
            </Badge>
          )}
          
          {/* Status/Discount Badge - Top Right */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {isDepleted ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shadow-sm">
                <TrendingDown className="h-3 w-3 mr-0.5" />
              </Badge>
            ) : isCredit ? (
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-emerald-600 shadow-sm">
                <Wallet className="h-3 w-3 mr-0.5" />
                €{(balanceRemaining / 100).toFixed(0)}
              </Badge>
            ) : isRedeemed ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shadow-sm flex items-center gap-1 whitespace-nowrap">
                <CheckCircle className="h-3 w-3" />
                <span>{language === "el" ? "Χρησιμοποιημένο" : "Used"}</span>
              </Badge>
            ) : isExpired ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 shadow-sm">
                <AlertCircle className="h-3 w-3" />
              </Badge>
            ) : purchase.discount_percent > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 shadow-sm">
                -{purchase.discount_percent}%
              </Badge>
            )}
          </div>
        </div>

        {/* Content section - reduced spacing */}
        <div className="p-2.5 space-y-0.5">
          {/* Title */}
          <h4 className="text-sm font-semibold line-clamp-1">
            {purchase.discounts.title}
          </h4>

          {/* Business row with logo */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {purchase.discounts.businesses.logo_url ? (
              <img 
                src={purchase.discounts.businesses.logo_url} 
                alt={purchase.discounts.businesses.name}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <Store className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs line-clamp-1">{purchase.discounts.businesses.name}</span>
          </div>

          {/* Date + Time + Location row - location icon right after time */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs line-clamp-1">{formatDateWithTime()}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const businessId = purchase.discounts?.businesses?.id;
                if (businessId) {
                  handleLocationClick(businessId);
                }
              }}
              className="p-0.5 hover:bg-muted rounded-full transition-colors shrink-0"
              aria-label={language === "el" ? "Δείτε στον χάρτη" : "View on map"}
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>

          {/* Expiry row */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs">{formatExpiryDate(purchase.expires_at)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {showQR && !isExpired && !isRedeemed && !isDepleted && (
              <Button 
                onClick={() => setSelectedPurchase(purchase)}
                size="sm" 
                variant="default"
                className="flex-1 text-xs h-8"
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {t.viewQR}
              </Button>
            )}
            {isCredit && (
              <Button
                onClick={() => setShowHistory(purchase.id)}
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                {t.viewHistory}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto overflow-hidden">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-[11px] sm:text-sm bg-muted/50 p-1 gap-0.5">
          <TabsTrigger value="active" className="px-1.5 sm:px-3 py-2 gap-0.5">
            <span className="truncate">{t.active}</span>
            {activePurchases.length > 0 && (
              <span className="text-muted-foreground shrink-0">({activePurchases.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="redeemed" className="px-1.5 sm:px-3 py-2 gap-0.5">
            <span className="truncate">{t.redeemed}</span>
            {redeemedPurchases.length > 0 && (
              <span className="text-muted-foreground shrink-0">({redeemedPurchases.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="px-1.5 sm:px-3 py-2 gap-0.5">
            <span className="truncate">{t.expired}</span>
            {expiredPurchases.length > 0 && (
              <span className="text-muted-foreground shrink-0">({expiredPurchases.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activePurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm mb-3">{t.noPurchases}</p>
                <Button asChild variant="outline" size="sm">
                  <a href="/offers">{t.browseOffers}</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activePurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="mt-4">
          {redeemedPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">{t.noRedeemed}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {redeemedPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} showQR={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          {expiredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">{t.noExpired}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {expiredPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} showQR={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction History Dialog */}
      {showHistory && (
        <CreditTransactionHistory
          isOpen={!!showHistory}
          purchaseId={showHistory}
          language={language}
          onClose={() => setShowHistory(null)}
        />
      )}

      <OfferQRCard
        offer={selectedPurchase ? {
          id: selectedPurchase.id,
          qrToken: selectedPurchase.qr_code_token || '',
          title: selectedPurchase.discounts!.title,
          businessName: selectedPurchase.discounts!.businesses.name,
          businessLogo: selectedPurchase.discounts!.businesses.logo_url,
          discountPercent: selectedPurchase.discount_percent,
          expiresAt: selectedPurchase.expires_at,
          purchasedAt: selectedPurchase.created_at,
          isCredit: selectedPurchase.discounts?.offer_type === 'credit',
          balanceRemaining: selectedPurchase.balance_remaining_cents ?? 0,
        } : null}
        language={language}
        onClose={() => setSelectedPurchase(null)}
      />
    </div>
  );
}
