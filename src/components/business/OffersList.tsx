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
        title: "Επιτυχία",
        description: "Η προσφορά διαγράφηκε",
      });

      queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
    } catch (error: any) {
      toast({
        title: "Σφάλμα",
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
        title: "Επιτυχία",
        description: currentStatus ? "Η προσφορά απενεργοποιήθηκε" : "Η προσφορά ενεργοποιήθηκε",
      });

      queryClient.invalidateQueries({ queryKey: ['business-offers', businessId] });
    } catch (error: any) {
      toast({
        title: "Σφάλμα",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Φόρτωση...</div>;
  }

  if (!offers || offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Δεν έχετε δημοσιεύσει καμία προσφορά ακόμα.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <Card key={offer.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{offer.title}</h3>
                      <Badge variant={offer.active ? "default" : "secondary"}>
                        {offer.active ? "Ενεργή" : "Ανενεργή"}
                      </Badge>
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
                      {formatDate(offer.start_at)} - {formatDate(offer.end_at)}
                    </span>
                  </div>
                </div>

                {offer.terms && (
                  <p className="text-xs text-muted-foreground italic">
                    Όροι: {offer.terms}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(offer.id, offer.active || false)}
                >
                  {offer.active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(offer.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OffersList;
