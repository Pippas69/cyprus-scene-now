import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Check, Zap, Star, Crown, Building2, Sparkles, Mail, Gift, TrendingUp,
  MapPin, BarChart3, Target, Percent, Rocket, Lightbulb, Calendar
} from "lucide-react";
import { useState } from "react";

// Plan configuration matching SubscriptionPlans.tsx
const PLAN_CONFIG = {
  basic: {
    icon: Zap,
    gradient: 'from-blue-500 to-cyan-500',
    monthlyPrice: 5999,
  },
  pro: {
    icon: Star,
    gradient: 'from-primary to-sunset-coral',
    monthlyPrice: 11999,
  },
  elite: {
    icon: Crown,
    gradient: 'from-purple-500 to-pink-500',
    monthlyPrice: 23999,
  },
};

const PricingPublic = () => {
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const text = {
    el: {
      heroTitle: "Επιλέξτε το πλάνο σας",
      monthly: "Μηνιαίο",
      annual: "Ετήσιο",
      saveMonths: "2 μήνες δωρεάν!",
      perMonth: "/μήνα",
      billedAnnually: "χρέωση ετησίως",
      choosePlan: "Επιλογή",
      mostPopular: "Δημοφιλέστερη",
      enterprise: "Enterprise",
      enterpriseDesc: "Για μεγάλες επιχειρήσεις με ειδικές ανάγκες",
      contactUs: "Επικοινωνήστε μαζί μας:",
      faq: "Συχνές Ερωτήσεις",
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
      faqs: [
        {
          q: "Τι είναι το boost budget;",
          a: "Το boost budget είναι το ποσό που μπορείς να χρησιμοποιήσεις κάθε μήνα για να προωθήσεις τις εκδηλώσεις σου σε στοχευμένο κοινό.",
        },
        {
          q: "Πώς λειτουργεί η προμήθεια στις προσφορές;",
          a: "Όταν ένας χρήστης χρησιμοποιήσει μια προσφορά σου, χρεώνεται ένα μικρό ποσοστό προμήθειας. Τα πλάνα περιλαμβάνουν δωρεάν προσφορές κάθε μήνα.",
        },
        {
          q: "Μπορώ να αλλάξω πλάνο;",
          a: "Ναι! Μπορείς να αναβαθμίσεις ή υποβαθμίσεις το πλάνο σου ανά πάσα στιγμή.",
        },
        {
          q: "Υπάρχει δέσμευση;",
          a: "Όχι, μπορείς να ακυρώσεις ανά πάσα στιγμή. Τα ετήσια πλάνα προπληρώνονται.",
        },
      ],
    },
    en: {
      heroTitle: "Choose Your Plan",
      monthly: "Monthly",
      annual: "Annual",
      saveMonths: "2 months free!",
      perMonth: "/month",
      billedAnnually: "billed annually",
      choosePlan: "Get Started",
      mostPopular: "Most Popular",
      enterprise: "Enterprise",
      enterpriseDesc: "For large businesses with special needs",
      contactUs: "Contact us:",
      faq: "Frequently Asked Questions",
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
      faqs: [
        {
          q: "What is boost budget?",
          a: "Boost budget is the amount you can use each month to promote your events to a targeted audience.",
        },
        {
          q: "How does the commission on offers work?",
          a: "When a user redeems your offer, a small commission percentage is charged. Plans include free offers each month.",
        },
        {
          q: "Can I change plans?",
          a: "Yes! You can upgrade or downgrade your plan at any time.",
        },
        {
          q: "Is there a commitment?",
          a: "No, you can cancel at any time. Annual plans are prepaid.",
        },
      ],
    },
  };

  const t = text[language];

  // Helper functions for features
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

  const renderFeatureItem = (feature: { icon: any; text: string; note?: string }, gradient: string, index: number) => (
    <li key={index} className="flex items-start gap-2.5">
      <div className={`p-0.5 rounded-full bg-gradient-to-br ${gradient} mt-0.5 shrink-0`}>
        <Check className="w-3 h-3 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm text-foreground/90">{feature.text}</span>
        {feature.note && (
          <span className="text-[10px] sm:text-xs text-muted-foreground">{feature.note}</span>
        )}
      </div>
    </li>
  );

  const plans = ['basic', 'pro', 'elite'] as const;

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* Pricing Section - Matching In-App Design */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
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
                <div className="hidden lg:block h-4 w-px bg-border" />
                
                {/* Stats - compact pills */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Commission: {t.freeCommission}</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Boost: {t.freeBoostCredits}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Title & Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center gap-4 mb-6 lg:flex-row lg:justify-between"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t.heroTitle}</h2>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 p-1.5 bg-muted rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.annual}
                <Badge className="bg-gradient-to-r from-primary to-sunset-coral text-white border-0 text-[10px] sm:text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t.saveMonths}
                </Badge>
              </button>
            </div>
          </motion.div>

          {/* Plans Grid - Single column on mobile/tablet, 3 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 mb-8">
            {plans.map((planSlug, index) => {
              const config = PLAN_CONFIG[planSlug];
              const price = billingCycle === 'monthly' 
                ? config.monthlyPrice 
                : Math.round(config.monthlyPrice * 10 / 12); // Annual: 10 months price / 12
              const isMostPopular = planSlug === 'pro';
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
                      isMostPopular ? 'shadow-lg border-primary/30' : ''
                    }`}
                  >
                    {/* Gradient Top Border & Most Popular Badge for Pro */}
                    {isMostPopular && (
                      <>
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} rounded-t-lg`} />
                        <div className="absolute -top-3 left-4">
                          <Badge className={`bg-gradient-to-r ${config.gradient} text-white border-0 shadow-md px-2 sm:px-3 py-1 text-[10px] sm:text-xs`}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {t.mostPopular}
                          </Badge>
                        </div>
                      </>
                    )}
                    
                    <CardHeader className="pb-3">
                      {/* Plan Icon & Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} text-white`}>
                          <PlanIconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold uppercase">{planSlug}</h3>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold">{formatPrice(price)}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">{t.perMonth}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {t.billedAnnually}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 pb-4">
                      {/* Features List */}
                      <ul className="space-y-2 sm:space-y-2.5">
                        {features.map((feature, idx) => 
                          renderFeatureItem(feature, config.gradient, idx)
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4 border-t">
                      <Button
                        asChild
                        className={`w-full ${isMostPopular ? `bg-gradient-to-r ${config.gradient} hover:opacity-90` : ''}`}
                        variant={isMostPopular ? "default" : "outline"}
                        size="lg"
                      >
                        <Link to="/signup-business">{t.choosePlan}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Enterprise Section - Horizontal (matching in-app design) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border border-border/50">
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">{t.enterprise}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t.enterpriseDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm text-muted-foreground">{t.contactUs}</span>
                  <a 
                    href="mailto:support@fomocy.com"
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-foreground text-background font-medium text-xs sm:text-sm hover:opacity-90 transition-opacity"
                  >
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    support@fomocy.com
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-urbanist text-3xl font-bold text-center mb-12">
            {t.faq}
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {t.faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl border border-border"
              >
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPublic;