import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Check, Sparkles, Loader2, Zap, Crown, Star, ExternalLink, Calendar, 
  Rocket, TrendingUp, Building2, MapPin, BarChart3, Target, Lightbulb,
  FileText, Percent, Mail, Gift
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti, useConfetti } from '@/components/ui/confetti';
import { SuccessCheckmark } from '@/components/ui/success-animation';

type BillingCycle = 'monthly' | 'annual';

const translations = {
  el: {
    selectPlan: "Επιλέξτε το πλάνο σας",
    monthly: "Μηνιαίο",
    annual: "Ετήσιο",
    saveMonths: "2 μήνες δωρεάν!",
    perMonth: "/μήνα",
    billedAnnually: "χρέωση ετησίως",
    choosePlan: "Επιλογή",
    currentPlan: "Τρέχον Πλάνο",
    loading: "Φόρτωση...",
    activeSubscription: "Η Συνδρομή σας",
    manageSubscription: "Διαχείριση",
    renewsOn: "Ανανεώνεται στις",
    boostBudget: "Boost Credits",
    remainingThisMonth: "Διαθέσιμο αυτόν τον μήνα",
    annualBilling: "Ετήσια χρέωση",
    monthlyBilling: "Μηνιαία χρέωση",
    subscriptionActive: "Ενεργή Συνδρομή",
    welcomeBack: "Καλώς ήρθατε!",
    subscriptionActivated: "Η συνδρομή σας ενεργοποιήθηκε!",
    subscriptionCanceled: "Η αγορά ακυρώθηκε",
    viewOtherPlans: "Δείτε άλλα πλάνα",
    usageReset: "Επαναφορά στις",
    of: "από",
    yourPlan: "Το Πλάνο σας",
    mostPopular: "Δημοφιλέστερη",
    // Free plan
    freeTitle: "FREE",
    freeBusinessProfile: "Προφίλ επιχείρησης",
    freeEventCreation: "Εκδηλώσεις",
    freeOfferCreation: "Προσφορές",
    freeMarketplace: "Marketplace",
    freeMapPresence: "Χάρτης",
    freeAnalytics: "Αναλυτικά (Επισκόπηση)",
    freeCommission: "12%",
    freeBoostCredits: "0€",
    freeSupport: "Free Support",
    // Basic plan
    basicAllFree: "Όλα τα οφέλη του Free",
    basicMarketplace: "Βελτιωμένη προβολή",
    basicMarketplaceNote: "(ισχυρότερη από του Free)",
    basicMapPresence: "Κανονική παρουσία στον χάρτη",
    basicAnalytics: "Αναλυτικά απόδοσης",
    basicAnalyticsNote: "(προφίλ + προσφορών + εκδηλώσεων)",
    basicAudience: "Κοινό Επισκεπτών",
    basicCommission: "Commission: 10%",
    basicBoostCredits: "Boost credits: 50€",
    basicSupport: "Basic Support",
    // Pro plan
    proAllBasic: "Όλα τα οφέλη του Basic",
    proMarketplace: "Αυξημένη προβολή",
    proMarketplaceNote: "(ισχυρότερη από Basic)",
    proMapPresence: "Ενισχυμένη παρουσία στον χάρτη",
    proBoostAnalytics: "Αναλυτικά Αξίας Προώθησης",
    proBoostCompare: "Σύγκριση Απόδοσης Boosted vs non-Boosted",
    proAudienceTargeting: "Καλύτερη στόχευση κοινού",
    proCommission: "Commission: 8%",
    proBoostCredits: "Boost credits: 150€",
    proSupport: "Pro Support",
    // Elite plan
    eliteAllPro: "Όλα τα οφέλη του Pro",
    eliteMarketplace: "Μέγιστη προτεραιότητα προβολής Παγκύπρια",
    eliteMapPresence: "Κυρίαρχη παρουσία στον χάρτη",
    eliteFullAnalytics: "Πλήρης πρόσβαση στα αναλυτικά",
    eliteGuidance: "Καθοδήγηση και στρατηγικές προτάσεις",
    eliteBestTimes: "Καλύτερες μέρες και ώρες",
    eliteGrowthPlan: "Πλάνο αύξησης πελατών",
    eliteCommission: "Commission: 6%",
    eliteBoostCredits: "Boost credits: 300€",
    eliteSupport: "Elite Support",
    // Enterprise
    enterprise: "Enterprise",
    enterpriseDesc: "Για μεγάλες επιχειρήσεις με ειδικές ανάγκες",
    contactUs: "Επικοινωνήστε μαζί μας:",
  },
  en: {
    selectPlan: "Choose Your Plan",
    monthly: "Monthly",
    annual: "Annual",
    saveMonths: "2 months free!",
    perMonth: "/month",
    billedAnnually: "billed annually",
    choosePlan: "Get Started",
    currentPlan: "Current Plan",
    loading: "Loading...",
    activeSubscription: "Your Subscription",
    manageSubscription: "Manage",
    renewsOn: "Renews on",
    boostBudget: "Boost Credits",
    remainingThisMonth: "Available this month",
    annualBilling: "Annual billing",
    monthlyBilling: "Monthly billing",
    subscriptionActive: "Active Subscription",
    welcomeBack: "Welcome back!",
    subscriptionActivated: "Your subscription is now active!",
    subscriptionCanceled: "Purchase was canceled",
    viewOtherPlans: "View other plans",
    usageReset: "Resets on",
    of: "of",
    yourPlan: "Your Plan",
    mostPopular: "Most Popular",
    // Free plan
    freeTitle: "FREE",
    freeBusinessProfile: "Business profile",
    freeEventCreation: "Events",
    freeOfferCreation: "Offers",
    freeMarketplace: "Marketplace",
    freeMapPresence: "Map",
    freeAnalytics: "Analytics (Overview)",
    freeCommission: "12%",
    freeBoostCredits: "€0",
    freeSupport: "Free Support",
    // Basic plan
    basicAllFree: "All Free benefits",
    basicMarketplace: "Improved visibility",
    basicMarketplaceNote: "(stronger than Free)",
    basicMapPresence: "Normal map presence",
    basicAnalytics: "Performance analytics",
    basicAnalyticsNote: "(profile + offers + events)",
    basicAudience: "Visitor Audience",
    basicCommission: "Commission: 10%",
    basicBoostCredits: "Boost credits: €50",
    basicSupport: "Basic Support",
    // Pro plan
    proAllBasic: "All Basic benefits",
    proMarketplace: "Enhanced visibility",
    proMarketplaceNote: "(stronger than Basic)",
    proMapPresence: "Enhanced map presence",
    proBoostAnalytics: "Boost Value Analytics",
    proBoostCompare: "Boosted vs non-Boosted Performance Comparison",
    proAudienceTargeting: "Better audience targeting",
    proCommission: "Commission: 8%",
    proBoostCredits: "Boost credits: €150",
    proSupport: "Pro Support",
    // Elite plan
    eliteAllPro: "All Pro benefits",
    eliteMarketplace: "Maximum visibility priority Cyprus-wide",
    eliteMapPresence: "Dominant map presence",
    eliteFullAnalytics: "Full analytics access",
    eliteGuidance: "Guidance and strategic recommendations",
    eliteBestTimes: "Best days and hours",
    eliteGrowthPlan: "Customer growth plan",
    eliteCommission: "Commission: 6%",
    eliteBoostCredits: "Boost credits: €300",
    eliteSupport: "Elite Support",
    // Enterprise
    enterprise: "Enterprise",
    enterpriseDesc: "For large businesses with special needs",
    contactUs: "Contact us:",
  },
};

