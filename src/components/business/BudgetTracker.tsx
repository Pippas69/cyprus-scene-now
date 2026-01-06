import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";

interface BudgetTrackerProps {
  businessId: string;
}

export const BudgetTracker = ({ businessId }: BudgetTrackerProps) => {
  const { language } = useLanguage();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['business-subscription', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch current month's pending commission
  const { data: commissionData, isLoading: commissionLoading } = useQuery({
    queryKey: ['pending-commission', businessId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('commission_ledger')
        .select('commission_amount_cents')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .gte('redeemed_at', startOfMonth.toISOString());

      if (error) throw error;

      const total = data?.reduce((sum, item) => sum + item.commission_amount_cents, 0) || 0;
      return total;
    },
  });

  if (subLoading || commissionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const budgetUsedCents = (subscription.subscription_plans?.event_boost_budget_cents || 0) - 
    (subscription.monthly_budget_remaining_cents || 0);
  const budgetTotalCents = subscription.subscription_plans?.event_boost_budget_cents || 0;
  const budgetUsedPercent = budgetTotalCents > 0 ? (budgetUsedCents / budgetTotalCents) * 100 : 0;

  const offersUsed = (subscription.subscription_plans?.commission_free_offers_count || 0) -
    (subscription.commission_free_offers_remaining || 0);
  const offersTotalCount = subscription.subscription_plans?.commission_free_offers_count || 0;
  const offersUsedPercent = offersTotalCount > 0 ? (offersUsed / offersTotalCount) * 100 : 0;

  const pendingCommissionCents = commissionData || 0;
  const pendingCommissionEuros = (pendingCommissionCents / 100).toFixed(2);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'el' ? 'Υπόλοιπο Προωθήσεων & Προσφορών' : 'Event Boost Budget & Commission-Free Offers'}
          </CardTitle>
          <CardDescription>
            {language === 'el' 
              ? 'Παρακολουθήστε τη χρήση του πλάνου σας'
              : 'Track your subscription plan usage'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {language === 'el' ? 'Budget Προωθήσεων' : 'Event Boost Budget'}
              </span>
              <span className="text-sm text-muted-foreground">
                €{((subscription.monthly_budget_remaining_cents || 0) / 100).toFixed(2)} / 
                €{(budgetTotalCents / 100).toFixed(2)}
              </span>
            </div>
            <Progress value={100 - budgetUsedPercent} className="h-2" />
          </div>

          {/* COMMISSION DISABLED: All offers are commission-free
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {language === 'el' ? 'Προσφορές Χωρίς Προμήθεια' : 'Commission-Free Offers'}
              </span>
              <span className="text-sm text-muted-foreground">
                {subscription.commission_free_offers_remaining || 0} / {offersTotalCount}
              </span>
            </div>
            <Progress value={100 - offersUsedPercent} className="h-2" />
          </div>
          */}
        </CardContent>
      </Card>

      {/* COMMISSION DISABLED: Commission tracking hidden - All offers are commission-free */}
    </>
  );
};

export default BudgetTracker;
