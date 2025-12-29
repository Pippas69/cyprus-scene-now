import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Percent, Store, CheckCircle, Calendar, Clock, QrCode, Download, ShoppingBag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCodeLib from "qrcode";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

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
  discounts: {
    id: string;
    title: string;
    description: string | null;
    percent_off: number | null;
    businesses: {
      name: string;
      logo_url: string | null;
      city: string;
    };
  };
}

export function MyOffers({ userId, language }: MyOffersProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<OfferPurchase | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

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
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    
    if (days > 0) {
      return {
        value: `${days} ${days === 1 ? t.day : t.days}${hours > 0 ? ` ${hours} ${hours === 1 ? t.hour : t.hours}` : ''}`,
        urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low'
      };
    } else if (hours > 0) {
      return {
        value: `${hours} ${hours === 1 ? t.hour : t.hours}${minutes > 0 ? ` ${minutes} ${minutes === 1 ? t.minute : t.minutes}` : ''}`,
        urgency: 'high'
      };
    } else if (minutes > 0) {
      return {
        value: `${minutes} ${minutes === 1 ? t.minute : t.minutes}`,
        urgency: 'critical'
      };
    } else {
      return { value: '', urgency: 'expired' };
    }
  };

  // Fetch purchased offers
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
            businesses (
              name,
              logo_url,
              city
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfferPurchase[];
    },
  });

  // Separate purchases by status
  const activePurchases = purchases?.filter(p => p.status === 'paid' && new Date(p.expires_at) > new Date()) || [];
  const redeemedPurchases = purchases?.filter(p => p.status === 'redeemed') || [];
  const expiredPurchases = purchases?.filter(p => p.status === 'expired' || (p.status === 'paid' && new Date(p.expires_at) <= new Date())) || [];

  // Generate QR code when purchase is selected
  useEffect(() => {
    if (!selectedPurchase || !selectedPurchase.qr_code_token) {
      setQrCodeUrl(null);
      setQrError(null);
      return;
    }

    setQrLoading(true);
    setQrError(null);

    setTimeout(() => {
      QRCodeLib.toDataURL(selectedPurchase.qr_code_token!, { 
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => {
          setQrCodeUrl(url);
          setQrLoading(false);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
          setQrError(t.qrError);
          setQrLoading(false);
        });
    }, 100);
  }, [selectedPurchase, t.qrError]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), language === "el" ? "dd/MM/yyyy" : "MM/dd/yyyy");
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl || !selectedPurchase) return;
    const link = document.createElement('a');
    link.download = `offer-${selectedPurchase.id}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PurchaseCard = ({ purchase, showQR = true }: { purchase: OfferPurchase; showQR?: boolean }) => {
    const timeRemaining = getTimeRemaining(purchase.expires_at);
    const urgencyColors: Record<string, string> = {
      low: 'text-muted-foreground bg-muted',
      medium: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-950',
      high: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-950',
      critical: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950',
      expired: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950'
    };

    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {purchase.discounts.businesses.logo_url ? (
                <img
                  src={purchase.discounts.businesses.logo_url}
                  alt={purchase.discounts.businesses.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{purchase.discounts.businesses.name}</p>
                <p className="text-xs text-muted-foreground">{purchase.discounts.businesses.city}</p>
              </div>
            </div>
            {purchase.status === 'redeemed' ? (
              <Badge variant="secondary" className="shrink-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                {language === "el" ? "Χρησιμοποιήθηκε" : "Used"}
              </Badge>
            ) : purchase.status === 'expired' || new Date(purchase.expires_at) <= new Date() ? (
              <Badge variant="destructive" className="shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                {language === "el" ? "Έληξε" : "Expired"}
              </Badge>
            ) : (
              <Badge variant="default" className="text-lg font-bold shrink-0">
                -{purchase.discount_percent}%
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg mt-2">{purchase.discounts.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {purchase.discounts.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{purchase.discounts.description}</p>
          )}

          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
            <div>
              <p className="text-muted-foreground text-xs">{t.originalPrice}</p>
              <p className="line-through">€{(purchase.original_price_cents / 100).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">{t.youPaid}</p>
              <p className="font-bold text-primary">€{(purchase.final_price_cents / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t.purchasedOn}: {formatDate(purchase.created_at)}
            </span>
          </div>

          {purchase.redeemed_at && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">
                {t.redeemedOn}: {formatDate(purchase.redeemed_at)}
              </span>
            </div>
          )}

          {showQR && purchase.status === 'paid' && new Date(purchase.expires_at) > new Date() && (
            <>
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full w-fit ${urgencyColors[timeRemaining.urgency]}`}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {t.expiresIn}: {timeRemaining.value}
                </span>
              </div>

              <Button
                onClick={() => setSelectedPurchase(purchase)}
                className="w-full"
                variant="default"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {t.viewQR}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t.title}</h1>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">
            {t.active}
            {activePurchases.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activePurchases.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="redeemed">{t.redeemed}</TabsTrigger>
          <TabsTrigger value="expired">{t.expired}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activePurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{t.noPurchases}</p>
                <Button asChild variant="outline">
                  <a href="/feed">{t.browseOffers}</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="mt-6">
          {redeemedPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noRedeemed}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {redeemedPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} showQR={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          {expiredPurchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noExpired}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {expiredPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} showQR={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.qrCodeTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedPurchase && (
              <>
                <div className="text-center">
                  <p className="font-semibold text-lg">{selectedPurchase.discounts.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedPurchase.discounts.businesses.name}</p>
                  <Badge variant="default" className="text-xl font-bold mt-2">
                    -{selectedPurchase.discount_percent}%
                  </Badge>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-lg">
                  {qrLoading ? (
                    <div className="w-[300px] h-[300px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : qrError ? (
                    <div className="w-[300px] h-[300px] flex flex-col items-center justify-center gap-2">
                      <p className="text-destructive text-sm">{qrError}</p>
                      <Button size="sm" variant="outline" onClick={() => setSelectedPurchase({...selectedPurchase})}>
                        {t.retry}
                      </Button>
                    </div>
                  ) : qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-[300px] h-[300px]" />
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground text-center">{t.showAtVenue}</p>

                {qrCodeUrl && (
                  <Button onClick={handleDownloadQR} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {t.downloadQR}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