// Plan configuration
const PLAN_CONFIG = {
  basic: {
    icon: Zap,
    gradient: 'from-blue-500 to-cyan-500',
    monthlyPrice: 5999,
    annualMonthlyPrice: 4999,
  },
  pro: {
    icon: Star,
    gradient: 'from-primary to-sunset-coral',
    monthlyPrice: 11999,
    annualMonthlyPrice: 9999,
  },
  elite: {
    icon: Crown,
    gradient: 'from-purple-500 to-pink-500',
    monthlyPrice: 23999,
    annualMonthlyPrice: 19999,
  },
};

interface SubscriptionPlansProps {
  embedded?: boolean;
}

export default function SubscriptionPlans({ embedded = false }: SubscriptionPlansProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const { isActive: confettiActive, trigger: triggerConfetti, reset: resetConfetti } = useConfetti();

  const t = translations[language];

  const { data: currentSubscription, refetch: refetchSubscription } = useQuery({
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
    refetchInterval: 60000,
  });

  // Handle success/canceled URL parameters
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      setShowSuccessState(true);
      triggerConfetti();
      toast.success(t.subscriptionActivated);
      refetchSubscription();
      
      setTimeout(() => {
        searchParams.delete('subscription');
        setSearchParams(searchParams, { replace: true });
      }, 1000);
      
      setTimeout(() => {
        setShowSuccessState(false);
      }, 4000);
    } else if (subscriptionStatus === 'canceled') {
      toast.info(t.subscriptionCanceled);
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, triggerConfetti, refetchSubscription, t.subscriptionActivated, t.subscriptionCanceled]);

  const handleChoosePlan = async (planSlug: string) => {
    setLoadingPlan(planSlug);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === 'el' ? 'Παρακαλώ συνδεθείτε για να εγγραφείτε' : 'Please log in to subscribe');
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
        const popup = window.open(data.url, '_blank');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error creating checkout session:', error);

      if (message.toLowerCase().includes('no business found')) {
        toast.error(
          language === 'el'
            ? 'Δεν βρέθηκε επιχείρηση για τον λογαριασμό σας.'
            : 'No business profile found for your account.'
        );
      } else {
        toast.error(
          language === 'el'
            ? `Αποτυχία εκκίνησης πληρωμής: ${message}`
            : `Failed to start checkout: ${message}`
        );
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === 'el' ? 'Παρακαλώ συνδεθείτε' : 'Please log in');
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
      toast.error(language === 'el' ? 'Αποτυχία ανοίγματος διαχείρισης συνδρομής' : 'Failed to open subscription management');
    }
  };

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isCurrentPlan = (planSlug: string) => {
    return currentSubscription?.subscribed && currentSubscription?.plan_slug === planSlug;
  };

  // Get features for each plan
  const getBasicFeatures = () => [
    { icon: Gift, text: t.basicAllFree },
    { icon: TrendingUp, text: t.basicMarketplace, note: t.basicMarketplaceNote },
    { icon: MapPin, text: t.basicMapPresence },
    { icon: BarChart3, text: t.basicAnalytics, note: t.basicAnalyticsNote },
    { icon: Target, text: t.basicAudience },
    { icon: Percent, text: t.basicCommission },
    { icon: Rocket, text: t.basicBoostCredits },
    { icon: null, text: t.basicSupport },
  ];

  const getProFeatures = () => [
    { icon: Gift, text: t.proAllBasic },
    { icon: TrendingUp, text: t.proMarketplace, note: t.proMarketplaceNote },
    { icon: MapPin, text: t.proMapPresence },
    { icon: BarChart3, text: t.proBoostAnalytics },
    { icon: Lightbulb, text: t.proBoostCompare },
    { icon: Target, text: t.proAudienceTargeting },
    { icon: Percent, text: t.proCommission },
    { icon: Rocket, text: t.proBoostCredits },
    { icon: null, text: t.proSupport },
  ];

  const getEliteFeatures = () => [
    { icon: Gift, text: t.eliteAllPro },
    { icon: Crown, text: t.eliteMarketplace },
    { icon: MapPin, text: t.eliteMapPresence },
    { icon: BarChart3, text: t.eliteFullAnalytics },
    { icon: Lightbulb, text: t.eliteGuidance },
    { icon: Calendar, text: t.eliteBestTimes },
    { icon: TrendingUp, text: t.eliteGrowthPlan },
    { icon: Percent, text: t.eliteCommission },
    { icon: Rocket, text: t.eliteBoostCredits },
    { icon: null, text: t.eliteSupport },
  ];

  // Calculate subscription usage percentages
  const budgetUsedPercent = currentSubscription?.event_boost_budget_cents > 0
    ? ((currentSubscription.event_boost_budget_cents - currentSubscription.monthly_budget_remaining_cents) / 
       currentSubscription.event_boost_budget_cents) * 100
    : 0;

  const currentPlanConfig = currentSubscription?.plan_slug ? PLAN_CONFIG[currentSubscription.plan_slug as keyof typeof PLAN_CONFIG] : null;
  const PlanIcon = currentPlanConfig?.icon || Zap;
  const currentPlanGradient = currentPlanConfig?.gradient || 'from-blue-500 to-cyan-500';

  const plans = ['basic', 'pro', 'elite'] as const;

  const renderFeatureItem = (feature: { icon: any; text: string; note?: string }, gradient: string, index: number) => (
    <li key={index} className="flex items-start gap-2.5">
      <div className={`p-0.5 rounded-full bg-gradient-to-br ${gradient} mt-0.5 shrink-0`}>
        <Check className="w-3 h-3 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-foreground/90">{feature.text}</span>
        {feature.note && (
          <span className="text-xs text-muted-foreground">{feature.note}</span>
        )}
      </div>
    </li>
  );

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-gradient-to-b from-background via-background to-muted/30"}>
      {/* Confetti */}
      <Confetti 
        isActive={confettiActive} 
        onComplete={resetConfetti}
        particleCount={80}
        duration={4000}
      />

      {/* Success Celebration Overlay */}
      <AnimatePresence>
        {showSuccessState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-center"
            >
              <SuccessCheckmark isVisible={showSuccessState} size="lg" />
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-2xl font-bold text-foreground"
              >
                {t.subscriptionActivated}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-muted-foreground"
              >
                {t.welcomeBack}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Subscription Card - Shows when user has subscription */}
      {currentSubscription?.subscribed && (
        <div className={`${embedded ? 'px-0' : 'max-w-7xl mx-auto px-4'} ${embedded ? 'pt-0 pb-6' : 'pt-8 pb-6'}`}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentPlanGradient}`} />
              
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Plan Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${currentPlanGradient} text-white shadow-lg`}>
                        <PlanIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold">{currentSubscription.plan_name}</h2>
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            {t.subscriptionActive}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {currentSubscription.billing_cycle === 'annual' ? t.annualBilling : t.monthlyBilling}
                        </p>
                      </div>
                    </div>

                    {/* Renewal Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="w-4 h-4" />
                      <span>{t.renewsOn}:</span>
                      <span className="font-medium text-foreground">{formatDate(currentSubscription.subscription_end)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleManageSubscription}
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t.manageSubscription}
                      </Button>
                    </div>
                  </div>

                  {/* Boost Budget */}
                  <div className="flex-1">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Rocket className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{t.boostBudget}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t.remainingThisMonth}</span>
                          <span className="font-semibold">
                            {formatCurrency(currentSubscription.monthly_budget_remaining_cents)}
                          </span>
                        </div>
                        <Progress value={100 - budgetUsedPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {t.of} {formatCurrency(currentSubscription.event_boost_budget_cents)} • {t.usageReset} {formatDate(currentSubscription.subscription_end)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section divider for viewing other plans */}
          <div className="flex items-center gap-4 mt-8 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t.viewOtherPlans}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      {/* Header Section with Free Plan */}
      <div className={`${embedded ? 'px-0' : 'max-w-7xl mx-auto px-4'} ${currentSubscription?.subscribed ? 'pb-4' : embedded ? 'pt-6 pb-4' : 'pt-12 pb-4'}`}>
        {/* Free Plan - Compact Horizontal Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <div className="px-4 py-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* Free Plan Title */}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm text-foreground">{t.freeTitle}</span>
              </div>
              
              {/* Separator */}
              <div className="hidden sm:block h-4 w-px bg-border" />
              
              {/* Features - All inline with consistent styling */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeBusinessProfile}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeEventCreation}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeOfferCreation}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeMarketplace}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeMapPresence}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.freeAnalytics}
                </span>
              </div>
              
              {/* Separator */}
              <div className="hidden md:block h-4 w-px bg-border" />
              
              {/* Stats - compact pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Commission: {t.freeCommission}</span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Boost: {t.freeBoostCredits}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Title & Billing Toggle - Stacked on mobile/tablet, row on desktop */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center gap-4 mb-6 lg:flex-row lg:justify-between"
        >
          <h2 className="text-xl font-semibold text-foreground">{t.selectPlan}</h2>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1.5 bg-muted rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-background text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.annual}
              <Badge className="bg-gradient-to-r from-primary to-sunset-coral text-white border-0 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                {t.saveMonths}
              </Badge>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Plans Grid - Single column on mobile/tablet, 3 columns on desktop */}
      <div className={`${embedded ? 'px-0' : 'max-w-7xl mx-auto px-4'} pb-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          {plans.map((planSlug, index) => {
            const config = PLAN_CONFIG[planSlug];
            const price = billingCycle === 'monthly' ? config.monthlyPrice : config.annualMonthlyPrice;
            const isMostPopular = planSlug === 'pro';
            const isCurrent = isCurrentPlan(planSlug);
            const PlanIconComponent = config.icon;
            
            const features = planSlug === 'basic' 
              ? getBasicFeatures() 
              : planSlug === 'pro' 
                ? getProFeatures() 
                : getEliteFeatures();

            return (
              <motion.div
                key={planSlug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    isCurrent ? 'ring-2 ring-primary' : ''
                  } ${isMostPopular ? 'shadow-lg border-primary/30' : ''}`}
                >
                  {/* Gradient Top Border & Most Popular Badge for Pro */}
                  {isMostPopular && (
                    <>
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} rounded-t-lg`} />
                      <div className="absolute -top-3 left-4">
                        <Badge className={`bg-gradient-to-r ${config.gradient} text-white border-0 shadow-md px-3 py-1`}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t.mostPopular}
                        </Badge>
                      </div>
                    </>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary" className="shadow-md px-3 py-1">
                        <Check className="w-3 h-3 mr-1" />
                        {t.yourPlan}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    {/* Plan Icon & Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} text-white`}>
                        <PlanIconComponent className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold uppercase">{planSlug}</h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatPrice(price)}</span>
                      <span className="text-sm text-muted-foreground">{t.perMonth}</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.billedAnnually}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 pb-4">
                    {/* Features List */}
                    <ul className="space-y-2.5">
                      {features.map((feature, idx) => 
                        renderFeatureItem(feature, config.gradient, idx)
                      )}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4 border-t">
                    <Button
                      className={`w-full ${isMostPopular ? `bg-gradient-to-r ${config.gradient} hover:opacity-90` : ''}`}
                      variant={isCurrent ? "secondary" : isMostPopular ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleChoosePlan(planSlug)}
                      disabled={loadingPlan !== null || isCurrent}
                    >
                      {loadingPlan === planSlug ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.loading}
                        </>
                      ) : isCurrent ? (
                        t.currentPlan
                      ) : (
                        t.choosePlan
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Enterprise Section - Horizontal */}
      <div className={`${embedded ? 'px-0' : 'max-w-7xl mx-auto px-4'} pb-12`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="p-5 rounded-xl bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border border-border/50">
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{t.enterprise}</h3>
                  <p className="text-sm text-muted-foreground">{t.enterpriseDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t.contactUs}</span>
                <a 
                  href="mailto:hello@fomo.cy"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-4 h-4" />
                  hello@fomo.cy
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
