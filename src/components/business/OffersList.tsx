import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Ticket, Calendar, Sparkles, Rocket, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { OfferQRScanner } from "./OfferQRScanner";
import { StudentDiscountScanner } from "./StudentDiscountScanner";
import { StudentDiscountStats } from "./StudentDiscountStats";
import OfferBoostDialog from "./OfferBoostDialog";

// Helper component to show active boost badge for offers (gold/premium color - non-clickable)
const ActiveOfferBoostBadge = ({ offerId, label }: { offerId: string; label: string }) => {
  const { data: activeBoost } = useQuery({
    queryKey: ["offer-active-boost", offerId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("offer_boosts")
        .select("id")
        .eq("discount_id", offerId)
        .eq("status", "active")
        .lte("start_date", now)
        .gte("end_date", now)
        .maybeSingle();
      return data;
    },
  });
  
  if (!activeBoost) return null;
  return (
    <Badge 
      variant="default" 
      className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white flex items-center gap-1 shadow-sm cursor-default"
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
};

interface OffersListProps {
  businessId: string;
}

const OffersList = ({ businessId }: OffersListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const [boostingOffer, setBoostingOffer] = useState<{ id: string; title: string } | null>(null);

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data;
    },
  });

  const translations = {
    el: {
      title: "Προσφορές",
      loading: "Φόρτωση...",
      noOffers: "Δεν έχετε δημοσιεύσει καμία προσφορά ακόμα.",
      success: "Επιτυχία",
      offerDeleted: "Η προσφορά διαγράφηκε",
      offerDeactivated: "Η προσφορά απενεργοποιήθηκε",
      offerActivated: "Η προσφορά ενεργοποιήθηκε",
      error: "Σφάλμα",
      active: "Ενεργή",
      inactive: "Ανενεργή",
      activate: "Ενεργοποίηση",
      deactivate: "Απενεργοποίηση",
      boosted: "Προωθείται",
      boost: "Προώθηση",
      edit: "Επεξεργασία",
    },
    en: {
      title: "Offers",
      loading: "Loading...",
      noOffers: "You haven't published any offers yet.",
      success: "Success",
      offerDeleted: "Offer deleted",
      offerDeactivated: "Offer deactivated",
      offerActivated: "Offer activated",
      error: "Error",
      active: "Active",
      inactive: "Inactive",
      activate: "Activate",
      deactivate: "Deactivate",
      boosted: "Boosted",
      boost: "Boost",
      edit: "Edit",
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
      const deleteByDiscountId = async (table: any) => {
        const { error } = await (supabase as any)
          .from(table)
          .delete()
          .eq("discount_id", offerId);
        if (error) throw error;
      };

      await deleteByDiscountId("commission_ledger");
      await deleteByDiscountId("offer_purchases");
      await deleteByDiscountId("redemptions");
      await deleteByDiscountId("discount_views");
      await deleteByDiscountId("discount_scans");
      await deleteByDiscountId("favorite_discounts");
      await deleteByDiscountId("discount_items");
      await deleteByDiscountId("offer_boosts");

      const { error, count } = await supabase
        .from("discounts")
        .delete({ count: "exact" })
        .eq("id", offerId)
        .eq("business_id", businessId);

      if (error) throw error;
      if (!count) {
        throw new Error(
          language === "el"
            ? "Δεν έχετε δικαίωμα διαγραφής ή η προσφορά δεν υπάρχει πλέον"
            : "You don't have permission to delete this offer, or it no longer exists"
        );
      }

      toast({
        title: t.success,
        description: t.offerDeleted,
      });

      queryClient.invalidateQueries({ queryKey: ["business-offers", businessId] });
    } catch (error: any) {
      console.error("Delete offer error:", error);
      toast({
        title: t.error,
        description: error?.message ?? String(error),
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

  // Format dates for display
  const formatOfferDates = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const locale = language === "el" ? "el-GR" : "en-US";
    const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    
    return `${start.toLocaleDateString(locale, dateFormat)} - ${end.toLocaleDateString(locale, dateFormat)}`;
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
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="flex items-center gap-2">
          <StudentDiscountScanner businessId={businessId} language={language} />
          <OfferQRScanner businessId={businessId} language={language} />
        </div>
      </div>
      
      {/* Student Discount Stats */}
      <StudentDiscountStats businessId={businessId} language={language} />
      
      {/* Offers list - redesigned cards */}
      <div className="space-y-4">
        {offers.map((offer) => (
          <Card key={offer.id} className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Top row: Title + Boosted badge on left, Action icons on right */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-semibold">{offer.title}</h3>
                    <ActiveOfferBoostBadge offerId={offer.id} label={t.boosted} />
                  </div>
                  
                  {/* Action icons - Boost and Edit */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBoostingOffer({ id: offer.id, title: offer.title })}
                      title={t.boost}
                      aria-label={`${t.boost} ${offer.title}`}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Rocket className="h-5 w-5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t.edit}
                      aria-label={`${t.edit} ${offer.title}`}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                
                {/* Date row */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {formatOfferDates(offer.start_at, offer.end_at)}
                  </span>
                </div>
                
                {/* Bottom row: Discount + Status badges on left, Deactivate + Delete on right */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Discount percentage badge */}
                    {offer.percent_off && (
                      <Badge 
                        variant="outline" 
                        className="text-primary border-primary/30 bg-primary/5 font-semibold"
                      >
                        {offer.percent_off}% OFF
                      </Badge>
                    )}
                    
                    {/* Active/Inactive status badge */}
                    <Badge 
                      variant={offer.active ? "default" : "secondary"}
                      className={offer.active ? "bg-primary text-primary-foreground" : ""}
                    >
                      {offer.active ? t.active : t.inactive}
                    </Badge>
                  </div>
                  
                  {/* Deactivate/Activate button and Delete icon */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(offer.id, offer.active || false)}
                      className="text-sm"
                    >
                      {offer.active ? t.deactivate : t.activate}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(offer.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${offer.title}`}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Offer Boost Dialog */}
      {boostingOffer && (
        <OfferBoostDialog
          open={!!boostingOffer}
          onOpenChange={(open) => !open && setBoostingOffer(null)}
          offerId={boostingOffer.id}
          offerTitle={boostingOffer.title}
          hasActiveSubscription={subscriptionData?.subscribed || false}
          remainingBudgetCents={subscriptionData?.monthly_budget_remaining_cents || 0}
        />
      )}
    </div>
  );
};

export default OffersList;
