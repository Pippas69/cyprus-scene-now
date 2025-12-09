import { useLanguage } from "@/hooks/useLanguage";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  QrCode,
  BarChart3,
  Zap,
  MapPin,
  Heart,
  Users,
  Bell,
  Smartphone,
  Shield,
  Globe,
  TrendingUp,
} from "lucide-react";

const Features = () => {
  const { language } = useLanguage();

  const text = {
    el: {
      heroTitle: "Όλα όσα χρειάζεσαι για να διαχειριστείς εκδηλώσεις",
      heroSubtitle:
        "Από τη δημιουργία μέχρι την ανάλυση, το ΦΟΜΟ σου δίνει όλα τα εργαλεία.",
      forBusiness: "Για Επιχειρήσεις",
      forUsers: "Για Χρήστες",
      getStarted: "Ξεκίνα Δωρεάν",
      contactUs: "Επικοινώνησε μαζί μας",
      businessFeatures: [
        {
          icon: Calendar,
          title: "Δημιουργία Εκδηλώσεων",
          description:
            "Δημιούργησε και διαχειρίσου εκδηλώσεις με πλήρη έλεγχο πάνω σε κρατήσεις, τιμολόγηση και προβολή.",
        },
        {
          icon: QrCode,
          title: "QR Code Προσφορές",
          description:
            "Δημιούργησε μοναδικά QR codes για εκπτώσεις με παρακολούθηση χρήσης σε πραγματικό χρόνο.",
        },
        {
          icon: BarChart3,
          title: "Αναλυτικά Στατιστικά",
          description:
            "Παρακολούθησε προβολές, RSVPs, κρατήσεις και την απόδοση κάθε εκδήλωσης.",
        },
        {
          icon: Zap,
          title: "Boost Προώθηση",
          description:
            "Ενίσχυσε τη προβολή των εκδηλώσεων σου με στοχευμένη προώθηση στο κοινό που σε ενδιαφέρει.",
        },
        {
          icon: Users,
          title: "Διαχείριση Κρατήσεων",
          description:
            "Δέχου και διαχειρίσου κρατήσεις με αυτόματες ειδοποιήσεις και QR codes επιβεβαίωσης.",
        },
        {
          icon: Shield,
          title: "Επαληθευμένο Προφίλ",
          description:
            "Απόκτησε το badge επαλήθευσης για να αυξήσεις την εμπιστοσύνη των πελατών σου.",
        },
      ],
      userFeatures: [
        {
          icon: MapPin,
          title: "Ανακάλυψε Εκδηλώσεις",
          description:
            "Βρες τι συμβαίνει γύρω σου με τον διαδραστικό χάρτη και τα έξυπνα φίλτρα.",
        },
        {
          icon: Heart,
          title: "Αποθήκευσε Αγαπημένα",
          description:
            "Κράτα τις αγαπημένες σου εκδηλώσεις και λάβε υπενθυμίσεις.",
        },
        {
          icon: Bell,
          title: "Ειδοποιήσεις",
          description:
            "Μάθε πρώτος για νέες εκδηλώσεις και αποκλειστικές προσφορές.",
        },
        {
          icon: QrCode,
          title: "Αποκλειστικές Εκπτώσεις",
          description:
            "Σκάναρε QR codes για να ξεκλειδώσεις μοναδικές προσφορές.",
        },
        {
          icon: Smartphone,
          title: "Mobile-First Εμπειρία",
          description:
            "Απόλαυσε μια γρήγορη και εύχρηστη εφαρμογή σχεδιασμένη για κινητά.",
        },
        {
          icon: Globe,
          title: "Δίγλωσση Υποστήριξη",
          description: "Χρησιμοποίησε την εφαρμογή στα Ελληνικά ή στα Αγγλικά.",
        },
      ],
      whyFomo: "Γιατί ΦΟΜΟ;",
      whyFeatures: [
        {
          title: "Τοπική Εστίαση",
          description: "Σχεδιασμένο αποκλειστικά για την Κύπρο.",
        },
        {
          title: "Απλή Τιμολόγηση",
          description: "Χωρίς κρυφές χρεώσεις, πλήρης διαφάνεια.",
        },
        {
          title: "24/7 Υποστήριξη",
          description: "Είμαστε εδώ για να σε βοηθήσουμε.",
        },
      ],
    },
    en: {
      heroTitle: "Everything you need to manage events",
      heroSubtitle:
        "From creation to analytics, ΦΟΜΟ gives you all the tools.",
      forBusiness: "For Businesses",
      forUsers: "For Users",
      getStarted: "Get Started Free",
      contactUs: "Contact Us",
      businessFeatures: [
        {
          icon: Calendar,
          title: "Event Creation",
          description:
            "Create and manage events with full control over reservations, pricing, and visibility.",
        },
        {
          icon: QrCode,
          title: "QR Code Offers",
          description:
            "Create unique QR codes for discounts with real-time usage tracking.",
        },
        {
          icon: BarChart3,
          title: "Detailed Analytics",
          description:
            "Track views, RSVPs, reservations, and the performance of each event.",
        },
        {
          icon: Zap,
          title: "Boost Promotion",
          description:
            "Enhance your event visibility with targeted promotion to your ideal audience.",
        },
        {
          icon: Users,
          title: "Reservation Management",
          description:
            "Accept and manage reservations with automatic notifications and confirmation QR codes.",
        },
        {
          icon: Shield,
          title: "Verified Profile",
          description:
            "Get the verification badge to increase customer trust.",
        },
      ],
      userFeatures: [
        {
          icon: MapPin,
          title: "Discover Events",
          description:
            "Find what's happening around you with the interactive map and smart filters.",
        },
        {
          icon: Heart,
          title: "Save Favorites",
          description:
            "Keep your favorite events and receive reminders.",
        },
        {
          icon: Bell,
          title: "Notifications",
          description:
            "Be the first to know about new events and exclusive offers.",
        },
        {
          icon: QrCode,
          title: "Exclusive Discounts",
          description: "Scan QR codes to unlock unique offers.",
        },
        {
          icon: Smartphone,
          title: "Mobile-First Experience",
          description:
            "Enjoy a fast and user-friendly app designed for mobile.",
        },
        {
          icon: Globe,
          title: "Bilingual Support",
          description: "Use the app in Greek or English.",
        },
      ],
      whyFomo: "Why ΦΟΜΟ?",
      whyFeatures: [
        {
          title: "Local Focus",
          description: "Designed exclusively for Cyprus.",
        },
        {
          title: "Simple Pricing",
          description: "No hidden fees, full transparency.",
        },
        {
          title: "24/7 Support",
          description: "We're here to help you.",
        },
      ],
    },
  };

  const t = text[language];

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/signup-business">
              <Button size="lg" className="text-lg px-8">
                {t.getStarted}
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8">
                {t.contactUs}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Business Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-urbanist text-3xl md:text-4xl font-bold text-center mb-12">
            {t.forBusiness}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.businessFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-2xl border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-urbanist text-3xl md:text-4xl font-bold text-center mb-12">
            {t.forUsers}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.userFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-2xl border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-accent/50 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why FOMO */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-urbanist text-3xl md:text-4xl font-bold mb-12">
            {t.whyFomo}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {t.whyFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <TrendingUp className="w-8 h-8 mx-auto mb-4 opacity-80" />
                <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-primary-foreground/80">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-urbanist text-3xl md:text-4xl font-bold mb-6">
            {language === "el"
              ? "Έτοιμος να ξεκινήσεις;"
              : "Ready to get started?"}
          </h2>
          <Link to="/signup-business">
            <Button size="lg" className="text-lg px-8">
              {t.getStarted}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
