import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap, TrendingUp, Crown, Building2 } from "lucide-react";
import { useState } from "react";

const PricingPublic = () => {
  const { language } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(false);

  const text = {
    el: {
      heroTitle: "Απλή, Διαφανής Τιμολόγηση",
      heroSubtitle:
        "Επίλεξε το πλάνο που ταιριάζει στην επιχείρησή σου. Χωρίς κρυφές χρεώσεις.",
      monthly: "Μηνιαία",
      annual: "Ετήσια",
      annualSave: "Εξοικονόμησε 2 μήνες",
      perMonth: "/μήνα",
      getStarted: "Ξεκίνα Τώρα",
      contactSales: "Επικοινωνία",
      mostPopular: "Πιο Δημοφιλές",
      enterprise: "Enterprise",
      enterpriseDesc: "Για μεγάλες επιχειρήσεις με εξειδικευμένες ανάγκες",
      faq: "Συχνές Ερωτήσεις",
      plans: [
        {
          name: "Free",
          price: 0,
          description: "Για επιχειρήσεις που ξεκινούν",
          icon: Building2,
          features: [
            "Δημιουργία εκδηλώσεων",
            "Βασικά στατιστικά",
            "Προσφορές με προμήθεια",
            "Pay-per-boost προώθηση",
          ],
        },
        {
          name: "Starter",
          price: 100,
          description: "Για αναπτυσσόμενες επιχειρήσεις",
          icon: Zap,
          features: [
            "Όλα τα Free +",
            "€120 boost budget/μήνα",
            "5 προσφορές χωρίς προμήθεια",
            "Βασική στόχευση κοινού",
            "Email υποστήριξη",
          ],
        },
        {
          name: "Growth",
          price: 200,
          popular: true,
          description: "Για επιχειρήσεις σε ανάπτυξη",
          icon: TrendingUp,
          features: [
            "Όλα τα Starter +",
            "€250 boost budget/μήνα",
            "10 προσφορές χωρίς προμήθεια",
            "Προηγμένη στόχευση κοινού",
            "Αναλυτικά demographics",
            "Priority υποστήριξη",
          ],
        },
        {
          name: "Professional",
          price: 400,
          description: "Για κορυφαίες επιχειρήσεις",
          icon: Crown,
          features: [
            "Όλα τα Growth +",
            "€800 boost budget/μήνα",
            "20 προσφορές χωρίς προμήθεια",
            "Premium στόχευση κοινού",
            "API access",
            "Dedicated account manager",
          ],
        },
      ],
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
      heroTitle: "Simple, Transparent Pricing",
      heroSubtitle:
        "Choose the plan that fits your business. No hidden fees.",
      monthly: "Monthly",
      annual: "Annual",
      annualSave: "Save 2 months",
      perMonth: "/month",
      getStarted: "Get Started",
      contactSales: "Contact Sales",
      mostPopular: "Most Popular",
      enterprise: "Enterprise",
      enterpriseDesc: "For large businesses with specialized needs",
      faq: "Frequently Asked Questions",
      plans: [
        {
          name: "Free",
          price: 0,
          description: "For businesses just starting",
          icon: Building2,
          features: [
            "Event creation",
            "Basic analytics",
            "Offers with commission",
            "Pay-per-boost promotion",
          ],
        },
        {
          name: "Starter",
          price: 100,
          description: "For growing businesses",
          icon: Zap,
          features: [
            "Everything in Free +",
            "€120 boost budget/month",
            "5 commission-free offers",
            "Basic audience targeting",
            "Email support",
          ],
        },
        {
          name: "Growth",
          price: 200,
          popular: true,
          description: "For scaling businesses",
          icon: TrendingUp,
          features: [
            "Everything in Starter +",
            "€250 boost budget/month",
            "10 commission-free offers",
            "Advanced audience targeting",
            "Detailed demographics",
            "Priority support",
          ],
        },
        {
          name: "Professional",
          price: 400,
          description: "For top businesses",
          icon: Crown,
          features: [
            "Everything in Growth +",
            "€800 boost budget/month",
            "20 commission-free offers",
            "Premium audience targeting",
            "API access",
            "Dedicated account manager",
          ],
        },
      ],
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

  const getAnnualPrice = (monthly: number) =>
    Math.round(monthly * 10); // 2 months free

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-urbanist text-4xl md:text-6xl font-bold mb-6"
          >
            {t.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            {t.heroSubtitle}
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span
              className={`font-medium ${
                !isAnnual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.monthly}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isAnnual ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  isAnnual ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`font-medium ${
                isAnnual ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.annual}
            </span>
            {isAnnual && (
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                {t.annualSave}
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {t.plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`relative bg-card rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    {t.mostPopular}
                  </div>
                )}
                <div className="mb-4">
                  <plan.icon className="w-10 h-10 text-primary mb-3" />
                  <h3 className="font-urbanist text-2xl font-bold">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    €{isAnnual ? getAnnualPrice(plan.price) : plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.price > 0
                      ? isAnnual
                        ? `/${language === "el" ? "έτος" : "year"}`
                        : t.perMonth
                      : ""}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup-business">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {t.getStarted}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 max-w-4xl mx-auto bg-gradient-to-r from-primary/10 to-accent/30 rounded-2xl p-8 text-center"
          >
            <h3 className="font-urbanist text-2xl font-bold mb-2">
              {t.enterprise}
            </h3>
            <p className="text-muted-foreground mb-6">{t.enterpriseDesc}</p>
            <Link to="/contact">
              <Button size="lg">{t.contactSales}</Button>
            </Link>
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
