import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Ticket, Calendar, Sparkles, Rocket, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { StudentDiscountStats } from "./StudentDiscountStats";
import OfferBoostDialog from "./OfferBoostDialog";
import OfferEditDialog from "./OfferEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState<{ id: string; title: string } | null>(null);

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
      delete: "Διαγραφή",
      expired: "Ληγμένες",
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
      delete: "Delete",
      expired: "Expired",
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
        .order('end_at', { ascending: true });

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

  // Check if offer is expired (end_at has passed)
  const isOfferExpired = (offer: any) => {
    return new Date(offer.end_at) < new Date();
  };

  // Separate active and expired offers
  const activeOffers = (offers || []).filter(offer => !isOfferExpired(offer));
  const expiredOffers = (offers || []).filter(offer => isOfferExpired(offer));
  const displayedOffers = showExpired ? [...activeOffers, ...expiredOffers] : activeOffers;

  const hasNoOffers = !offers || offers.length === 0;

  // Always show student discount if enabled, even when no regular offers exist
  if (hasNoOffers) {
    return (
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold">{t.title}</h1>
        
        {/* Student Discount Stats - show even if no regular offers */}
        <StudentDiscountStats businessId={businessId} language={language} />
        
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.noOffers}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold">{t.title}</h1>
        
        {/* Expired toggle */}
        {expiredOffers.length > 0 && (
          <Button
            variant={showExpired ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowExpired(!showExpired)}
            className="text-xs md:text-sm h-7 md:h-8 px-3 lg:text-base lg:h-9 lg:px-4"
          >
            {t.expired} ({expiredOffers.length})
          </Button>
        )}
      </div>
      
      
      {/* Student Discount Stats */}
      <StudentDiscountStats businessId={businessId} language={language} />
      
      {/* Offers list - redesigned cards with tighter spacing */}
      <div className="space-y-3 md:space-y-4">
        {displayedOffers.map((offer) => {
          const expired = isOfferExpired(offer);
          return (
          <Card key={offer.id} className={`bg-card/50 border-border/50 ${expired ? 'opacity-60' : ''}`}>
            <CardContent className="p-3 md:p-4">
              {/* 2-row grid to match mockup: (title+date) / (badges+actions) */}
              <div className="grid grid-cols-[1fr_auto] gap-x-2 md:gap-x-4 gap-y-2">
                {/* Row 1 - Left: Title + boost badge */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <h3 className="text-sm md:text-base lg:text-lg font-semibold truncate">{offer.title}</h3>
                    <ActiveOfferBoostBadge offerId={offer.id} label={t.boosted} />
                  </div>

                  {/* Date row */}
                  <div className="mt-1 flex items-center gap-1 text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{formatOfferDates(offer.start_at, offer.end_at)}</span>
                  </div>
                </div>

                {/* Row 1 - Right: Boost + Edit icons */}
                <div className="flex items-start justify-end gap-0.5 md:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBoostingOffer({ id: offer.id, title: offer.title })}
                    title={t.boost}
                    className="h-7 w-7 md:h-8 md:w-8 text-primary hover:text-primary"
                  >
                    <Rocket className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingOffer(offer)}
                    title={t.edit}
                    className="h-7 w-7 md:h-8 md:w-8"
                  >
                    <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>

                {/* Row 2 - Left: Status + %OFF (always side-by-side) */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={offer.active ? "default" : "secondary"}
                    className={`h-7 px-3 text-xs md:h-8 md:text-sm ${offer.active ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {offer.active ? t.active : t.inactive}
                  </Badge>

                  {offer.percent_off && (
                    <Badge
                      variant="outline"
                      className="h-7 px-3 text-xs md:h-8 md:text-sm text-primary border-primary/30 bg-primary/5 font-semibold"
                    >
                      {offer.percent_off}% OFF
                    </Badge>
                  )}
                </div>

                {/* Row 2 - Right: Deactivate + Delete aligned on same baseline */}
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(offer.id, offer.active || false)}
                    className="h-7 px-3 text-xs md:h-8 md:text-sm"
                  >
                    {offer.active ? t.deactivate : t.activate}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(offer.id)}
                    className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                    title={t.delete}
                  >
                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
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

      {/* Offer Edit Dialog */}
      {editingOffer && (
        <OfferEditDialog
          offer={editingOffer}
          open={!!editingOffer}
          onOpenChange={(open) => !open && setEditingOffer(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
          }}
        />
      )}
    </div>
  );
};

export default OffersList;
