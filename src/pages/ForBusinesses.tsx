import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Rocket, ArrowRight, Check, Calendar, Ticket, Gift, Sparkles,
  Building2, UserCheck, Mail, TrendingUp, Bell, QrCode, MapPin,
  Users, User, MessageSquare, Settings, Search, Eye, RefreshCw,
  Clock, CreditCard, Zap, MousePointer, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";

// ─── Shared app chrome ───────────────────────────────────────────────────────

const MockupNavbar = () => (
  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08]">
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-[3px]">
        <div className="w-3.5 h-px bg-white/35" />
        <div className="w-3.5 h-px bg-white/35" />
        <div className="w-2.5 h-px bg-white/25" />
      </div>
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 via-cyan-300 to-purple-500" />
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-seafoam rounded-full px-2 py-1">
        <QrCode className="w-2.5 h-2.5 text-white" />
        <span className="text-white font-semibold" style={{ fontSize: 9 }}>Scan QR</span>
      </div>
      <Search className="w-3 h-3 text-white/30" />
      <div className="flex" style={{ fontSize: 8 }}>
        <span className="px-1.5 py-0.5 rounded-l text-white/30 bg-white/[0.06] border border-white/[0.06]">GR ΕΛ</span>
        <span className="px-1.5 py-0.5 rounded-r bg-seafoam/80 text-white font-medium">EN</span>
      </div>
      <div className="relative">
        <Bell className="w-3 h-3 text-white/30" />
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: 6 }}>2</span>
        </div>
      </div>
      <div className="w-5 h-5 rounded-full bg-seafoam flex items-center justify-center">
        <span className="text-white font-bold" style={{ fontSize: 8 }}>T</span>
      </div>
    </div>
  </div>
);

const sidebarItems = [
  { Icon: Calendar,      id: "calendar" },
  { Icon: Users,         id: "users"    },
  { Icon: TrendingUp,    id: "analytics"},
  { Icon: MessageSquare, id: "messages" },
  { Icon: CreditCard,    id: "payments" },
  { Icon: Zap,           id: "boost"    },
  { Icon: Settings,      id: "settings" },
];

const MockupSidebar = ({ active }: { active: string }) => (
  <div className="w-9 flex-shrink-0 border-r border-white/[0.06] flex flex-col items-center gap-4 py-4">
    {sidebarItems.map(({ Icon, id }) =>
      id === active ? (
        <div key={id} className="w-6 h-6 rounded-lg bg-seafoam/20 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-seafoam" />
        </div>
      ) : (
        <Icon key={id} className="w-3.5 h-3.5 text-white/20" />
      )
    )}
  </div>
);

// ─── Reservations mockup ─────────────────────────────────────────────────────

