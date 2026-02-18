import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ticket, 
  Heart, 
  Bell, 
  Sparkles,
  ArrowRight,
  Users,
  Clock,
  Star,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

const ForVisitors = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      hero: {
        title: "Ανακάλυψε τι συμβαίνει γύρω σου",
        subtitle: "Το ΦΟΜΟ είναι ο απόλυτος οδηγός σου για νυχτερινή ζωή, φαγητό και αποκλειστικά events στην Κύπρο.",
        cta: "Ξεκίνα τώρα",
        exploreCta: "Εξερεύνησε πρώτα",
      },
      features: {
        title: "Τι μπορείς να κάνεις με το ΦΟΜΟ",
        items: [
          {
            icon: Calendar,
            title: "Εκδηλώσεις",
            description: "Βρες τα καλύτερα events, parties και συναυλίες κοντά σου.",
          },
          {
            icon: Gift,
            title: "Αποκλειστικές Προσφορές",
            description: "Εξαργύρωσε μοναδικές εκπτώσεις σε εστιατόρια, bars και clubs.",
          },
          {
            icon: MapPin,
            title: "Διαδραστικός Χάρτης",
            description: "Δες τι συμβαίνει γύρω σου σε πραγματικό χρόνο.",
          },
          {
            icon: Ticket,
            title: "Εύκολη Κράτηση",
            description: "Αγόρασε εισιτήρια και κάνε κρατήσεις με ένα tap.",
          },
          {
            icon: Heart,
            title: "Αγαπημένα",
            description: "Αποθήκευσε ό,τι σε ενδιαφέρει για να μην το χάσεις.",
          },
          {
            icon: Bell,
            title: "Ειδοποιήσεις",
            description: "Μάθε πρώτος για νέα events και προσφορές.",
          },
        ],
      },
      howItWorks: {
        title: "Πώς λειτουργεί",
        steps: [
          {
            step: "1",
            title: "Δημιούργησε λογαριασμό",
            description: "Εγγράψου δωρεάν σε λιγότερο από 1 λεπτό.",
          },
          {
            step: "2",
            title: "Εξερεύνησε",
            description: "Ανακάλυψε events, προσφορές και επιχειρήσεις.",
          },
          {
            step: "3",
            title: "Ζήσε το",
            description: "Κάνε κρατήσεις, αγόρασε εισιτήρια και εξαργύρωσε προσφορές.",
          },
        ],
      },
      guestMode: {
        title: "Θέλεις να δεις πρώτα;",
        description: "Μπορείς να εξερευνήσεις το ΦΟΜΟ χωρίς λογαριασμό. Βέβαια, για κρατήσεις, εισιτήρια και εξαργυρώσεις χρειάζεσαι εγγραφή.",
        cta: "Εξερεύνηση ως επισκέπτης",
      },
      unlock: {
        title: "Τι ξεκλειδώνεις με εγγραφή",
        items: [
          "Αγορά εισιτηρίων για events",
          "Κρατήσεις σε εστιατόρια και bars",
          "Εξαργύρωση προσφορών με QR code",
          "Αποθήκευση αγαπημένων",
          "Push ειδοποιήσεις για νέα events",
          "Φοιτητικές εκπτώσεις (αν είσαι φοιτητής)",
        ],
      },
      cta: {
        title: "Έτοιμος να ανακαλύψεις;",
        subtitle: "Κατέβασε το ΦΟΜΟ και ζήσε κάθε στιγμή.",
        button: "Εγγράψου δωρεάν",
      },
    },
    en: {
      hero: {
        title: "Discover what's happening around you",
        subtitle: "ΦΟΜΟ is your ultimate guide to nightlife, food, and exclusive events in Cyprus.",
        cta: "Get started",
        exploreCta: "Explore first",
      },
      features: {
        title: "What you can do with ΦΟΜΟ",
        items: [
          {
            icon: Calendar,
            title: "Events",
            description: "Find the best events, parties and concerts near you.",
          },
          {
            icon: Gift,
            title: "Exclusive Offers",
            description: "Redeem unique discounts at restaurants, bars and clubs.",
          },
          {
            icon: MapPin,
            title: "Interactive Map",
            description: "See what's happening around you in real time.",
          },
          {
            icon: Ticket,
            title: "Easy Booking",
            description: "Buy tickets and make reservations with one tap.",
          },
          {
            icon: Heart,
            title: "Favorites",
            description: "Save what interests you so you don't miss it.",
          },
          {
            icon: Bell,
            title: "Notifications",
            description: "Be the first to know about new events and offers.",
          },
        ],
      },
      howItWorks: {
        title: "How it works",
        steps: [
          {
            step: "1",
            title: "Create an account",
            description: "Sign up for free in less than 1 minute.",
          },
          {
            step: "2",
            title: "Explore",
            description: "Discover events, offers and businesses.",
          },
          {
            step: "3",
            title: "Live it",
            description: "Make reservations, buy tickets and redeem offers.",
          },
        ],
      },
      guestMode: {
        title: "Want to see first?",
        description: "You can explore ΦΟΜΟ without an account. However, for reservations, tickets and redemptions you need to sign up.",
        cta: "Explore as guest",
      },
      unlock: {
        title: "What you unlock with registration",
        items: [
          "Buy tickets for events",
          "Reservations at restaurants and bars",
          "Redeem offers with QR code",
          "Save favorites",
          "Push notifications for new events",
          "Student discounts (if you're a student)",
        ],
      },
      cta: {
        title: "Ready to discover?",
        subtitle: "Download ΦΟΜΟ and live every moment.",
        button: "Sign up for free",
      },
    },
  };

  const content = t[language];

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
            <div className="inline-flex items-center gap-1.5 bg-seafoam text-white px-2.5 py-1 sm:px-4 sm:py-2 rounded-full mb-6 text-[11px] sm:text-sm font-medium">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>
                {language === "el" ? "Για επισκέπτες" : "For visitors"}
              </span>
            </div>
            <h1 className="font-cinzel text-[clamp(1.25rem,5vw,3rem)] font-bold text-seafoam mb-6 tracking-tight">
              {content.hero.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className="text-sm sm:text-lg bg-seafoam hover:bg-seafoam/90 text-white px-4 sm:px-6">
                <Link to="/signup">{content.hero.cta}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-sm sm:text-lg border-aegean/30 text-aegean hover:bg-aegean/5 px-4 sm:px-6">
                <Link to="/feed">{content.hero.exploreCta}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-center text-seafoam mb-12">
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

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {content.howItWorks.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.howItWorks.steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* What You Unlock */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {content.unlock.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.unlock.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 bg-background rounded-lg p-4 border border-border/50"
              >
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-accent" />
                </div>
                <span className="text-foreground text-sm">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
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
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8">
              {content.cta.subtitle}
            </p>
            <Button asChild size="lg" className="text-base sm:text-lg px-6 sm:px-8">
              <Link to="/signup">{content.cta.button}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ForVisitors;
