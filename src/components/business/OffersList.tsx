import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Ticket, Calendar, Percent } from "lucide-react";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/useLanguage";
import { OfferQRScanner } from "./OfferQRScanner";
import { StudentDiscountScanner } from "./StudentDiscountScanner";
import { StudentDiscountStats } from "./StudentDiscountStats";

interface OffersListProps {
  businessId: string;
}

const OffersList = ({ businessId }: OffersListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { language } = useLanguage();

  const translations = {
    el: {
      loading: "Φόρτωση...",
      noOffers: "Δεν έχετε δημοσιεύσει καμία προσφορά ακόμα.",
      success: "Επιτυχία",
      offerDeleted: "Η προσφορά διαγράφηκε",
      offerDeactivated: "Η προσφορά απενεργοποιήθηκε",
      offerActivated: "Η προσφορά ενεργοποιήθηκε",
      error: "Σφάλμα",
      delete: "Διαγραφή",
      active: "Ενεργή",
      inactive: "Ανενεργή",
      activate: "Ενεργοποίηση",
      deactivate: "Απενεργοποίηση",
      terms: "Όροι:",
    },
    en: {
      loading: "Loading...",
      noOffers: "You haven't published any offers yet.",
      success: "Success",
      offerDeleted: "Offer deleted",
      offerDeactivated: "Offer deactivated",
      offerActivated: "Offer activated",
      error: "Error",
      delete: "Delete",
      active: "Active",
      inactive: "Inactive",
      activate: "Activate",
      deactivate: "Deactivate",
      terms: "Terms:",
    },
  };

  const t = translations[language];

  const { data: offers, isLoading } = useQuery({
    queryKey: ['business-offers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('business-offers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discounts',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  const handleDelete = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: t.success,
        description: t.offerDeleted,
      });

      queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (offerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: t.success,
        description: currentStatus ? t.offerDeactivated : t.offerActivated,
      });

      queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Format dates with smart display for hourly offers
  const formatOfferDates = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const locale = language === "el" ? "el-GR" : "en-US";
    const isSameDay = start.toDateString() === end.toDateString();
    
    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    
    if (isSameDay) {
      const dayStr = start.toLocaleDateString(locale, dateFormat);
      const startTime = start.toLocaleTimeString(locale, timeFormat);
      const endTime = end.toLocaleTimeString(locale, timeFormat);
      return `${dayStr}, ${startTime} - ${endTime}`;
    }
    
    return `${start.toLocaleDateString(locale, { ...dateFormat, year: 'numeric' })} - ${end.toLocaleDateString(locale, { ...dateFormat, year: 'numeric' })}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">{t.loading}</div>;
  }

  if (!offers || offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {t.noOffers}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with scanners */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          <h2 className="text-2xl font-bold">
            {language === "el" ? "Προσφορές" : "Offers"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StudentDiscountScanner businessId={businessId} language={language} />
          <OfferQRScanner businessId={businessId} language={language} />
        </div>
      </div>
      
      {/* Student Discount Stats - integrated section */}
      <StudentDiscountStats businessId={businessId} language={language} />
      
      {/* Offers list */}
      <div className="space-y-4">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold">{offer.title}</h3>
                        <Badge variant={offer.active ? "default" : "secondary"}>
                          {offer.active ? t.active : t.inactive}
                        </Badge>
                        {/* COMMISSION DISABLED: All offers are commission-free - badge hidden */}
                      </div>
                      {offer.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {offer.description}
                        </p>
                      )}
                    </div>
                    
                    {offer.percent_off && (
                      <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full">
                        <Percent className="h-4 w-4" />
                        <span className="font-bold">{offer.percent_off}% OFF</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatOfferDates(offer.start_at, offer.end_at)}
                      </span>
                    </div>
                  </div>

                  {offer.terms && (
                    <p className="text-xs text-muted-foreground italic">
                      {t.terms} {offer.terms}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(offer.id, offer.active || false)}
                  >
                    {offer.active ? t.deactivate : t.activate}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(offer.id)}
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${offer.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OffersList;
