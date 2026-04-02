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
  Gift,
  MessageCircle,
  GraduationCap,
  Search,
  QrCode,
  Share2,
  Smartphone,
  Compass,
  Utensils,
  Music,
  PartyPopper
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
        title: "Όλα όσα μπορείς να κάνεις",
        items: [
          {
            icon: Compass,
            title: "Εξερεύνηση Venues & Events",
            description: "Ανακάλυψε εστιατόρια, bars, clubs και events κοντά σου. Φιλτράρισε ανά κατηγορία, τοποθεσία ή ημερομηνία.",
          },
          {
            icon: MapPin,
            title: "Διαδραστικός Χάρτης",
            description: "Δες σε πραγματικό χρόνο τι συμβαίνει γύρω σου στον χάρτη. Venues, events και προσφορές με ένα tap.",
          },
          {
            icon: Ticket,
            title: "Αγορά Εισιτηρίων",
            description: "Αγόρασε εισιτήρια online για concerts, parties και events. Ασφαλείς πληρωμές με Stripe.",
          },
          {
            icon: Calendar,
            title: "Κρατήσεις Τραπεζιών",
            description: "Κάνε κράτηση σε εστιατόρια, bars και clubs. Επίλεξε ημερομηνία, ώρα, αριθμό ατόμων και θέση.",
          },
          {
            icon: Gift,
            title: "Αποκλειστικές Προσφορές",
            description: "Εξαργύρωσε μοναδικές εκπτώσεις και deals. Δωρεάν εισιτήρια, εκπτώσεις, πακέτα και credits.",
          },
          {
            icon: QrCode,
            title: "QR Code Εξαργύρωση",
            description: "Σκάναρε το QR code σου στο venue για να εξαργυρώσεις προσφορές και εισιτήρια αμέσως.",
          },
          {
            icon: Heart,
            title: "Αγαπημένα",
            description: "Αποθήκευσε τα αγαπημένα σου events, venues και προσφορές για να τα βρίσκεις εύκολα.",
          },
          {
            icon: Bell,
            title: "Push Ειδοποιήσεις",
            description: "Μάθε πρώτος για νέα events και προσφορές από venues που ακολουθείς.",
          },
          {
            icon: Users,
            title: "RSVP σε Events",
            description: "Δήλωσε συμμετοχή σε events. Δες ποιοι πάνε και ποιοι ενδιαφέρονται.",
          },
          {
            icon: MessageCircle,
            title: "Direct Messaging",
            description: "Επικοινώνησε απευθείας με venues για ερωτήσεις, ειδικά αιτήματα ή πληροφορίες.",
          },
          {
            icon: GraduationCap,
            title: "Φοιτητικές Εκπτώσεις",
            description: "Αν είσαι φοιτητής, απόλαυσε ειδικές εκπτώσεις σε επιλεγμένα venues και events.",
          },
          {
            icon: Share2,
            title: "Κοινοποίηση",
            description: "Μοιράσου events και προσφορές με φίλους μέσω social media ή direct link.",
          },
        ],
      },
      categories: {
        title: "Τι θα βρεις στο ΦΟΜΟ",
        items: [
          { icon: Utensils, label: "Εστιατόρια" },
          { icon: Music, label: "Clubs & Bars" },
          { icon: PartyPopper, label: "Events & Parties" },
          { icon: Gift, label: "Προσφορές" },
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
            description: "Ανακάλυψε events, προσφορές και venues στον χάρτη ή το feed.",
          },
          {
            step: "3",
            title: "Ζήσε το",
            description: "Κάνε κρατήσεις, αγόρασε εισιτήρια και εξαργύρωσε προσφορές με QR code.",
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
          "Κρατήσεις σε εστιατόρια, bars και clubs",
          "Εξαργύρωση προσφορών με QR code",
          "Αποθήκευση αγαπημένων events & venues",
          "Push ειδοποιήσεις για νέα events",
          "RSVP και συμμετοχή σε events",
          "Direct messaging με venues",
          "Φοιτητικές εκπτώσεις",
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
        title: "Everything you can do",
        items: [
          {
            icon: Compass,
            title: "Explore Venues & Events",
            description: "Discover restaurants, bars, clubs and events near you. Filter by category, location or date.",
          },
          {
            icon: MapPin,
            title: "Interactive Map",
            description: "See what's happening around you in real time on the map. Venues, events and offers with one tap.",
          },
          {
            icon: Ticket,
            title: "Buy Tickets",
            description: "Purchase tickets online for concerts, parties and events. Secure payments with Stripe.",
          },
          {
            icon: Calendar,
            title: "Table Reservations",
            description: "Book a table at restaurants, bars and clubs. Choose date, time, party size and seating.",
          },
          {
            icon: Gift,
            title: "Exclusive Offers",
            description: "Redeem unique discounts and deals. Free tickets, discounts, bundles and credits.",
          },
          {
            icon: QrCode,
            title: "QR Code Redemption",
            description: "Scan your QR code at the venue to redeem offers and tickets instantly.",
          },
          {
            icon: Heart,
            title: "Favorites",
            description: "Save your favorite events, venues and offers to find them easily.",
          },
          {
            icon: Bell,
            title: "Push Notifications",
            description: "Be the first to know about new events and offers from venues you follow.",
          },
          {
            icon: Users,
            title: "RSVP to Events",
            description: "Mark your attendance at events. See who's going and who's interested.",
          },
          {
            icon: MessageCircle,
            title: "Direct Messaging",
            description: "Contact venues directly for questions, special requests or information.",
          },
          {
            icon: GraduationCap,
            title: "Student Discounts",
            description: "If you're a student, enjoy special discounts at selected venues and events.",
          },
          {
            icon: Share2,
            title: "Share",
            description: "Share events and offers with friends via social media or direct link.",
          },
        ],
      },
      categories: {
        title: "What you'll find on ΦΟΜΟ",
        items: [
          { icon: Utensils, label: "Restaurants" },
          { icon: Music, label: "Clubs & Bars" },
          { icon: PartyPopper, label: "Events & Parties" },
          { icon: Gift, label: "Offers" },
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
            description: "Discover events, offers and venues on the map or feed.",
          },
          {
            step: "3",
            title: "Live it",
            description: "Make reservations, buy tickets and redeem offers with QR code.",
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
          "Reservations at restaurants, bars and clubs",
          "Redeem offers with QR code",
          "Save favorite events & venues",
          "Push notifications for new events",
          "RSVP and attend events",
          "Direct messaging with venues",
          "Student discounts",
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
            <div className="inline-flex items-center gap-1.5 bg-seafoam text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full mb-6 text-[11px] sm:text-sm font-medium">
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
              <Button asChild className="text-sm sm:text-base bg-seafoam hover:bg-seafoam/90 text-white px-4 sm:px-6 h-10 sm:h-11 rounded-xl">
                <Link to="/signup">{content.hero.cta}</Link>
              </Button>
              <Button asChild variant="outline" className="text-sm sm:text-base border-seafoam/40 text-seafoam hover:bg-seafoam/10 px-4 sm:px-6 h-10 sm:h-11 rounded-xl">
                <Link to="/feed">{content.hero.exploreCta}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Strip */}
      <section className="py-10 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-cinzel text-lg sm:text-xl md:text-2xl font-bold text-center text-foreground mb-8">
            {content.categories.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {content.categories.items.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background border border-border/50 hover:border-seafoam/30 transition-colors"
              >
                <div className="w-10 h-10 bg-seafoam/10 rounded-full flex items-center justify-center">
                  <cat.icon className="w-5 h-5 text-seafoam" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground">{cat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid — 12 items */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-cinzel text-[clamp(1.25rem,5vw,3rem)] font-bold text-center text-seafoam mb-12">
            {content.features.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {content.features.items.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-seafoam/20">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 bg-seafoam/10 rounded-xl flex items-center justify-center mb-3">
                      <feature.icon className="w-5 h-5 text-seafoam" />
                    </div>
                    <h3 className="font-poppins font-semibold text-sm sm:text-base text-foreground mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
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
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
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
                <div className="w-14 h-14 bg-seafoam text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="font-poppins font-semibold text-base sm:text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Unlock */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            {content.unlock.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.unlock.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 bg-muted/30 rounded-lg p-3.5 border border-border/50"
              >
                <div className="w-7 h-7 bg-seafoam/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-seafoam" />
                </div>
                <span className="text-foreground text-xs sm:text-sm">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guest Mode */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-background rounded-2xl p-6 sm:p-8 border border-border/50"
          >
            <Smartphone className="w-10 h-10 text-seafoam mx-auto mb-4" />
            <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-foreground mb-3">
              {content.guestMode.title}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6">
              {content.guestMode.description}
            </p>
            <Button asChild variant="outline" className="border-seafoam/40 text-seafoam hover:bg-seafoam/10 rounded-xl text-xs sm:text-sm px-4 sm:px-6 h-9 sm:h-10 w-full sm:w-auto">
              <Link to="/feed">{content.guestMode.cta}</Link>
            </Button>
          </motion.div>
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
            <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              {content.cta.title}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8">
              {content.cta.subtitle}
            </p>
            <Button asChild size="lg" className="text-xs sm:text-base bg-seafoam hover:bg-seafoam/90 text-white px-5 sm:px-8 h-9 sm:h-11 rounded-xl w-full sm:w-auto">
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
