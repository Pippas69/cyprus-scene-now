import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, ExternalLink, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function SubscriptionStatus() {
  const navigate = useNavigate();

  // Fetch subscription status
  const { data: subscriptionData, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  // Auto-refresh on mount and when returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast.success('Subscription activated successfully!');
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard-business');
    } else if (params.get('subscription') === 'canceled') {
      toast.info('Subscription purchase canceled');
      window.history.replaceState({}, '', '/dashboard-business');
    }
  }, [refetch]);

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to manage subscription');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const popup = window.open(data.url, '_blank');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = data.url;
        }
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management. Please try again.');
    }
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No active subscription
  if (!subscriptionData?.subscribed) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Unlock Premium Features
          </CardTitle>
          <CardDescription>
            Subscribe to a plan to access event boosts, commission-free offers, and advanced analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate('/subscription-plans')}
            className="w-full"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active subscription
  const budgetUsedPercent = subscriptionData.event_boost_budget_cents > 0
    ? ((subscriptionData.event_boost_budget_cents - subscriptionData.monthly_budget_remaining_cents) / 
       subscriptionData.event_boost_budget_cents) * 100
    : 0;

  const offersUsedPercent = subscriptionData.commission_free_offers_count > 0
    ? ((subscriptionData.commission_free_offers_count - subscriptionData.commission_free_offers_remaining) / 
       subscriptionData.commission_free_offers_count) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Subscription Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {subscriptionData.plan_name}
              </CardTitle>
              <CardDescription className="mt-1">
                {subscriptionData.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-green-500">
              {subscriptionData.status === 'active' ? 'Active' : subscriptionData.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Subscription renews on</p>
            <p className="text-lg font-semibold">{formatDate(subscriptionData.subscription_end)}</p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleManageSubscription}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
            <Button 
              onClick={() => navigate('/subscription-plans')}
              variant="outline"
              className="flex-1"
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Boost Budget Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Boost Budget</CardTitle>
          <CardDescription>Monthly allocation for promoting events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining this month</span>
            <span className="font-semibold">
              {formatCurrency(subscriptionData.monthly_budget_remaining_cents)} of{' '}
              {formatCurrency(subscriptionData.event_boost_budget_cents)}
            </span>
          </div>
          <Progress value={budgetUsedPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Budget resets on {formatDate(subscriptionData.subscription_end)}
          </p>
        </CardContent>
      </Card>

      {/* COMMISSION DISABLED: All offers are commission-free - Card hidden */}
    </div>
  );
}
