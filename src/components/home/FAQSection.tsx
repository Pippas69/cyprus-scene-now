import { motion } from "framer-motion";
import { ChevronDown, Heart } from "lucide-react";
import { useState } from "react";

interface FAQSectionProps {
  language: "en" | "el";
}

const userFaqs = {
  el: [
    { question: "Τι είναι το ΦΟΜΟ και πώς λειτουργεί;", answer: "Το ΦΟΜΟ είναι η κορυφαία πλατφόρμα ανακάλυψης εκδηλώσεων της Κύπρου. Περιηγηθείτε σε εκδηλώσεις, κάντε RSVP, κρατήσεις και ξεκλειδώστε αποκλειστικές προσφορές - όλα σε μία εφαρμογή." },
    { question: "Είναι δωρεάν το ΦΟΜΟ;", answer: "Ναι! Το ΦΟΜΟ είναι εντελώς δωρεάν για τους χρήστες. Περιηγηθείτε σε εκδηλώσεις, αποθηκεύστε αγαπημένα, κάντε RSVP και εξαργυρώστε προσφορές χωρίς κόστος." },
    { question: "Πώς λειτουργούν οι κρατήσεις;", answer: "Για εκδηλώσεις που δέχονται κρατήσεις, μπορείτε να κλείσετε θέση απευθείας μέσω ΦΟΜΟ. Θα λάβετε κωδικό επιβεβαίωσης και QR code για να παρουσιάσετε στο μαγαζί." },
    { question: "Πώς λειτουργούν οι εκδηλώσεις και οι προσφορές;", answer: "🎉 Εκδηλώσεις: Περιηγηθείτε, κάντε RSVP, κλείστε θέση ή αγοράστε εισιτήρια. 🎁 Προσφορές: Βρείτε εκπτώσεις, δείξτε τον κωδικό QR στο μαγαζί και η έκπτωση εφαρμόζεται αυτόματα!" },
  ],
  en: [
    { question: "What is ΦΟΜΟ and how does it work?", answer: "ΦΟΜΟ is Cyprus's premier event discovery platform. Browse events, RSVP, make reservations, and unlock exclusive offers - all in one app." },
    { question: "Is ΦΟΜΟ free to use?", answer: "Yes! ΦΟΜΟ is completely free for users. Browse events, save favorites, RSVP, and redeem offers at no cost." },
    { question: "How do reservations work?", answer: "For events that accept reservations, you can book your spot directly through ΦΟΜΟ. You'll receive a confirmation code and QR code to present at the venue." },
    { question: "How do events and offers work?", answer: "🎉 Events: Browse, RSVP, book a spot or purchase tickets. 🎁 Offers: Find discounts, show the QR code at the venue and the discount is applied instantly!" },
  ],
};

const businessFaqs = {
  el: [
    { question: "Μπορώ να καταχωρήσω την επιχείρησή μου στο ΦΟΜΟ;", answer: "Απολύτως! Δημιουργήστε επαγγελματικό λογαριασμό, ολοκληρώστε την επαλήθευση και ξεκινήστε να δημοσιεύετε εκδηλώσεις και προσφορές." },
    { question: "Τι κερδίζω αν βάλω την επιχείρησή μου στο ΦΟΜΟ;", answer: "Αποκτήστε νέους πελάτες, αυξήστε την ορατότητα, διαχειριστείτε κρατήσεις και αναλύστε τα δεδομένα σας. Το ΦΟΜΟ φέρνει κόσμο στην πόρτα σας!" },
    { question: "Είναι απλή προβολή ή φέρνει πραγματικούς πελάτες;", answer: "Το ΦΟΜΟ είναι marketplace που φέρνει πραγματικούς πελάτες! Με κρατήσεις, QR offers και RSVPs, μετράτε άμεσα τα αποτελέσματα." },
    { question: "Υπάρχει δωρεάν πλάνο;", answer: "Ναι, υπάρχει δωρεάν πλάνο με βασικές λειτουργίες. Αναβαθμίστε για περισσότερες δυνατότητες όπως boost και analytics." },
  ],
  en: [
    { question: "Can I list my business on ΦΟΜΟ?", answer: "Absolutely! Create a business account, complete verification, and start posting events and offers." },
    { question: "What do I gain by adding my business to ΦΟΜΟ?", answer: "Get new customers, increase visibility, manage reservations, and analyze your data. ΦΟΜΟ brings people directly to your door!" },
    { question: "Is it just exposure or does it bring real customers?", answer: "ΦΟΜΟ is a marketplace that brings real customers! With reservations, QR offers, and RSVPs, you measure results directly." },
    { question: "Is there a free plan?", answer: "Yes, there's a free plan with basic features. Upgrade for more capabilities like boost and analytics." },
  ],
};

const FAQItem = ({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) => (
  <div
    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-white/8 hover:border-white/20"
    onClick={onClick}
  >
    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4">
      <span className="text-white/80 font-medium text-xs sm:text-sm pr-4 leading-tight">{question}</span>
      <ChevronDown className={`w-4 h-4 text-seafoam flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
    </div>
    {isOpen && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 sm:px-5 pb-4">
        <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{answer}</p>
      </motion.div>
    )}
  </div>
);

const FAQSection = ({ language }: FAQSectionProps) => {
  const [openUserFaq, setOpenUserFaq] = useState<number | null>(null);
  const [openBusinessFaq, setOpenBusinessFaq] = useState<number | null>(null);

  const content = {
    en: { userTitle: "User's FAQ", businessTitle: "Businesses' FAQ", tagline: "If it's happening, it's already on ΦΟΜΟ." },
    el: { userTitle: "User's FAQ", businessTitle: "Businesses' FAQ", tagline: "Αν συμβαίνει, είναι ήδη στο ΦΟΜΟ." },
  };

  const t = content[language];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--seafoam)/0.06),transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto mb-12 sm:mb-16">
          {/* User FAQ */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">{t.userTitle}</h3>
            <div className="space-y-2 sm:space-y-3">
              {userFaqs[language].map((faq, i) => (
                <FAQItem key={i} question={faq.question} answer={faq.answer} isOpen={openUserFaq === i} onClick={() => setOpenUserFaq(openUserFaq === i ? null : i)} />
              ))}
            </div>
          </motion.div>

          {/* Business FAQ */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">{t.businessTitle}</h3>
            <div className="space-y-2 sm:space-y-3">
              {businessFaqs[language].map((faq, i) => (
                <FAQItem key={i} question={faq.question} answer={faq.answer} isOpen={openBusinessFaq === i} onClick={() => setOpenBusinessFaq(openBusinessFaq === i ? null : i)} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tagline */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-seafoam/60 fill-seafoam/60 mx-auto mb-4" />
          <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 mb-8">{t.tagline}</p>

          {/* App Store Buttons */}
          <div className="flex flex-row justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => console.log("App Store clicked")}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-seafoam text-aegean rounded-xl hover:bg-seafoam/90 transition-all duration-300 hover:scale-105 font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-current flex-shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[8px] sm:text-[10px] opacity-70">Download on the</span>
                <span className="text-sm sm:text-base font-semibold -mt-0.5">App Store</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => console.log("Google Play clicked")}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-seafoam text-aegean rounded-xl hover:bg-seafoam/90 transition-all duration-300 hover:scale-105 font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-current flex-shrink-0">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[8px] sm:text-[10px] opacity-70">GET IT ON</span>
                <span className="text-sm sm:text-base font-semibold -mt-0.5">Google Play</span>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
