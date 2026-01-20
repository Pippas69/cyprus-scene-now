import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

const ForBusinesses = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      hero: {
        badge: "Για επιχειρήσεις",
        title: "Ανάπτυξε την επιχείρησή σου με το ΦΟΜΟ",
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
        title: "Διάλεξε το πλάνο που σου ταιριάζει",
        subtitle: "Ξεκίνα δωρεάν και αναβάθμισε όποτε θέλεις",
        monthly: "μηνιαία",
        annually: "ετήσια",
        perMonth: "/ μήνα",
        plans: {
          free: {
            name: "Free",
            price: "€0",
            description: "Ξεκίνα δωρεάν και δες πώς λειτουργεί",
            features: [
              "Βασικό προφίλ επιχείρησης",
              "Δημιουργία εκδηλώσεων και προσφορών",
              "Βασικά analytics",
              "Εμφάνιση στον χάρτη",
              "12% προμήθεια εισιτηρίων",
            ],
          },
          basic: {
            name: "Basic",
            price: "€59.99",
            description: "Για επιχειρήσεις που ξεκινούν",
            features: [
              "Όλα τα Free +",
              "Βελτιωμένη ορατότητα",
              "Standard παρουσία στον χάρτη",
              "Performance Analytics",
              "10% προμήθεια εισιτηρίων",
              "€50 boost credits/μήνα",
              "Βασική υποστήριξη",
            ],
          },
          pro: {
            name: "Pro",
            price: "€119.99",
            popular: true,
            description: "Η δημοφιλέστερη επιλογή",
            features: [
              "Όλα τα Basic +",
              "Αυξημένη ορατότητα",
              "Enhanced παρουσία στον χάρτη",
              "Boost Value Analytics",
              "Σύγκριση boosted vs non-boosted",
              "8% προμήθεια εισιτηρίων",
              "€150 boost credits/μήνα",
              "Pro υποστήριξη",
            ],
          },
          elite: {
            name: "Elite",
            price: "€239.99",
            description: "Για μέγιστη ανάπτυξη",
            features: [
              "Όλα τα Pro +",
              "Μέγιστη προτεραιότητα (παγκύπρια)",
              "Κυρίαρχη παρουσία στον χάρτη",
              "Πλήρης πρόσβαση analytics",
              "Guidance & Στρατηγικές προτάσεις",
              "6% προμήθεια εισιτηρίων",
              "€300 boost credits/μήνα",
              "Elite υποστήριξη",
            ],
          },
        },
        cta: "Ξεκίνα τώρα",
      },
      enterprise: {
        title: "Enterprise",
        description: "Για μεγάλες επιχειρήσεις με ειδικές ανάγκες. Προσαρμοσμένα πλάνα, dedicated υποστήριξη και custom integrations.",
        cta: "Επικοινωνήστε μαζί μας",
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
        title: "Choose the plan that fits you",
        subtitle: "Start free and upgrade whenever you want",
        monthly: "monthly",
        annually: "annually",
        perMonth: "/ month",
        plans: {
          free: {
            name: "Free",
            price: "€0",
            description: "Start free and see how it works",
            features: [
              "Basic business profile",
              "Create events and offers",
              "Basic analytics",
              "Map visibility",
              "12% ticket commission",
            ],
          },
          basic: {
            name: "Basic",
            price: "€59.99",
            description: "For businesses just starting",
            features: [
              "All Free +",
              "Improved visibility",
              "Standard map presence",
              "Performance Analytics",
              "10% ticket commission",
              "€50 boost credits/month",
              "Basic support",
            ],
          },
          pro: {
            name: "Pro",
            price: "€119.99",
            popular: true,
            description: "The most popular choice",
            features: [
              "All Basic +",
              "Increased visibility",
              "Enhanced map presence",
              "Boost Value Analytics",
              "Boosted vs non-boosted comparison",
              "8% ticket commission",
              "€150 boost credits/month",
              "Pro support",
            ],
          },
          elite: {
            name: "Elite",
            price: "€239.99",
            description: "For maximum growth",
            features: [
              "All Pro +",
              "Maximum priority (Cyprus-wide)",
              "Dominant map presence",
              "Full analytics access",
              "Guidance & Strategic proposals",
              "6% ticket commission",
              "€300 boost credits/month",
              "Elite support",
            ],
          },
        },
        cta: "Get started",
      },
      enterprise: {
        title: "Enterprise",
        description: "For large businesses with special needs. Custom plans, dedicated support and custom integrations.",
        cta: "Contact us",
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

  const planIcons = {
    free: null,
    basic: Zap,
    pro: Star,
    elite: Crown,
  };

  const planColors = {
    free: "border-border",
    basic: "border-blue-500/50 bg-blue-500/5",
    pro: "border-primary/50 bg-primary/5",
    elite: "border-purple-500/50 bg-purple-500/5",
  };

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
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
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
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
            <div className="relative">
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
            <div className="order-2 md:order-1">
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

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
              {content.pricing.title}
            </h2>
            <p className="text-muted-foreground">
              {content.pricing.subtitle}
            </p>
          </div>

          {/* Free Plan - Horizontal */}
          <Card className="mb-8 border-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-poppins font-bold text-xl text-foreground mb-1">
                    {content.pricing.plans.free.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {content.pricing.plans.free.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.pricing.plans.free.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                <Button asChild variant="outline">
                  <Link to="/signup-business">{content.pricing.cta}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Paid Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {["basic", "pro", "elite"].map((planKey) => {
              const plan = content.pricing.plans[planKey as keyof typeof content.pricing.plans];
              const Icon = planIcons[planKey as keyof typeof planIcons];
              const colorClass = planColors[planKey as keyof typeof planColors];
              
              return (
                <motion.div
                  key={planKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  viewport={{ once: true }}
                >
                  <Card className={`h-full relative ${colorClass}`}>
                    {"popular" in plan && plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        {language === "el" ? "Δημοφιλέστερη" : "Most Popular"}
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        {Icon && <Icon className="w-5 h-5 text-accent" />}
                        <CardTitle className="font-poppins">{plan.name}</CardTitle>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{content.pricing.perMonth}</span>
                      </div>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button asChild className="w-full" variant={"popular" in plan && plan.popular ? "default" : "outline"}>
                        <Link to="/signup-business">{content.pricing.cta}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Enterprise */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h3 className="font-cinzel text-2xl font-bold mb-2">
                    {content.enterprise.title}
                  </h3>
                  <p className="text-primary-foreground/80 max-w-xl">
                    {content.enterprise.description}
                  </p>
                </div>
                <Button asChild variant="secondary" size="lg" className="gap-2">
                  <a href="mailto:hello@fomo.cy">
                    <Mail className="w-4 h-4" />
                    {content.enterprise.cta}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
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
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
              {content.cta.title}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {content.cta.subtitle}
            </p>
            <Button
              asChild
              size="lg"
              className="text-lg px-6 md:px-8 gap-2 w-full sm:w-auto whitespace-normal sm:whitespace-nowrap h-auto py-3 leading-tight"
            >
              <Link to="/signup-business" className="text-center">
                {content.cta.button}
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
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
