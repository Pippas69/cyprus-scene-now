import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, Sparkles, Loader2, Info, Zap, Crown, Building2, ArrowRight, Star, Shield, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';

type BillingCycle = 'monthly' | 'annual';

interface PlanFeature {
  el: string;
  en: string;
}

const translations = {
  el: {
    title: "Επιλέξτε το Πλάνο σας",
    subtitle: "Αναπτύξτε την επιχείρησή σας με τα κατάλληλα εργαλεία",
    monthly: "Μηνιαίο",
    annual: "Ετήσιο",
    saveMonths: "2 μήνες δώρο!",
    month: "μήνα",
    year: "έτος",
    perMonth: "/μήνα",
    billedAnnually: "χρέωση ετησίως",
    mostPopular: "Δημοφιλέστερο",
    yourPlan: "Το Πλάνο σας",
    choosePlan: "Επιλογή",
    currentPlan: "Τρέχον Πλάνο",
    loading: "Φόρτωση...",
    learnMore: "Μάθετε Περισσότερα",
    enterprise: "Enterprise",
    enterpriseDesc: "Προσαρμοσμένες λύσεις για μεγάλες επιχειρήσεις",
    customBudget: "Απεριόριστα event boosts",
    unlimitedOffers: "Απεριόριστες προσφορές χωρίς προμήθεια",
    dedicatedManager: "Αποκλειστικός account manager",
    prioritySupport: "24/7 υποστήριξη",
    customIntegrations: "Προσαρμοσμένες ενσωματώσεις",
    whiteLabel: "White-label επιλογές",
    contactUs: "Επικοινωνήστε μαζί μας",
    planDetails: "Λεπτομέρειες Πλάνου",
    whatYouGet: "Τι Περιλαμβάνει",
    bestFor: "Ιδανικό για",
    keyBenefits: "Κύρια Οφέλη",
    starterBestFor: "Νέες επιχειρήσεις που ξεκινούν τη διαδικτυακή τους παρουσία",
    growthBestFor: "Αναπτυσσόμενες επιχειρήσεις που θέλουν περισσότερη προβολή",
    professionalBestFor: "Καθιερωμένες επιχειρήσεις με μεγάλο πελατολόγιο",
    starterDesc: "Ξεκινήστε την ψηφιακή σας παρουσία με βασικά εργαλεία προώθησης",
    growthDesc: "Αυξήστε την ορατότητά σας με προηγμένες δυνατότητες",
    professionalDesc: "Μέγιστη προβολή και πλήρης έλεγχος της παρουσίας σας",
    boostValue: "Αξία boosts",
    commissionFree: "Χωρίς προμήθεια",
    targeting: "Στόχευση",
    support: "Υποστήριξη",
    analytics: "Αναλυτικά",
    basic: "Βασική",
    standard: "Προηγμένη",
    premium: "Premium",
    email: "Email",
    priorityEmail: "Προτεραιότητα Email",
    phone: "Τηλεφωνική",
    monthlyReport: "Μηνιαία",
    advancedReport: "Προηγμένα",
    realtimeReport: "Real-time",
    // New boost breakdown translations
    eventBoostBreakdown: "Ανάλυση Event Boosts",
    eventsPerMonth: "Events ανά μήνα",
    budgetPerEvent: "Budget ανά Event",
    totalBoostValue: "Συνολική Αξία Boosts",
    valueBonus: "Μπόνους Αξίας",
    offerBoostQuality: "Ποιότητα Boost Προσφορών",
    enhanced: "Ενισχυμένη",
    youSave: "Κερδίζετε",
    bonusValue: "επιπλέον αξία!",
  },
  en: {
    title: "Choose Your Plan",
    subtitle: "Grow your business with the right tools",
    monthly: "Monthly",
    annual: "Annual",
    saveMonths: "2 months free!",
    month: "month",
    year: "year",
    perMonth: "/month",
    billedAnnually: "billed annually",
    mostPopular: "Most Popular",
    yourPlan: "Your Plan",
    choosePlan: "Get Started",
    currentPlan: "Current Plan",
    loading: "Loading...",
    learnMore: "Learn More",
    enterprise: "Enterprise",
    enterpriseDesc: "Custom solutions for large-scale operations",
    customBudget: "Unlimited event boosts",
    unlimitedOffers: "Unlimited commission-free offers",
    dedicatedManager: "Dedicated account manager",
    prioritySupport: "24/7 priority support",
    customIntegrations: "Custom integrations",
    whiteLabel: "White-label options",
    contactUs: "Contact Us",
    planDetails: "Plan Details",
    whatYouGet: "What's Included",
    bestFor: "Best For",
    keyBenefits: "Key Benefits",
    starterBestFor: "New businesses starting their online presence",
    growthBestFor: "Growing businesses looking for more visibility",
    professionalBestFor: "Established businesses with large customer base",
    starterDesc: "Start your digital presence with essential promotion tools",
    growthDesc: "Increase your visibility with advanced features",
    professionalDesc: "Maximum exposure and full control of your presence",
    boostValue: "Boost value",
    commissionFree: "Commission-free",
    targeting: "Targeting",
    support: "Support",
    analytics: "Analytics",
    basic: "Basic",
    standard: "Standard",
    premium: "Premium",
    email: "Email",
    priorityEmail: "Priority Email",
    phone: "Phone",
    monthlyReport: "Monthly",
    advancedReport: "Advanced",
    realtimeReport: "Real-time",
    // New boost breakdown translations
    eventBoostBreakdown: "Event Boost Breakdown",
    eventsPerMonth: "Events per month",
    budgetPerEvent: "Budget per Event",
    totalBoostValue: "Total Boost Value",
    valueBonus: "Value Bonus",
    offerBoostQuality: "Offer Boost Quality",
    enhanced: "Enhanced",
    youSave: "You save",
    bonusValue: "extra value!",
  },
};

