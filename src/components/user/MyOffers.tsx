import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Percent, Store, CheckCircle, Calendar, FileText, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import QRCodeLib from "qrcode";
import { format } from "date-fns";

interface MyOffersProps {
  userId: string;
  language: "el" | "en";
}

interface Discount {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  terms: string | null;
  qr_code_token: string;
  active: boolean;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
  };
}

interface Redemption {
  id: string;
  redeemed_at: string;
  discount_id: string;
  discounts: {
    title: string;
    percent_off: number | null;
    business_id: string;
    businesses: {
      name: string;
      logo_url: string | null;
      city: string;
    };
  };
}

export function MyOffers({ userId, language }: MyOffersProps) {
  const [selectedOffer, setSelectedOffer] = useState<Discount | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const text = {
    title: { el: "Οι Προσφορές Μου", en: "My Offers" },
    available: { el: "Διαθέσιμες", en: "Available" },
    redeemed: { el: "Εξαργυρωμένες", en: "Redeemed" },
    noOffers: { el: "Δεν βρέθηκαν διαθέσιμες προσφορές", en: "No available offers found" },
    noRedeemed: { el: "Δεν έχετε εξαργυρώσει προσφορές ακόμα", en: "You haven't redeemed any offers yet" },
    viewQR: { el: "Εμφάνιση QR", en: "Show QR Code" },
    validUntil: { el: "Ισχύει μέχρι", en: "Valid until" },
    terms: { el: "Όροι", en: "Terms" },
    redeemedOn: { el: "Εξαργυρώθηκε στις", en: "Redeemed on" },
    qrCodeTitle: { el: "QR Κωδικός Προσφοράς", en: "Offer QR Code" },
    showTerms: { el: "Εμφάνιση όρων", en: "Show terms" },
    hideTerms: { el: "Απόκρυψη όρων", en: "Hide terms" },
  };

  const t = language === "el" ? {
    title: text.title.el,
    available: text.available.el,
    redeemed: text.redeemed.el,
    noOffers: text.noOffers.el,
    noRedeemed: text.noRedeemed.el,
    viewQR: text.viewQR.el,
    validUntil: text.validUntil.el,
    terms: text.terms.el,
    redeemedOn: text.redeemedOn.el,
    qrCodeTitle: text.qrCodeTitle.el,
    showTerms: text.showTerms.el,
    hideTerms: text.hideTerms.el,
  } : {
    title: text.title.en,
    available: text.available.en,
    redeemed: text.redeemed.en,
    noOffers: text.noOffers.en,
    noRedeemed: text.noRedeemed.en,
    viewQR: text.viewQR.en,
    validUntil: text.validUntil.en,
    terms: text.terms.en,
    redeemedOn: text.redeemedOn.en,
    qrCodeTitle: text.qrCodeTitle.en,
    showTerms: text.showTerms.en,
    hideTerms: text.hideTerms.en,
  };

  // Fetch available offers
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["user-offers", userId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("discounts")
        .select(`
          *,
          businesses (
            name,
            logo_url,
            city
          )
        `)
        .eq("active", true)
        .lte("start_at", now)
        .gte("end_at", now)
        .order("end_at", { ascending: true });

      if (error) throw error;
      return data as Discount[];
    },
  });

  // Fetch redemption history
  const { data: redemptions, isLoading: redemptionsLoading } = useQuery({
    queryKey: ["user-redemptions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redemptions")
        .select(`
          *,
          discounts (
            title,
            percent_off,
            business_id,
            businesses (
              name,
              logo_url,
              city
            )
          )
        `)
        .eq("user_id", userId)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;
      return data as Redemption[];
    },
  });

  // Generate QR code when offer is selected
  useEffect(() => {
    if (selectedOffer && qrCanvasRef.current) {
      QRCodeLib.toCanvas(
        qrCanvasRef.current,
        selectedOffer.qr_code_token,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );

      QRCodeLib.toDataURL(selectedOffer.qr_code_token, { width: 300 }, (err, url) => {
        if (!err) setQrCodeUrl(url);
      });
    }
  }, [selectedOffer]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), language === "el" ? "dd/MM/yyyy" : "MM/dd/yyyy");
  };

  if (offersLoading || redemptionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Percent className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t.title}</h1>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="available">{t.available}</TabsTrigger>
          <TabsTrigger value="redeemed">{t.redeemed}</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {!offers || offers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Percent className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noOffers}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <Card key={offer.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {offer.businesses.logo_url ? (
                          <img
                            src={offer.businesses.logo_url}
                            alt={offer.businesses.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Store className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{offer.businesses.name}</p>
                          <p className="text-xs text-muted-foreground">{offer.businesses.city}</p>
                        </div>
                      </div>
                      {offer.percent_off && (
                        <Badge variant="default" className="text-lg font-bold shrink-0">
                          -{offer.percent_off}%
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{offer.title}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {offer.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {t.validUntil}: {formatDate(offer.end_at)}
                      </span>
                    </div>

                    {offer.terms && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <FileText className="h-4 w-4" />
                          <span>{t.showTerms}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 text-xs text-muted-foreground">
                          {offer.terms}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    <Button
                      onClick={() => setSelectedOffer(offer)}
                      className="w-full"
                      variant="outline"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {t.viewQR}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="mt-6">
          {!redemptions || redemptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.noRedeemed}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {redemptions.map((redemption) => (
                <Card key={redemption.id} className="overflow-hidden opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        {redemption.discounts.businesses.logo_url ? (
                          <img
                            src={redemption.discounts.businesses.logo_url}
                            alt={redemption.discounts.businesses.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Store className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {redemption.discounts.businesses.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {redemption.discounts.businesses.city}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {language === "el" ? "Χρησιμοποιήθηκε" : "Used"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{redemption.discounts.title}</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {redemption.discounts.percent_off && (
                      <Badge variant="outline" className="mb-2">
                        -{redemption.discounts.percent_off}%
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t.redeemedOn}: {formatDate(redemption.redeemed_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.qrCodeTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedOffer && (
              <>
                <div className="text-center">
                  <p className="font-semibold text-lg">{selectedOffer.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedOffer.businesses.name}</p>
                  {selectedOffer.percent_off && (
                    <Badge variant="default" className="text-xl font-bold mt-2">
                      -{selectedOffer.percent_off}%
                    </Badge>
                  )}
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <canvas ref={qrCanvasRef} />
                </div>
                <p className="text-xs text-center text-muted-foreground max-w-xs">
                  {language === "el"
                    ? "Δείξτε αυτόν τον κωδικό QR στο κατάστημα για να εξαργυρώσετε την προσφορά"
                    : "Show this QR code at the store to redeem the offer"}
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
