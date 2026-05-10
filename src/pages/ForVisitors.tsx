import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Compass,
  Ticket,
  Calendar,
  Gift,
  QrCode,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

const content = {
  el: {
    badge: "Για επισκέπτες",
    hero: {
      title: "Ανακάλυψε τι συμβαίνει γύρω σου",
      subtitle: "Το ΦΟΜΟ είναι ο απόλυτος οδηγός σου για νυχτερινή ζωή, φαγητό και αποκλειστικά events στην Κύπρο.",
      cta: "Ξεκίνα τώρα",
      exploreCta: "Εξερεύνησε πρώτα",
    },
    features: {
      eyebrow: "Χαρακτηριστικά",
      title: "Όλα όσα μπορείς να κάνεις",
      items: [
        { icon: Compass, title: "Εξερεύνησε venues & events", description: "Ανακάλυψε εστιατόρια, bars, clubs και events κοντά σου μέσω χάρτη ή feed. Φιλτράρισε ανά κατηγορία, τοποθεσία ή ημερομηνία." },
        { icon: Calendar, title: "Κρατήσεις τραπεζιών", description: "Κλείσε τραπέζι σε εστιατόριο, bar ή club. Επίλεξε ημερομηνία, ώρα και αριθμό ατόμων σε δευτερόλεπτα." },
        { icon: Ticket, title: "Εισιτήρια & RSVP", description: "Αγόρασε εισιτήρια για concerts και parties. Δήλωσε συμμετοχή σε events και δες ποιοι πάνε." },
        { icon: Gift, title: "Αποκλειστικές προσφορές", description: "Βρες μοναδικές εκπτώσεις και deals. Δωρεάν εισιτήρια, εκπτώσεις και πακέτα για εγγεγραμμένους χρήστες." },
        { icon: QrCode, title: "Εξαργύρωση με QR", description: "Σκάναρε το QR code σου στο venue για να εξαργυρώσεις προσφορές και εισιτήρια αμέσως, χωρίς ταλαιπωρία." },
        { icon: GraduationCap, title: "Φοιτητικές εκπτώσεις", description: "Ειδικές εκπτώσεις για φοιτητές σε επιλεγμένα venues και events σε όλη την Κύπρο." },
      ],
    },
    howItWorks: {
      eyebrow: "Διαδικασία",
      title: "Πώς λειτουργεί",
      steps: [
        { step: "01", title: "Δημιούργησε λογαριασμό", description: "Εγγράψου δωρεάν σε λιγότερο από 1 λεπτό. Χρειάζεσαι μόνο email." },
        { step: "02", title: "Εξερεύνησε", description: "Ανακάλυψε events, προσφορές και venues στον χάρτη ή το feed." },
        { step: "03", title: "Ζήσε το", description: "Κάνε κρατήσεις, αγόρασε εισιτήρια και εξαργύρωσε προσφορές με QR code." },
      ],
    },
    unlock: {
      eyebrow: "Εγγραφή",
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
      guest: "Εξερεύνησε ως επισκέπτης",
    },
  },
  en: {
    badge: "For visitors",
    hero: {
      title: "Discover what's happening around you",
      subtitle: "ΦΟΜΟ is your ultimate guide to nightlife, food, and exclusive events in Cyprus.",
      cta: "Get started",
      exploreCta: "Explore first",
    },
    features: {
      eyebrow: "Features",
      title: "Everything you can do",
      items: [
        { icon: Compass, title: "Explore venues & events", description: "Discover restaurants, bars, clubs and events near you via the map or feed. Filter by category, location or date." },
        { icon: Calendar, title: "Table reservations", description: "Book a table at a restaurant, bar or club. Choose date, time and party size in seconds." },
        { icon: Ticket, title: "Tickets & RSVP", description: "Buy tickets for concerts and parties. Mark your attendance at events and see who else is going." },
        { icon: Gift, title: "Exclusive offers", description: "Find unique discounts and deals. Free tickets, discounts and bundles for registered users." },
        { icon: QrCode, title: "QR code redemption", description: "Scan your QR code at the venue to redeem offers and tickets instantly, no hassle." },
        { icon: GraduationCap, title: "Student discounts", description: "Special discounts for students at selected venues and events across Cyprus." },
      ],
    },
    howItWorks: {
      eyebrow: "Process",
      title: "How it works",
      steps: [
        { step: "01", title: "Create an account", description: "Sign up for free in less than 1 minute. All you need is an email." },
        { step: "02", title: "Explore", description: "Discover events, offers and venues on the map or feed." },
        { step: "03", title: "Live it", description: "Make reservations, buy tickets and redeem offers with your QR code." },
      ],
    },
    unlock: {
      eyebrow: "Registration",
      title: "What you unlock with an account",
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
      guest: "Explore as guest",
    },
  },
};

