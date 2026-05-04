import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Reveal3D } from "@/components/ui/scroll-3d";

interface FAQSectionProps {
  language: "en" | "el";
}

const userFaqs = {
  el: [
    { question: "Τι είναι το ΦΟΜΟ και πώς λειτουργεί;", answer: "Το ΦΟΜΟ είναι η κορυφαία πλατφόρμα ανακάλυψης εκδηλώσεων της Κύπρου. Περιηγηθείτε σε εκδηλώσεις, κάντε RSVP, κρατήσεις και ξεκλειδώστε αποκλειστικές προσφορές — όλα σε μία εφαρμογή." },
    { question: "Είναι δωρεάν το ΦΟΜΟ;", answer: "Ναι! Το ΦΟΜΟ είναι εντελώς δωρεάν για τους χρήστες. Περιηγηθείτε σε εκδηλώσεις, αποθηκεύστε αγαπημένα, κάντε RSVP και εξαργυρώστε προσφορές χωρίς κόστος." },
    { question: "Πώς λειτουργούν οι κρατήσεις;", answer: "Για εκδηλώσεις που δέχονται κρατήσεις, μπορείτε να κλείσετε θέση απευθείας μέσω ΦΟΜΟ. Θα λάβετε κωδικό επιβεβαίωσης και QR code για να παρουσιάσετε στο μαγαζί." },
    { question: "Πώς λειτουργούν οι προσφορές;", answer: "Βρείτε εκπτώσεις, δείξτε τον κωδικό QR στο μαγαζί και η έκπτωση εφαρμόζεται αυτόματα. Απλό, γρήγορο, αποτελεσματικό." },
  ],
  en: [
    { question: "What is ΦΟΜΟ and how does it work?", answer: "ΦΟΜΟ is Cyprus's premier event discovery platform. Browse events, RSVP, make reservations, and unlock exclusive offers — all in one app." },
    { question: "Is ΦΟΜΟ free to use?", answer: "Yes! ΦΟΜΟ is completely free for users. Browse events, save favorites, RSVP, and redeem offers at no cost." },
    { question: "How do reservations work?", answer: "For events that accept reservations, you can book your spot directly through ΦΟΜΟ. You'll receive a confirmation code and QR code to present at the venue." },
    { question: "How do offers work?", answer: "Find discounts, show the QR code at the venue and the discount is applied instantly. Simple, fast, effective." },
  ],
};

const businessFaqs = {
  el: [
    { question: "Πώς καταχωρώ την επιχείρησή μου;", answer: "Δημιουργήστε επαγγελματικό λογαριασμό, ολοκληρώστε την επαλήθευση και ξεκινήστε να δημοσιεύετε εκδηλώσεις και προσφορές σε λίγα λεπτά." },
    { question: "Τι κερδίζω από το ΦΟΜΟ;", answer: "Νέοι πελάτες, αυξημένη ορατότητα, διαχείριση κρατήσεων, real-time analytics. Το ΦΟΜΟ φέρνει κόσμο στην πόρτα σας!" },
    { question: "Φέρνει πραγματικούς πελάτες;", answer: "Το ΦΟΜΟ είναι marketplace που φέρνει πραγματικούς πελάτες. Με κρατήσεις, QR offers και RSVPs μετράτε άμεσα τα αποτελέσματα." },
    { question: "Υπάρχει δωρεάν πλάνο;", answer: "Ναι, υπάρχει δωρεάν πλάνο με βασικές λειτουργίες. Αναβαθμίστε για περισσότερα: boost, analytics, απεριόριστα events." },
  ],
  en: [
    { question: "How do I list my business?", answer: "Create a business account, complete verification, and start posting events and offers in minutes." },
    { question: "What do I gain from ΦΟΜΟ?", answer: "New customers, increased visibility, reservation management, real-time analytics. ΦΟΜΟ brings people directly to your door!" },
    { question: "Does it bring real customers?", answer: "ΦΟΜΟ is a marketplace that brings real customers. With reservations, QR offers and RSVPs you measure results directly." },
    { question: "Is there a free plan?", answer: "Yes, there's a free plan with basic features. Upgrade for more: boost, analytics, unlimited events." },
  ],
};

const FAQItem = ({
  question, answer, isOpen, onClick, index,
}: { question: string; answer: string; isOpen: boolean; onClick: () => void; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
  >
    <div
      className={`border rounded-xl overflow-hidden cursor-pointer transition-all duration-250 ${
        isOpen
          ? "border-white/15 bg-white/[0.05]"
          : "border-white/[0.07] bg-white/[0.025] hover:border-white/12 hover:bg-white/[0.04]"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <span className={`font-medium text-sm leading-snug transition-colors ${isOpen ? "text-white" : "text-white/65"}`}>
          {question}
        </span>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen ? "bg-seafoam/20 rotate-180" : "bg-white/5"}`}>
          <ChevronDown className={`w-3.5 h-3.5 transition-colors ${isOpen ? "text-seafoam" : "text-white/40"}`} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-5 pb-4">
              <div className="h-px bg-white/[0.07] mb-3" />
              <p className="text-white/45 text-sm leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
);

const FAQSection = ({ language }: FAQSectionProps) => {
  const [openUser, setOpenUser] = useState<number | null>(null);
  const [openBiz, setOpenBiz] = useState<number | null>(null);

  const labels = {
    en: { user: "For Users", biz: "For Businesses", title: "Common Questions", eyebrow: "FAQ" },
    el: { user: "Για Χρήστες", biz: "Για Επιχειρήσεις", title: "Συχνές Ερωτήσεις", eyebrow: "FAQ" },
  };
  const l = labels[language];

  return (
    <section className="relative py-24 sm:py-32 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_80%,hsl(var(--seafoam)/0.05),transparent)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 sm:mb-16"
        >
          <p className="text-seafoam text-xs font-semibold tracking-widest uppercase mb-3">{l.eyebrow}</p>
          <h2 className="font-urbanist font-black text-4xl sm:text-5xl text-white leading-tight">{l.title}</h2>
        </motion.div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Users */}
          <Reveal3D direction="left">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-4 w-1 rounded-full bg-seafoam" />
                <h3 className="text-white font-semibold text-base">{l.user}</h3>
              </div>
              <div className="space-y-2">
                {userFaqs[language].map((faq, i) => (
                  <FAQItem
                    key={i} index={i}
                    question={faq.question} answer={faq.answer}
                    isOpen={openUser === i}
                    onClick={() => setOpenUser(openUser === i ? null : i)}
                  />
                ))}
              </div>
            </div>
          </Reveal3D>

          {/* Businesses */}
          <Reveal3D direction="right" delay={0.1}>
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-4 w-1 rounded-full bg-golden" />
                <h3 className="text-white font-semibold text-base">{l.biz}</h3>
              </div>
              <div className="space-y-2">
                {businessFaqs[language].map((faq, i) => (
                  <FAQItem
                    key={i} index={i}
                    question={faq.question} answer={faq.answer}
                    isOpen={openBiz === i}
                    onClick={() => setOpenBiz(openBiz === i ? null : i)}
                  />
                ))}
              </div>
            </div>
          </Reveal3D>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </section>
  );
};

export default FAQSection;
