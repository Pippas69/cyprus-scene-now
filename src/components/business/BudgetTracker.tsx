import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Ticket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface BudgetTrackerProps {
  businessId: string;
}

const BudgetTracker = ({ businessId }: BudgetTrackerProps) => {
  const { language } = useLanguage();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-budget", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_subscriptions")
        .select(`
          *,
          subscription_plans (
            name,
            event_boost_budget_cents,
            commission_free_offers_count
          )
        `)
        .eq("business_id", businessId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription || subscription.status !== "active") {
    return null;
  }

  const plan = subscription.subscription_plans;
  const budgetUsedCents = (plan?.event_boost_budget_cents || 0) - (subscription.monthly_budget_remaining_cents || 0);
  const budgetProgressPercent = plan?.event_boost_budget_cents
    ? (budgetUsedCents / plan.event_boost_budget_cents) * 100
    : 0;

  const offersUsed = (plan?.commission_free_offers_count || 0) - (subscription.commission_free_offers_remaining || 0);
  const offersProgressPercent = plan?.commission_free_offers_count
    ? (offersUsed / plan.commission_free_offers_count) * 100
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Event Boost Budget */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {language === "el" ? "Budget Προωθήσεων" : "Event Boost Budget"}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {plan?.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "el" ? "Υπόλοιπο" : "Remaining"}
              </span>
              <span className="font-bold">
                €{((subscription.monthly_budget_remaining_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
            <Progress value={100 - budgetProgressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {language === "el" ? "Χρησιμοποιήθηκε" : "Used"}: €
                {(budgetUsedCents / 100).toFixed(2)}
              </span>
              <span>
                {language === "el" ? "Σύνολο" : "Total"}: €
                {((plan?.event_boost_budget_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission-Free Offers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              {language === "el" ? "Προσφορές Χωρίς Προμήθεια" : "Commission-Free Offers"}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {plan?.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === "el" ? "Διαθέσιμες" : "Available"}
              </span>
              <span className="font-bold">
                {subscription.commission_free_offers_remaining || 0}
              </span>
            </div>
            <Progress value={100 - offersProgressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {language === "el" ? "Χρησιμοποιήθηκαν" : "Used"}: {offersUsed}
              </span>
              <span>
                {language === "el" ? "Σύνολο" : "Total"}: {plan?.commission_free_offers_count || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetTracker;