const ReservationsMockup = () => {
  const rows = [
    { name: "Alex P.",    phone: "123456789", people: "5 people (22+)", loc: "Limassol", charge: "€100.00 Min", prepaid: "€0.75", seat: "Table", checkins: false, care: "Maria",     note: "—"             },
    { name: "Nikos S.",   phone: "123456789", people: "2 people (23+)", loc: "—",        charge: "€100.00 Min", prepaid: "€0.30", seat: "Table", checkins: false, care: "ΦΟΜΟ",      note: "—"             },
    { name: "Sofia M.",   phone: "123456789", people: "7 people (22+)", loc: "Limassol", charge: "€250.00 Min", prepaid: "€0.85", seat: "Sofa",  checkins: true,  care: "Maria",     note: "Birthday Party"},
    { name: "Petros V.",  phone: "123456789", people: "7 people (28+)", loc: "Limassol", charge: "€150.00 Min", prepaid: "€0.30", seat: "Table", checkins: false, care: "Thomas P.", note: "—"             },
    { name: "Stavros L.", phone: "123456789", people: "5 people (21+)", loc: "Limassol", charge: "€100.00 Min", prepaid: "",      seat: "Table", checkins: false, care: "Thomas P.", note: "—"             },
  ];

  return (
    <div className="rounded-2xl bg-[hsl(213,55%,7%)] border border-white/[0.1] overflow-hidden select-none relative">
      <MockupNavbar />
      <div className="flex">
        <MockupSidebar active="users" />

        <div className="flex-1 min-w-0 p-3 overflow-hidden">
          {/* Section tab row */}
          <div className="flex items-center gap-1 mb-3">
            <button className="text-white/30 flex items-center gap-0.5" style={{ fontSize: 10 }}>
              Tickets <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button className="text-white/30 flex items-center gap-0.5 mx-1" style={{ fontSize: 10 }}>
              Reservations <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <span className="bg-seafoam/15 text-seafoam flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-medium" style={{ fontSize: 10 }}>
              Tickets &amp; Reservati... <ChevronDown className="w-2.5 h-2.5" />
            </span>
          </div>

          {/* Management / Control toggle */}
          <div className="flex rounded-full bg-white/[0.06] overflow-hidden mb-3" style={{ fontSize: 10 }}>
            <span className="flex-1 text-center py-1.5 bg-white font-semibold" style={{ color: "hsl(213,55%,10%)" }}>
              Management
            </span>
            <span className="flex-1 text-center py-1.5 text-white/30">Control</span>
          </div>

          {/* Pending Links */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3 h-3 text-white/40" />
              <span className="text-white/60 font-semibold" style={{ fontSize: 10 }}>Pending Links (1)</span>
            </div>
            <div className="grid border-b border-white/[0.06] pb-1 mb-1 text-white/30"
              style={{ gridTemplateColumns: "1.6fr 1fr 0.9fr 1.7fr 0.5fr 1.3fr", fontSize: 9 }}>
              <span>Details</span><span>Details</span><span>Care of</span><span>Status</span><span>Note</span><span>Expires</span>
            </div>
            <div className="grid items-center gap-x-1 py-1.5"
              style={{ gridTemplateColumns: "1.6fr 1fr 0.9fr 1.7fr 0.5fr 1.3fr", fontSize: 10 }}>
              <div>
                <div className="text-white font-semibold" style={{ fontSize: 11 }}>Michael K.</div>
                <div className="text-white/30" style={{ fontSize: 9 }}>123456789</div>
              </div>
              <div className="text-white/55">5 people<br /><span className="text-white/28" style={{ fontSize: 9 }}>Table</span></div>
              <div className="text-white/55">Giorgos</div>
              <div>
                <span className="inline-flex items-center gap-0.5 bg-amber-400/15 text-amber-300 px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ fontSize: 9 }}>
                  <Clock className="w-2 h-2" /> Awaiting payment
                </span>
              </div>
              <div className="text-white/30" style={{ fontSize: 9 }}>No</div>
              <div className="text-white/35" style={{ fontSize: 9 }}>10 May 08:36</div>
            </div>
          </div>

          {/* Main reservations table */}
          <div className="grid border-b border-white/[0.06] pb-1 text-white/30"
            style={{ gridTemplateColumns: "1.6fr 1.6fr 1.5fr 0.7fr 1.4fr 1.1fr 1.1fr", fontSize: 9 }}>
            <span>Details</span><span>Details</span><span>Minimum Charge</span><span>Seating</span><span>Status</span><span>Care of</span><span>Notes</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid items-start gap-x-1 py-2 border-b border-white/[0.04] last:border-0"
              style={{ gridTemplateColumns: "1.6fr 1.6fr 1.5fr 0.7fr 1.4fr 1.1fr 1.1fr", fontSize: 10 }}>
              <div>
                <div className="text-white font-semibold" style={{ fontSize: 11 }}>{r.name}</div>
                <div className="text-white/28" style={{ fontSize: 9 }}>{r.phone}</div>
              </div>
              <div>
                <div className="text-white/60">{r.people}</div>
                <div className="text-white/28" style={{ fontSize: 9 }}>{r.loc}</div>
              </div>
              <div>
                <div className="text-white/60">{r.charge}</div>
                {r.prepaid && <div className="text-white/28" style={{ fontSize: 9 }}>Prepaid: {r.prepaid}</div>}
              </div>
              <div className="text-white/55">{r.seat}</div>
              <div>
                {r.checkins ? (
                  <span className="inline-flex items-center bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ fontSize: 9 }}>
                    7/7 check ins
                  </span>
                ) : (
                  <span className="text-white/45">Confirmed</span>
                )}
              </div>
              <div className="text-white/45 truncate">{r.care}</div>
              <div className="text-white/28 truncate">{r.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[hsl(213,55%,7%)] to-transparent pointer-events-none" />
    </div>
  );
};

// ─── Analytics mockup ────────────────────────────────────────────────────────

const AnalyticsMockup = () => (
  <div className="rounded-2xl bg-[hsl(213,55%,7%)] border border-white/[0.1] overflow-hidden select-none relative">
    <MockupNavbar />
    <div className="flex">
      <MockupSidebar active="analytics" />

      <div className="flex-1 min-w-0 p-3 overflow-hidden">
        {/* Analytics / CRM + date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.06]" style={{ fontSize: 10 }}>
            <span className="bg-white px-3 py-1 rounded-full font-bold" style={{ color: "hsl(213,55%,8%)" }}>Analytics</span>
            <span className="text-white/35 px-3 py-1">CRM</span>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1" style={{ fontSize: 9 }}>
            <Calendar className="w-2.5 h-2.5 text-seafoam" />
            <span className="text-white/50">09/04 – 09/05</span>
          </div>
        </div>

        {/* 6 stat tiles */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {([
            { label: "Views",        value: "2,044", Icon: Eye       },
            { label: "Customers",    value: "340",   Icon: Users     },
            { label: "Returning",    value: "3%",    Icon: RefreshCw },
            { label: "Reservations", value: "78",    Icon: Calendar  },
            { label: "Tickets",      value: "270",   Icon: Ticket    },
            { label: "Visits",       value: "110",   Icon: QrCode    },
          ] as const).map(({ label, value, Icon }, i) => (
            <div key={i} className="rounded-xl bg-[hsl(213,48%,12%)] border border-white/[0.07] p-2.5">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-white/40 leading-none" style={{ fontSize: 10 }}>{label}</span>
                <Icon className="w-3 h-3 text-seafoam flex-shrink-0" />
              </div>
              <div className="font-urbanist font-black text-white leading-none" style={{ fontSize: 19 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Profile + Events performance */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            {
              title: "Profile performance", TitleIcon: User,
              rows: [
                { label: "Views",        RowIcon: Eye,          value: 161 },
                { label: "Interactions", RowIcon: MousePointer, value: 23  },
                { label: "Visits",       RowIcon: MapPin,       value: 0   },
              ],
            },
            {
              title: "Events performance", TitleIcon: Calendar,
              rows: [
                { label: "Views",        RowIcon: Eye,          value: "1,883" },
                { label: "Interactions", RowIcon: MousePointer, value: 3       },
                { label: "Visits",       RowIcon: MapPin,       value: 110     },
              ],
            },
          ].map((card, i) => (
            <div key={i} className="rounded-xl bg-[hsl(213,48%,12%)] border border-white/[0.07] p-2.5">
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/[0.07]">
                <card.TitleIcon className="w-3 h-3 text-seafoam" />
                <span className="text-white font-bold" style={{ fontSize: 10 }}>{card.title}</span>
              </div>
              {card.rows.map(({ label, RowIcon, value }, j) => (
                <div key={j} className="flex items-center justify-between py-1 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-1">
                    <RowIcon className="w-2.5 h-2.5 text-white/28" />
                    <span className="text-white/38" style={{ fontSize: 9 }}>{label}</span>
                  </div>
                  <span className="text-white font-medium" style={{ fontSize: 10 }}>{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Your Audience */}
        <div>
          <div className="font-urbanist font-bold text-white mb-2" style={{ fontSize: 11 }}>Your Audience</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { title: "Gender", TitleIcon: Users,    rows: [{ label: "Male", value: 182 }, { label: "Female", value: 0 }, { label: "Other", value: 232 }] },
              { title: "Age",    TitleIcon: Calendar, rows: [{ label: "18-24", value: 250 }, { label: "25-34", value: 94 }, { label: "35-44", value: 3 }] },
              { title: "Region", TitleIcon: MapPin,   rows: [{ label: "Limassol", value: 350 }, { label: "Nicosia", value: 1 }, { label: "Larnaca", value: 8 }] },
            ].map((card, i) => (
              <div key={i} className="rounded-xl bg-[hsl(213,48%,12%)] border border-white/[0.07] p-2.5">
                <div className="flex items-center gap-1 mb-2">
                  <card.TitleIcon className="w-2.5 h-2.5 text-seafoam" />
                  <span className="text-white/55 font-semibold" style={{ fontSize: 9 }}>{card.title}</span>
                </div>
                {card.rows.map(({ label, value }, j) => (
                  <div key={j} className="flex items-center justify-between py-0.5">
                    <span className="text-white/32" style={{ fontSize: 9 }}>{label}</span>
                    <span className="text-white font-medium" style={{ fontSize: 9 }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[hsl(213,55%,7%)] to-transparent pointer-events-none" />
  </div>
);

// ─── Content ─────────────────────────────────────────────────────────────────

const content = {
  el: {
    badge: "Για επιχειρήσεις",
    hero: {
      title: "Ανέπτυξε την επιχείρησή σου με το ΦΟΜΟ",
      subtitle: "Η πλατφόρμα που φέρνει τους πελάτες σε εσένα. Δημιούργησε events, προσφορές και διαχειρίσου κρατήσεις σε ένα μέρος.",
      cta: "Ξεκίνα δωρεάν",
      secondaryCta: "Δες πώς λειτουργεί",
    },
    stats: [
      { value: "10K+", label: "Ενεργοί χρήστες" },
      { value: "500+", label: "Επιχειρήσεις" },
      { value: "50K+", label: "Κρατήσεις" },
    ],
    features: {
      eyebrow: "Εργαλεία",
      title: "Όλα όσα χρειάζεσαι",
      items: [
        { icon: Calendar,  title: "Σύστημα Κρατήσεων",   description: "Ημερολόγιο, time slots, έγκριση κρατήσεων και πλήρης διαχείριση χωρητικότητας." },
        { icon: Ticket,    title: "Ticketing & Check-in", description: "Πώληση εισιτηρίων online, QR code check-in και παρακολούθηση πωλήσεων." },
        { icon: Gift,      title: "Προσφορές & Deals",    description: "Δημιούργησε εκπτώσεις, bundles και offers που εξαργυρώνονται με QR code." },
        { icon: BarChart3, title: "Analytics Dashboard",  description: "Views, followers, RSVPs, redemptions και conversions σε πραγματικό χρόνο." },
        { icon: Rocket,    title: "Event Boosting",       description: "Προώθησε events στην κορυφή του feed για μέγιστη ορατότητα." },
        { icon: UserCheck, title: "CRM & Guest Profiles", description: "Προφίλ επισκεπτών, VIP levels, σημειώσεις και ιστορικό κρατήσεων." },
      ],
    },
    dashboard: {
      eyebrow: "Διαχείριση",
      title: "Κρατήσεις & Εισιτήρια",
      description: "Διαχειρίσου κάθε κράτηση και εισιτήριο από ένα καθαρό panel. Έγκριση, check-in και παρακολούθηση — όλα σε πραγματικό χρόνο.",
      bullets: [
        "Άμεση εμφάνιση και έγκριση εκκρεμών κρατήσεων",
        "Παρακολούθηση τραπεζιών, party size και seating",
        "Check-in εισιτηρίων με σκανάρισμα QR code",
        "Ορισμός minimum charge και προπληρωμής",
        "Πλήρης ιστορικό — ποιος χειρίστηκε κάθε κράτηση",
      ],
    },
    howItWorks: {
      eyebrow: "Διαδικασία",
      title: "Πώς ξεκινάς",
      steps: [
        { step: "01", title: "Δημιούργησε λογαριασμό",  description: "Εγγράψου δωρεάν. Συμπλήρωσε το προφίλ σου, ανέβασε φωτογραφίες και γίνε ορατός αμέσως." },
        { step: "02", title: "Δημοσίευσε content",       description: "Δημιούργησε events, προσφορές και κρατήσεις. Το κοινό σου τα ανακαλύπτει αμέσως." },
        { step: "03", title: "Αναπτύξου",                description: "Παρακολούθησε τα αναλυτικά σου, βελτιστοποίησε με boosts και αύξησε τα έσοδά σου." },
      ],
    },
    analytics: {
      eyebrow: "Αναλυτικά",
      title: "Γνώρισε τους αριθμούς σου",
      description: "Views, κρατήσεις, εισιτήρια και δημογραφικά κοινού — όλα μαζεμένα. Δες τι λειτουργεί και πού να επενδύσεις.",
      bullets: [
        "Views, πελάτες, εισιτήρια και κρατήσεις με μια ματιά",
        "Απόδοση προφίλ vs απόδοση events χωριστά",
        "Δημογραφικά κοινού: φύλο, ηλικία, περιοχή",
        "Ποσοστό επιστρεφόντων πελατών",
        "Πλήρη στατιστικά boost campaigns",
      ],
    },
    pricing: {
      eyebrow: "Τιμολόγηση",
      title: "Επίλεξε το πλάνο σου",
      monthly: "Μηνιαίο",
      annual: "Ετήσιο",
      saveLabel: "2 μήνες δωρεάν",
      perMonth: "/μήνα",
      billedAnnually: "χρέωση ετησίως",
      choosePlan: "Ξεκίνα τώρα",
      mostPopular: "Δημοφιλέστερο",
      free:  { title: "Free",  features: ["Προφίλ επιχείρησης", "Δημιουργία events & προσφορών", "Βασικά αναλυτικά", "12% commission", "Χωρίς boost credits"] },
      basic: { title: "Basic", features: ["Όλα του Free", "Βελτιωμένη προβολή", "Analytics απόδοσης", "10% commission", "€50 boost credits/μήνα", "Basic support"] },
      pro:   { title: "Pro",   features: ["Όλα του Basic", "Αυξημένη προβολή", "Boost analytics", "8% commission", "€150 boost credits/μήνα", "Pro support"] },
      elite: { title: "Elite", features: ["Όλα του Pro", "Μέγιστη προβολή Παγκύπρια", "Πλήρη αναλυτικά & καθοδήγηση", "6% commission", "€300 boost credits/μήνα", "Elite support"] },
    },
    enterprise: { title: "Enterprise", description: "Για μεγάλες επιχειρήσεις με ειδικές ανάγκες", contactLabel: "Επικοινωνήστε:" },
    cta: {
      title: "Έτοιμος να ξεκινήσεις;",
      subtitle: "Εγγράψου δωρεάν και ξεκίνα να αναπτύσσεις την επιχείρησή σου σήμερα.",
      button: "Δημιούργησε λογαριασμό επιχείρησης",
    },
  },
  en: {
    badge: "For businesses",
    hero: {
      title: "Grow your business with ΦΟΜΟ",
      subtitle: "The platform that brings customers to you. Create events, offers and manage reservations in one place.",
      cta: "Start for free",
      secondaryCta: "See how it works",
    },
    stats: [
      { value: "10K+", label: "Active users" },
      { value: "500+", label: "Businesses" },
      { value: "50K+", label: "Reservations" },
    ],
    features: {
      eyebrow: "Tools",
      title: "Everything you need",
      items: [
        { icon: Calendar,  title: "Booking System",       description: "Calendar, time slots, reservation approval and full capacity management." },
        { icon: Ticket,    title: "Ticketing & Check-in", description: "Sell tickets online, QR code check-in and sales tracking." },
        { icon: Gift,      title: "Offers & Deals",       description: "Create discounts, bundles and offers redeemed via QR code." },
        { icon: BarChart3, title: "Analytics Dashboard",  description: "Views, followers, RSVPs, redemptions and conversions in real time." },
        { icon: Rocket,    title: "Event Boosting",       description: "Promote events to the top of the feed for maximum visibility." },
        { icon: UserCheck, title: "CRM & Guest Profiles", description: "Guest profiles, VIP levels, notes and reservation history." },
      ],
    },
    dashboard: {
      eyebrow: "Management",
      title: "Reservations & Tickets",
      description: "Handle every reservation and ticket from one clean panel. Approve bookings, track check-ins and manage your floor in real time.",
      bullets: [
        "Instantly view and approve pending reservations",
        "Track table assignments, party size, and seating type",
        "Manage ticket check-ins via QR code scanning",
        "Set minimum charges, prepaid amounts, and staff notes",
        "Full accountability — see who handled every booking",
      ],
    },
    howItWorks: {
      eyebrow: "Process",
      title: "How you get started",
      steps: [
        { step: "01", title: "Create your account",  description: "Sign up for free. Complete your profile, upload photos and become visible immediately." },
        { step: "02", title: "Publish content",      description: "Create events, offers and bookings. Your audience discovers them right away." },
        { step: "03", title: "Grow",                 description: "Track your analytics, optimise with boosts and increase your revenue." },
      ],
    },
    analytics: {
      eyebrow: "Analytics",
      title: "Know your numbers",
      description: "Views, bookings, tickets and audience demographics — all in one place. See what works and where to invest.",
      bullets: [
        "Views, customers, tickets and reservations at a glance",
        "Profile vs Events performance breakdown",
        "Audience demographics: gender, age, region",
        "Returning customer rate",
        "Full boost campaign performance stats",
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Choose your plan",
      monthly: "Monthly",
      annual: "Annual",
      saveLabel: "2 months free",
      perMonth: "/month",
      billedAnnually: "billed annually",
      choosePlan: "Get started",
      mostPopular: "Most popular",
      free:  { title: "Free",  features: ["Business profile", "Create events & offers", "Basic analytics", "12% commission", "No boost credits"] },
      basic: { title: "Basic", features: ["Everything in Free", "Enhanced visibility", "Performance analytics", "10% commission", "€50 boost credits/month", "Basic support"] },
      pro:   { title: "Pro",   features: ["Everything in Basic", "Boosted visibility", "Boost analytics", "8% commission", "€150 boost credits/month", "Pro support"] },
      elite: { title: "Elite", features: ["Everything in Pro", "Maximum visibility Cyprus-wide", "Full analytics & guidance", "6% commission", "€300 boost credits/month", "Elite support"] },
    },
    enterprise: { title: "Enterprise", description: "For large businesses with special needs", contactLabel: "Contact us:" },
    cta: {
      title: "Ready to get started?",
      subtitle: "Sign up for free and start growing your business today.",
      button: "Create business account",
    },
  },
};

const PLAN_PRICES = { basic: 5999, pro: 11999, elite: 23999 } as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

const ForBusinesses = () => {
  const { language } = useLanguage();
  const t = content[language];
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const paidPlans = ["basic", "pro", "elite"] as const;

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-background overflow-hidden pt-28 sm:pt-32 pb-14 sm:pb-20">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-seafoam/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="px-6 sm:px-10 lg:px-16 relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-1.5 bg-seafoam/15 text-seafoam border border-seafoam/25 px-3 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide">
                <TrendingUp className="w-3.5 h-3.5" />
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
                <Button asChild className="bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full px-7 h-11">
                  <Link to="/signup-business">{t.hero.cta}</Link>
                </Button>
                <Button asChild className="bg-transparent border border-white/15 text-white/80 hover:bg-white/5 hover:text-white rounded-full px-7 h-11">
                  <Link to="#how-it-works">
                    {t.hero.secondaryCta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <section className="py-10 sm:py-12 bg-background border-y border-white/[0.06]">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6 sm:gap-10">
            {t.stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <div className="font-urbanist font-black text-seafoam leading-none mb-1" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                  {s.value}
                </div>
                <div className="font-inter text-white/40 text-xs sm:text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 sm:mb-14">
              <motion.p
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.features.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
                style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
              >
                {t.features.title}
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {t.features.items.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-5 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-seafoam/25 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-seafoam/10 border border-seafoam/20 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-seafoam" />
                  </div>
                  <div>
                    <h3 className="font-urbanist font-bold text-white text-lg sm:text-xl leading-snug mb-2">{feature.title}</h3>
                    <p className="font-inter text-white/40 text-sm sm:text-[15px] leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reservations mockup ──────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3">{t.dashboard.eyebrow}</p>
              <h2
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em] mb-5"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}
              >
                {t.dashboard.title}
              </h2>
              <p className="font-inter text-white/50 text-base sm:text-lg leading-relaxed mb-8">{t.dashboard.description}</p>
              <ul className="space-y-3">
                {t.dashboard.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-seafoam/10 border border-seafoam/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-seafoam" />
                    </div>
                    <span className="font-inter text-white/70 text-sm sm:text-[15px]">{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReservationsMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 sm:mb-14">
              <motion.p
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.howItWorks.eyebrow}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
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
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-4 p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <span className="font-urbanist font-black text-seafoam/20 leading-none select-none" style={{ fontSize: "clamp(4rem, 7vw, 6.5rem)" }}>
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

      {/* ── Analytics mockup ─────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="order-2 lg:order-1"
            >
              <AnalyticsMockup />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="order-1 lg:order-2"
            >
              <p className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3">{t.analytics.eyebrow}</p>
              <h2
                className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em] mb-5"
                style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}
              >
                {t.analytics.title}
              </h2>
              <p className="font-inter text-white/50 text-base sm:text-lg leading-relaxed mb-8">{t.analytics.description}</p>
              <ul className="space-y-3">
                {t.analytics.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-seafoam/10 border border-seafoam/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-seafoam" />
                    </div>
                    <span className="font-inter text-white/70 text-sm sm:text-[15px]">{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 sm:mb-12">
              <motion.p
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="font-inter text-[10px] tracking-[0.24em] text-white/40 uppercase mb-3"
              >
                {t.pricing.eyebrow}
              </motion.p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:justify-between">
                <motion.h2
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="font-urbanist font-black text-white leading-[0.88] tracking-[-0.04em]"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
                >
                  {t.pricing.title}
                </motion.h2>
                <div className="inline-flex items-center gap-1 p-1 bg-white/[0.06] rounded-full self-start sm:self-auto">
                  {(["monthly", "annual"] as const).map((cycle) => (
                    <button
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                        billingCycle === cycle ? "bg-seafoam text-aegean" : "text-white/50 hover:text-white/80"
                      }`}
                    >
                      {cycle === "monthly" ? t.pricing.monthly : t.pricing.annual}
                      {cycle === "annual" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${billingCycle === "annual" ? "bg-aegean/20 text-aegean" : "bg-seafoam/15 text-seafoam"}`}>
                          {t.pricing.saveLabel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Free plan banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] mb-5"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/40" />
                <span className="font-urbanist font-bold text-white text-sm">{t.pricing.free.title}</span>
                <span className="font-urbanist font-black text-seafoam text-sm ml-1">€0</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/10" />
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {t.pricing.free.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-white/40">
                    <Check className="w-3 h-3 text-white/25" /> {f}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Paid plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {paidPlans.map((slug, i) => {
                const isPro = slug === "pro";
                return (
                  <motion.div
                    key={slug}
                    initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${
                      isPro ? "bg-seafoam/[0.06] border-seafoam/30" : "bg-white/[0.04] border-white/[0.08] hover:border-seafoam/20"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3 left-6">
                        <span className="inline-flex items-center gap-1 bg-seafoam text-aegean text-[10px] font-bold px-3 py-1 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" /> {t.pricing.mostPopular}
                        </span>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="font-urbanist font-black text-white text-xl uppercase tracking-wide mb-3">
                        {t.pricing[slug].title}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-urbanist font-black text-white text-3xl">???</span>
                        <span className="font-inter text-white/40 text-sm">{t.pricing.perMonth}</span>
                      </div>
                      {billingCycle === "annual" && (
                        <p className="font-inter text-white/30 text-xs mt-1">{t.pricing.billedAnnually}</p>
                      )}
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-8">
                      {t.pricing[slug].features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPro ? "text-seafoam" : "text-white/40"}`} />
                          <span className="font-inter text-white/70 text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className={isPro
                        ? "bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full h-11"
                        : "bg-transparent border border-white/15 text-white/80 hover:bg-white/5 hover:text-white rounded-full h-11"
                      }
                    >
                      <Link to="/signup-business">{t.pricing.choosePlan}</Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]"
            >
              <div>
                <span className="font-urbanist font-bold text-white">{t.enterprise.title}</span>
                <span className="font-inter text-white/40 text-sm ml-3">{t.enterprise.description}</span>
              </div>
              <a href="mailto:support@fomo.com.cy" className="inline-flex items-center gap-2 text-seafoam text-sm font-medium hover:text-seafoam/80 transition-colors whitespace-nowrap">
                <Mail className="w-4 h-4" /> support@fomo.com.cy
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-seafoam/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="px-6 sm:px-10 lg:px-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto text-center"
          >
            <h2
              className="font-urbanist font-black text-white leading-[0.9] tracking-[-0.04em] mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              {t.cta.title}
            </h2>
            <p className="font-inter text-white/50 text-lg sm:text-xl mb-10 max-w-xl mx-auto">{t.cta.subtitle}</p>
            <Button asChild className="bg-seafoam hover:bg-seafoam/90 text-aegean font-semibold rounded-full px-8 h-12 text-base">
              <Link to="/signup-business">
                {t.cta.button}
                <ArrowRight className="ml-2 w-4 h-4" />
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
