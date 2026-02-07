import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Ticket, Calendar, Sparkles, Rocket, Pencil, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { StudentDiscountStats } from "./StudentDiscountStats";
import OfferBoostDialog from "./OfferBoostDialog";
import OfferEditDialog from "./OfferEditDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

// Helper component to show active boost badge for offers - positioned half in/half out above icons
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
      className="absolute -top-2.5 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-white flex items-center gap-0.5 shadow-md cursor-default text-[9px] md:text-[10px] lg:text-xs h-5 md:h-6 px-1.5 md:px-2"
    >
      <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3" />
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
      deleteConfirmTitle: "Διαγραφή Προσφοράς",
      deleteConfirmDescription: "Είστε σίγουροι ότι θέλετε να διαγράψετε την προσφορά",
      deleteConfirmWarning: "Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Όλα τα δεδομένα εξαργύρωσης θα χαθούν.",
      cancel: "Ακύρωση",
      confirmDelete: "Ναι, Διαγραφή",
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
      deleteConfirmTitle: "Delete Offer",
      deleteConfirmDescription: "Are you sure you want to delete the offer",
      deleteConfirmWarning: "This action cannot be undone. All redemption data will be lost.",
      cancel: "Cancel",
      confirmDelete: "Yes, Delete",
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

  // Fetch redemption counts for all offers (status = 'redeemed')
  const { data: redemptionCounts } = useQuery({
    queryKey: ['offer-redemption-counts', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_purchases')
        .select('discount_id')
        .eq('business_id', businessId)
        .eq('status', 'redeemed');

      if (error) throw error;
      
      // Count redemptions per discount_id
      const counts: Record<string, number> = {};
      (data || []).forEach(purchase => {
        if (purchase.discount_id) {
          counts[purchase.discount_id] = (counts[purchase.discount_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!businessId,
  });

  // Get redemption count for a specific offer
  const getRedemptionCount = (offerId: string): number => {
    return redemptionCounts?.[offerId] || 0;
  };

  // Real-time subscription for offers and redemptions
  useEffect(() => {
    const offersChannel = supabase
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

    // Subscribe to offer_purchases changes for real-time redemption counts
    const purchasesChannel = supabase
      .channel('business-offer-purchases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_purchases',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['offer-redemption-counts', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
      supabase.removeChannel(purchasesChannel);
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
          <Card key={offer.id} className={`bg-card/50 border-border/50 relative ${expired ? 'opacity-60' : ''}`}>
            {/* Boost badge - positioned half in/half out above icons */}
            <ActiveOfferBoostBadge offerId={offer.id} label={t.boosted} />
            
            <CardContent className="p-3 md:p-4">
              {/* 2-row grid to match mockup: (title+date) / (badges+actions) */}
              <div className="grid grid-cols-[1fr_auto] gap-x-2 md:gap-x-4 gap-y-2">
                {/* Row 1 - Left: Title */}
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold truncate">{offer.title}</h3>

                  {/* Date row + Redemption count */}
                  <div className="mt-1 flex items-center gap-2 text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{formatOfferDates(offer.start_at, offer.end_at)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-primary font-medium whitespace-nowrap">
                      <Hash className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                      <span className="text-[9px] md:text-[10px] lg:text-xs">{getRedemptionCount(offer.id)} {language === "el" ? "Εξαργυρώσεις" : "Redemptions"}</span>
                    </div>
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

                {/* Row 2 - Left: Status + %OFF (always side-by-side) - smaller badges for mobile/tablet */}
                <div className="flex items-center gap-1 md:gap-2">
                  <Badge
                    variant={offer.active ? "default" : "secondary"}
                    className={`h-5 md:h-6 lg:h-7 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm ${offer.active ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {offer.active ? t.active : t.inactive}
                  </Badge>

                  {offer.percent_off && (
                    <Badge
                      variant="outline"
                      className="h-5 md:h-6 lg:h-7 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm text-primary border-primary/30 bg-primary/5 font-semibold"
                    >
                      {offer.percent_off}% OFF
                    </Badge>
                  )}

                  {/* Special Deal "Offer" badge - clickable with popover */}
                  {offer.discount_type === "special_deal" && offer.special_deal_text && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge
                          variant="outline"
                          className="h-5 md:h-6 lg:h-7 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm cursor-pointer hover:bg-muted transition-colors"
                        >
                          Offer
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" side="top" align="start">
                        <p className="text-xs font-medium">{offer.special_deal_text}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Row 2 - Right: Deactivate + Delete - smaller for mobile/tablet */}
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(offer.id, offer.active || false)}
                    className="h-5 md:h-6 lg:h-7 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm"
                  >
                    {offer.active ? t.deactivate : t.activate}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingOffer({ id: offer.id, title: offer.title })}
                    className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-destructive hover:text-destructive"
                    title={t.delete}
                  >
                    <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOffer} onOpenChange={(open) => !open && setDeletingOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirmDescription} <strong>"{deletingOffer?.title}"</strong>; 
              <br /><br />
              {t.deleteConfirmWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingOffer) {
                  handleDelete(deletingOffer.id);
                  setDeletingOffer(null);
                }
              }}
            >
              {t.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OffersList;