const ForVisitors = () => {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative bg-background overflow-hidden pt-28 sm:pt-32 pb-14 sm:pb-20">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-seafoam/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="px-6 sm:px-10 lg:px-16 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-1.5 bg-seafoam/15 text-seafoam border border-seafoam/25 px-3 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.badge}</span>
              </div>

              <h1
                className="font-urbanist font-black text-white leading-[0.9] tracking-[-0.04em] mb-6"
                style={{ fontSize: "clamp(2.8rem, 6.5vw, 6rem)" }}
              >
                {t.hero.title}
              </h1>

              <p className="font-inter text-white/55 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
                {t.hero.subtitle}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full px-7 h-11"
                >
                  <Link to="/signup">{t.hero.cta}</Link>
                </Button>
                <Button
                  asChild
                  className="bg-transparent border border-white/15 text-white/80 hover:bg-white/5 hover:text-white rounded-full px-7 h-11"
                >
                  <Link to="/feed">
                    {t.hero.exploreCta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 sm:mb-14">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.features.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
              >
                {t.features.title}
              </motion.h2>
            </div>

            {/* All screen sizes — grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {t.features.items.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-5 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-seafoam/25 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-seafoam/10 border border-seafoam/20 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-seafoam" />
                  </div>
                  <div>
                    <h3 className="font-urbanist font-bold text-white text-lg sm:text-xl leading-snug mb-2">
                      {feature.title}
                    </h3>
                    <p className="font-inter text-white/40 text-sm sm:text-[15px] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 sm:mb-14">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.howItWorks.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
              >
                {t.howItWorks.title}
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {t.howItWorks.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <span
                    className="font-urbanist font-black text-seafoam/20 leading-none select-none"
                    style={{ fontSize: "clamp(4rem, 7vw, 6.5rem)" }}
                  >
                    {step.step}
                  </span>
                  <div>
                    <h3 className="font-urbanist font-bold text-white text-xl mb-2">{step.title}</h3>
                    <p className="font-inter text-white/45 text-sm sm:text-[15px] leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What You Unlock ────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 sm:mb-14">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.unlock.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
              >
                {t.unlock.title}
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {t.unlock.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-4 p-4 sm:p-5 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <div className="w-8 h-8 rounded-full bg-seafoam/10 border border-seafoam/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-seafoam" />
                  </div>
                  <span className="font-inter text-white/80 text-sm sm:text-[15px]">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-seafoam/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="px-6 sm:px-10 lg:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto text-center"
          >
            <h2
              className="font-urbanist font-black text-white leading-[0.9] tracking-[-0.04em] mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              {t.cta.title}
            </h2>
            <p className="font-inter text-white/50 text-lg sm:text-xl mb-10 max-w-xl mx-auto">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                className="bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full px-8 h-12 text-base"
              >
                <Link to="/signup">{t.cta.button}</Link>
              </Button>
              <Link
                to="/feed"
                className="font-inter text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1.5"
              >
                {t.cta.guest}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ForVisitors;
