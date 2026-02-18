import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  Rocket,
  Star,
  Zap,
  Crown,
  ArrowRight,
  Check,
  Calendar,
  Ticket,
  Gift,
  MapPin,
  Bell,
  Target,
  LineChart,
  Shield,
  Headphones,
  Mail,
  Building2,
  Sparkles,
  Percent,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

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

const ForBusinesses = () => {
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const t = {
    el: {
      hero: {
        badge: "Για επιχειρήσεις",
        title: "Ανέπτυξε την επιχείρησή σου με το ΦΟΜΟ",
        subtitle: "Η πλατφόρμα που φέρνει τους πελάτες σε εσένα. Δημιούργησε events, προσφορές και διαχειρίσου κρατήσεις σε ένα μέρος.",
        cta: "Ξεκίνα δωρεάν",
        demo: "Δες πώς λειτουργεί",
      },
      platform: {
        title: "Η πλατφόρμα που σε συνδέει με χιλιάδες χρήστες",
        description: "Το ΦΟΜΟ είναι η κορυφαία εφαρμογή για νυχτερινή ζωή, φαγητό και events στην Κύπρο. Χιλιάδες χρήστες ανακαλύπτουν καθημερινά νέες επιχειρήσεις μέσω της πλατφόρμας μας.",
        stats: [
          { value: "10K+", label: "Ενεργοί χρήστες" },
          { value: "500+", label: "Επιχειρήσεις" },
          { value: "50K+", label: "Κρατήσεις" },
        ],
      },
      features: {
        title: "Όλα τα εργαλεία που χρειάζεσαι",
        items: [
          {
            icon: Calendar,
            title: "Δημιουργία Events",
            description: "Δημιούργησε και προώθησε events με λίγα κλικ. Εισιτήρια, κρατήσεις, δωρεάν είσοδος.",
          },
          {
            icon: Gift,
            title: "Προσφορές & Εκπτώσεις",
            description: "Δημιούργησε αποκλειστικές προσφορές που εξαργυρώνονται με QR code.",
          },
          {
            icon: MapPin,
            title: "Προβολή στον Χάρτη",
            description: "Εμφανίσου στον διαδραστικό χάρτη και γίνε ορατός σε χρήστες κοντά σου.",
          },
          {
            icon: Ticket,
            title: "Πωλήσεις Εισιτηρίων",
            description: "Πούλα εισιτήρια online με ασφάλεια. Stripe integration για άμεσες πληρωμές.",
          },
          {
            icon: BarChart3,
            title: "Analytics & Insights",
            description: "Δες ποιος βλέπει την επιχείρησή σου, πότε και πώς αλληλεπιδρά.",
          },
          {
            icon: Rocket,
            title: "Boosts & Προώθηση",
            description: "Προώθησε events και προσφορές για μέγιστη ορατότητα στο feed.",
          },
        ],
      },
      analytics: {
        title: "Analytics που σε βοηθούν να αναπτυχθείς",
        description: "Κατανόησε το κοινό σου με λεπτομερή analytics. Δες τι λειτουργεί και βελτιστοποίησε τη στρατηγική σου.",
        items: [
          { icon: Users, text: "Δημογραφικά κοινού" },
          { icon: LineChart, text: "Τάσεις και μοτίβα" },
          { icon: Target, text: "Conversion tracking" },
          { icon: TrendingUp, text: "Απόδοση boosts" },
        ],
      },
      boosts: {
        title: "Boosts: Μέγιστη ορατότητα",
        description: "Τα boosts τοποθετούν τα events και τις προσφορές σου στην κορυφή του feed, εξασφαλίζοντας ότι θα τα δουν περισσότεροι χρήστες.",
        benefits: [
          "Εμφάνιση στην κορυφή του feed",
          "Μεγαλύτερο reach σε νέους χρήστες",
          "Περισσότερες κρατήσεις και πωλήσεις",
          "Λεπτομερή στατιστικά απόδοσης",
        ],
      },
      pricing: {
        title: "Επιλέξτε το πλάνο σας",
        monthly: "Μηνιαίο",
        annual: "Ετήσιο",
        saveMonths: "2 μήνες δωρεάν!",
        perMonth: "/μήνα",
        choosePlan: "Επιλογή",
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
      },
      enterprise: {
        title: "Enterprise",
        description: "Για μεγάλες επιχειρήσεις με ειδικές ανάγκες",
        contactUs: "Επικοινωνήστε μαζί μας:",
      },
      support: {
        title: "Υποστήριξη σε κάθε βήμα",
        items: [
          { icon: Headphones, title: "Dedicated Support", description: "Άμεση βοήθεια όποτε τη χρειάζεσαι" },
          { icon: Shield, title: "Ασφαλείς Πληρωμές", description: "Stripe για ασφαλείς συναλλαγές" },
          { icon: Bell, title: "Ειδοποιήσεις", description: "Ενημερώσεις σε πραγματικό χρόνο" },
        ],
      },
      cta: {
        title: "Έτοιμος να ξεκινήσεις;",
        subtitle: "Εγγράψου δωρεάν και ξεκίνα να αναπτύσσεις την επιχείρησή σου σήμερα.",
        button: "Δημιούργησε λογαριασμό επιχείρησης",
      },
    },
    en: {
      hero: {
        badge: "For businesses",
        title: "Grow your business with ΦΟΜΟ",
        subtitle: "The platform that brings customers to you. Create events, offers and manage reservations in one place.",
        cta: "Start for free",
        demo: "See how it works",
      },
      platform: {
        title: "The platform that connects you with thousands of users",
        description: "ΦΟΜΟ is the leading app for nightlife, food and events in Cyprus. Thousands of users discover new businesses every day through our platform.",
        stats: [
          { value: "10K+", label: "Active users" },
          { value: "500+", label: "Businesses" },
          { value: "50K+", label: "Reservations" },
        ],
      },
      features: {
        title: "All the tools you need",
        items: [
          {
            icon: Calendar,
            title: "Create Events",
            description: "Create and promote events with just a few clicks. Tickets, reservations, free entry.",
          },
          {
            icon: Gift,
            title: "Offers & Discounts",
            description: "Create exclusive offers that are redeemed with QR code.",
          },
          {
            icon: MapPin,
            title: "Map Visibility",
            description: "Appear on the interactive map and be visible to users near you.",
          },
          {
            icon: Ticket,
            title: "Ticket Sales",
            description: "Sell tickets online securely. Stripe integration for instant payments.",
          },
          {
            icon: BarChart3,
            title: "Analytics & Insights",
            description: "See who views your business, when and how they interact.",
          },
          {
            icon: Rocket,
            title: "Boosts & Promotion",
            description: "Promote events and offers for maximum visibility in the feed.",
          },
        ],
      },
      analytics: {
        title: "Analytics that help you grow",
        description: "Understand your audience with detailed analytics. See what works and optimize your strategy.",
        items: [
          { icon: Users, text: "Audience demographics" },
          { icon: LineChart, text: "Trends and patterns" },
          { icon: Target, text: "Conversion tracking" },
          { icon: TrendingUp, text: "Boost performance" },
        ],
      },
      boosts: {
        title: "Boosts: Maximum visibility",
        description: "Boosts place your events and offers at the top of the feed, ensuring more users will see them.",
        benefits: [
          "Appear at the top of the feed",
          "Greater reach to new users",
          "More reservations and sales",
          "Detailed performance statistics",
        ],
      },
      pricing: {
        title: "Choose Your Plan",
        monthly: "Monthly",
        annual: "Annual",
        saveMonths: "2 months free!",
        perMonth: "/month",
        choosePlan: "Get Started",
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
      },
      enterprise: {
        title: "Enterprise",
        description: "For large businesses with special needs",
        contactUs: "Contact us:",
      },
      support: {
        title: "Support at every step",
        items: [
          { icon: Headphones, title: "Dedicated Support", description: "Immediate help when you need it" },
          { icon: Shield, title: "Secure Payments", description: "Stripe for secure transactions" },
          { icon: Bell, title: "Notifications", description: "Real-time updates" },
        ],
      },
      cta: {
        title: "Ready to get started?",
        subtitle: "Sign up for free and start growing your business today.",
        button: "Create business account",
      },
    },
  };

  const content = t[language];

  // Helper functions for features
  const getBasicFeatures = () => [
    { icon: Gift, text: content.pricing.basicAllFree },
    { icon: TrendingUp, text: content.pricing.basicMarketplace, note: content.pricing.basicMarketplaceNote },
    { icon: MapPin, text: content.pricing.basicMapPresence },
    { icon: BarChart3, text: content.pricing.basicAnalytics, note: content.pricing.basicAnalyticsNote },
    { icon: Target, text: content.pricing.basicAudience },
    { icon: Percent, text: content.pricing.basicCommission },
    { icon: Rocket, text: content.pricing.basicBoostCredits },
    { icon: null, text: content.pricing.basicSupport },
  ];

  const getProFeatures = () => [
    { icon: Gift, text: content.pricing.proAllBasic },
    { icon: TrendingUp, text: content.pricing.proMarketplace, note: content.pricing.proMarketplaceNote },
    { icon: MapPin, text: content.pricing.proMapPresence },
    { icon: BarChart3, text: content.pricing.proBoostAnalytics },
    { icon: Lightbulb, text: content.pricing.proBoostCompare },
    { icon: Target, text: content.pricing.proAudienceTargeting },
    { icon: Percent, text: content.pricing.proCommission },
    { icon: Rocket, text: content.pricing.proBoostCredits },
    { icon: null, text: content.pricing.proSupport },
  ];

  const getEliteFeatures = () => [
    { icon: Gift, text: content.pricing.eliteAllPro },
    { icon: Crown, text: content.pricing.eliteMarketplace },
    { icon: MapPin, text: content.pricing.eliteMapPresence },
    { icon: BarChart3, text: content.pricing.eliteFullAnalytics },
    { icon: Lightbulb, text: content.pricing.eliteGuidance },
    { icon: Calendar, text: content.pricing.eliteBestTimes },
    { icon: TrendingUp, text: content.pricing.eliteGrowthPlan },
    { icon: Percent, text: content.pricing.eliteCommission },
    { icon: Rocket, text: content.pricing.eliteBoostCredits },
    { icon: null, text: content.pricing.eliteSupport },
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-seafoam/5 to-background">
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-seafoam/10 text-seafoam px-4 py-2 rounded-full mb-6 border border-seafoam/20">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">{content.hero.badge}</span>
            </div>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-seafoam via-aegean to-seafoam bg-clip-text text-transparent mb-6 tracking-tight">
              {content.hero.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg bg-seafoam hover:bg-seafoam/90 text-white">
                <Link to="/signup-business">{content.hero.cta}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg border-aegean/30 text-aegean hover:bg-aegean/5">
                <Link to="/features">{content.hero.demo}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Section - No Stats */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-seafoam mb-4">
              {content.platform.title}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {content.platform.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {content.features.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.features.items.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
                {content.analytics.title}
              </h2>
              <p className="text-muted-foreground mb-8">
                {content.analytics.description}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {content.analytics.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-foreground text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl p-8 aspect-square flex items-center justify-center">
                <BarChart3 className="w-32 h-32 text-accent/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Boosts Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 hidden md:block">
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 aspect-square flex items-center justify-center">
                <Rocket className="w-32 h-32 text-primary/50" />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
                {content.boosts.title}
              </h2>
              <p className="text-muted-foreground mb-8">
                {content.boosts.description}
              </p>
              <ul className="space-y-3">
                {content.boosts.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Matching In-App Design */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          {/* Free Plan - Compact Horizontal Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="px-4 py-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {/* Free Plan Title */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">{content.pricing.freeTitle}</span>
                </div>
                
                {/* Separator */}
                <div className="hidden sm:block h-4 w-px bg-border" />
                
                {/* Features - All inline with consistent styling */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeBusinessProfile}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeEventCreation}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeOfferCreation}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeMarketplace}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeMapPresence}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {content.pricing.freeAnalytics}
                  </span>
                </div>
                
                {/* Separator */}
                <div className="hidden lg:block h-4 w-px bg-border" />
                
                {/* Stats - compact pills */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Commission: {content.pricing.freeCommission}</span>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Boost: {content.pricing.freeBoostCredits}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Title & Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center gap-4 mb-6 lg:flex-row lg:justify-between"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{content.pricing.title}</h2>
            
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
                {content.pricing.monthly}
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {content.pricing.annual}
                <Badge className="bg-gradient-to-r from-primary to-sunset-coral text-white border-0 text-[10px] sm:text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {content.pricing.saveMonths}
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
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
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
                            {content.pricing.mostPopular}
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
                        <span className="text-xs sm:text-sm text-muted-foreground">{content.pricing.perMonth}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {language === 'el' ? 'χρέωση ετησίως' : 'billed annually'}
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
                        <Link to="/signup-business">{content.pricing.choosePlan}</Link>
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
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border border-border/50">
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">{content.enterprise.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{content.enterprise.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm text-muted-foreground">{content.enterprise.contactUs}</span>
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

      {/* Support Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {content.support.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.support.items.map((item, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              {content.cta.title}
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground mb-6 sm:mb-8">
              {content.cta.subtitle}
            </p>
            <Button
              asChild
              size="lg"
              className="text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 gap-2 w-full sm:w-auto whitespace-normal sm:whitespace-nowrap h-auto py-2.5 sm:py-3 leading-tight"
            >
              <Link to="/signup-business" className="text-center">
                {content.cta.button}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ForBusinesses;