const planIcons: Record<string, React.ElementType> = {
  starter: Zap,
  growth: Star,
  professional: Crown,
};

const planColors: Record<string, string> = {
  starter: 'from-blue-500 to-cyan-500',
  growth: 'from-primary to-sunset-coral',
  professional: 'from-purple-500 to-pink-500',
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const t = translations[language];

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .neq('slug', 'enterprise')
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
  });

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
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(language === 'el' ? 'Αποτυχία εκκίνησης πληρωμής. Δοκιμάστε ξανά.' : 'Failed to start checkout. Please try again.');
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

  const getPlanDescription = (slug: string) => {
    const descriptions: Record<string, { el: string; en: string }> = {
      starter: { el: t.starterDesc, en: translations.en.starterDesc },
      growth: { el: t.growthDesc, en: translations.en.growthDesc },
      professional: { el: t.professionalDesc, en: translations.en.professionalDesc },
    };
    return descriptions[slug]?.[language] || '';
  };

  const getPlanBestFor = (slug: string) => {
    const bestFor: Record<string, { el: string; en: string }> = {
      starter: { el: t.starterBestFor, en: translations.en.starterBestFor },
      growth: { el: t.growthBestFor, en: translations.en.growthBestFor },
      professional: { el: t.professionalBestFor, en: translations.en.professionalBestFor },
    };
    return bestFor[slug]?.[language] || '';
  };

  const getPlanStats = (plan: typeof plans extends (infer T)[] ? T : never) => {
    const targeting = {
      starter: language === 'el' ? t.basic : translations.en.basic,
      growth: language === 'el' ? t.standard : translations.en.standard,
      professional: language === 'el' ? t.premium : translations.en.premium,
    };
    const support = {
      starter: language === 'el' ? t.email : translations.en.email,
      growth: language === 'el' ? t.priorityEmail : translations.en.priorityEmail,
      professional: language === 'el' ? t.phone : translations.en.phone,
    };
    const analytics = {
      starter: language === 'el' ? t.monthlyReport : translations.en.monthlyReport,
      growth: language === 'el' ? t.advancedReport : translations.en.advancedReport,
      professional: language === 'el' ? t.realtimeReport : translations.en.realtimeReport,
    };
    return {
      targeting: targeting[plan.slug as keyof typeof targeting] || targeting.starter,
      support: support[plan.slug as keyof typeof support] || support.starter,
      analytics: analytics[plan.slug as keyof typeof analytics] || analytics.starter,
    };
  };

  // Get boost breakdown details per plan based on agreed pricing structure
  const getBoostBreakdown = (slug: string, planPriceCents: number) => {
    const breakdown: Record<string, { events: number; budgetPerEvent: number; offerQuality: string }> = {
      starter: { events: 3, budgetPerEvent: 4000, offerQuality: 'basic' }, // 3 × €40 = €120
      growth: { events: 5, budgetPerEvent: 5000, offerQuality: 'enhanced' }, // 5 × €50 = €250
      professional: { events: 10, budgetPerEvent: 8000, offerQuality: 'premium' }, // 10 × €80 = €800
    };
    const details = breakdown[slug] || breakdown.starter;
    const totalBoostValue = details.events * details.budgetPerEvent;
    const valueBonus = totalBoostValue - planPriceCents;
    const bonusPercentage = Math.round((valueBonus / planPriceCents) * 100);
    
    return {
      ...details,
      totalBoostValue,
      valueBonus,
      bonusPercentage,
    };
  };

  const getOfferQualityLabel = (quality: string) => {
    const labels: Record<string, { el: string; en: string }> = {
      basic: { el: t.basic, en: translations.en.basic },
      enhanced: { el: t.enhanced, en: translations.en.enhanced },
      premium: { el: t.premium, en: translations.en.premium },
    };
    return labels[quality]?.[language] || labels.basic[language];
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-sunset-coral/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sunset-coral/10 rounded-full blur-3xl -translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t.title}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
              {t.subtitle}
            </p>

            {/* Billing Toggle - Pill Style */}
            <div className="inline-flex items-center gap-2 p-1.5 bg-muted rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
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
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans?.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly_cents : plan.price_annual_cents;
            const features = (plan.features as unknown as PlanFeature[]) || [];
            const isMostPopular = plan.slug === 'growth';
            const isCurrent = isCurrentPlan(plan.slug);
            const PlanIcon = planIcons[plan.slug] || Zap;
            const gradientColor = planColors[plan.slug] || planColors.starter;
            const stats = getPlanStats(plan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    isCurrent ? 'ring-2 ring-primary' : ''
                  } ${isMostPopular ? 'shadow-lg border-primary/30' : ''}`}
                >
                  {/* Gradient Top Border for Popular */}
                  {isMostPopular && (
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientColor} rounded-t-lg`} />
                  )}

                  {/* Badges */}
                  {isMostPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className={`bg-gradient-to-r ${gradientColor} text-white border-0 shadow-lg px-4 py-1`}>
                        <Star className="w-3 h-3 mr-1" />
                        {t.mostPopular}
                      </Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary" className="shadow-md px-3 py-1">
                        <Check className="w-3 h-3 mr-1" />
                        {t.yourPlan}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    {/* Plan Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradientColor} text-white`}>
                        <PlanIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{formatPrice(price)}</span>
                      <span className="text-muted-foreground">
                        /{billingCycle === 'monthly' ? t.month : t.year}
                      </span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(Math.round(price / 12))}{t.perMonth} • {t.billedAnnually}
                      </p>
                    )}

                    {/* Short Description */}
                    <p className="text-sm text-muted-foreground mt-3">
                      {getPlanDescription(plan.slug)}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 pb-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">{t.targeting}</div>
                        <div className="text-sm font-medium">{stats.targeting}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">{t.support}</div>
                        <div className="text-sm font-medium">{stats.support}</div>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3">
                      {features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className={`p-0.5 rounded-full bg-gradient-to-br ${gradientColor}`}>
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {language === 'el' ? feature.el : feature.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                    <Button
                      className={`w-full ${isMostPopular ? `bg-gradient-to-r ${gradientColor} hover:opacity-90` : ''}`}
                      variant={isCurrent ? "secondary" : isMostPopular ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleChoosePlan(plan.slug)}
                      disabled={loadingPlan !== null || isCurrent}
                    >
                      {loadingPlan === plan.slug ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.loading}
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {t.currentPlan}
                        </>
                      ) : (
                        <>
                          {t.choosePlan}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    {/* Learn More Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4 mr-2" />
                          {t.learnMore}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradientColor} text-white`}>
                              <PlanIcon className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-xl">{plan.name}</DialogTitle>
                          </div>
                        </DialogHeader>
                        
                        <div className="space-y-6 mt-4">
                          {/* Best For */}
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <Users className="w-4 h-4 text-primary" />
                              {t.bestFor}
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              {getPlanBestFor(plan.slug)}
                            </p>
                          </div>

                          {/* Event Boost Breakdown - Main Section */}
                          {(() => {
                            const boostDetails = getBoostBreakdown(plan.slug, billingCycle === 'monthly' ? plan.price_monthly_cents : Math.round(plan.price_annual_cents / 12));
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Zap className="w-4 h-4 text-primary" />
                                  {t.eventBoostBreakdown}
                                </div>
                                
                                {/* Visual Calculation */}
                                <div className={`p-4 rounded-xl bg-gradient-to-r ${gradientColor} text-white`}>
                                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                                    <span>{boostDetails.events} events</span>
                                    <span>×</span>
                                    <span>{formatPrice(boostDetails.budgetPerEvent)}</span>
                                    <span>=</span>
                                    <span className="text-xl">{formatPrice(boostDetails.totalBoostValue)}</span>
                                  </div>
                                  {boostDetails.valueBonus > 0 && (
                                    <div className="text-center mt-2 text-white/90 text-sm">
                                      🎁 {t.youSave} <span className="font-bold">{formatPrice(boostDetails.valueBonus)}</span> ({boostDetails.bonusPercentage}% {t.bonusValue})
                                    </div>
                                  )}
                                </div>

                                {/* Breakdown Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">{t.eventsPerMonth}</div>
                                    <div className="font-semibold text-lg">{boostDetails.events}</div>
                                  </div>
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">{t.budgetPerEvent}</div>
                                    <div className="font-semibold text-lg">{formatPrice(boostDetails.budgetPerEvent)}</div>
                                  </div>
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">{t.totalBoostValue}</div>
                                    <div className="font-semibold text-lg text-primary">{formatPrice(boostDetails.totalBoostValue)}</div>
                                  </div>
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground mb-1">{t.valueBonus}</div>
                                    <div className="font-semibold text-lg text-green-600">+{formatPrice(boostDetails.valueBonus)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Additional Benefits */}
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-3">
                              <Shield className="w-4 h-4 text-primary" />
                              {t.keyBenefits}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">{t.commissionFree}</div>
                                <div className="font-semibold">{plan.commission_free_offers_count} {language === 'el' ? 'προσφορές' : 'offers'}</div>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">{t.offerBoostQuality}</div>
                                <div className="font-semibold">{getOfferQualityLabel(getBoostBreakdown(plan.slug, plan.price_monthly_cents).offerQuality)}</div>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">{t.targeting}</div>
                                <div className="font-semibold">{stats.targeting}</div>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-1">{t.analytics}</div>
                                <div className="font-semibold">{stats.analytics}</div>
                              </div>
                            </div>
                          </div>

                          {/* All Features */}
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-3">
                              <Clock className="w-4 h-4 text-primary" />
                              {t.whatYouGet}
                            </div>
                            <ul className="space-y-2">
                              {features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-primary" />
                                  <span className="text-sm">
                                    {language === 'el' ? feature.el : feature.en}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Button
                            className={`w-full ${isMostPopular ? `bg-gradient-to-r ${gradientColor} hover:opacity-90` : ''}`}
                            variant={isCurrent ? "secondary" : "default"}
                            size="lg"
                            onClick={() => handleChoosePlan(plan.slug)}
                            disabled={loadingPlan !== null || isCurrent}
                          >
                            {isCurrent ? t.currentPlan : t.choosePlan}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
            <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t.enterprise}</h3>
                  <p className="text-sm text-muted-foreground">{t.enterpriseDesc}</p>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {t.customBudget}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {t.dedicatedManager}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {t.prioritySupport}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  {t.whiteLabel}
                </div>
              </div>
              
              <Button 
                variant="outline"
                size="lg"
                onClick={() => window.open('mailto:enterprise@example.com', '_blank')}
                className="shrink-0"
              >
                {t.contactUs}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
