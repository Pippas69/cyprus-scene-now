import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

type BillingCycle = 'monthly' | 'annual';

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Fetch subscription plans from database
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
  });

  // Check current subscription
  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription'],
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
  });

  const handleChoosePlan = async (planSlug: string) => {
    setLoadingPlan(planSlug);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to subscribe');
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          plan_slug: planSlug,
          billing_cycle: billingCycle,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(0)}`;
  };

  const isCurrentPlan = (planSlug: string) => {
    return currentSubscription?.subscribed && 
           currentSubscription?.plan_slug === planSlug &&
           currentSubscription?.billing_cycle === billingCycle;
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Select the perfect plan to grow your business
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={billingCycle === 'monthly' ? 'font-semibold' : ''}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === 'annual'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
            />
            <Label htmlFor="billing-toggle" className={billingCycle === 'annual' ? 'font-semibold' : ''}>
              Annual
            </Label>
            {billingCycle === 'annual' && (
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="w-3 h-3 mr-1" />
                Save 2 months
              </Badge>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans?.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly_cents : plan.price_annual_cents;
            const features = plan.features as string[] || [];
            const isMostPopular = plan.slug === 'growth';
            const isCurrent = isCurrentPlan(plan.slug);

            return (
              <Card 
                key={plan.id}
                className={`relative ${isCurrent ? 'border-primary border-2' : ''} ${isMostPopular ? 'shadow-lg' : ''}`}
              >
                {isMostPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <Badge variant="secondary" className="px-4 py-1">Your Plan</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="text-3xl font-bold text-foreground mt-4">
                      {formatPrice(price)}
                      <span className="text-base font-normal text-muted-foreground">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(price / 12)}/month billed annually
                      </p>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "secondary" : isMostPopular ? "default" : "outline"}
                    onClick={() => handleChoosePlan(plan.slug)}
                    disabled={loadingPlan !== null || isCurrent}
                  >
                    {loadingPlan === plan.slug ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      'Choose Plan'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Enterprise Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Enterprise</CardTitle>
            <CardDescription>
              Custom solutions for large-scale operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Custom event boost budgets</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited commission-free offers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Dedicated account manager</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.open('mailto:enterprise@example.com', '_blank')}
            >
              Contact Us
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
