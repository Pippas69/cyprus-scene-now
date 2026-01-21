import { motion } from "framer-motion";
import { ChevronDown, Heart } from "lucide-react";
import { useState } from "react";

interface FAQSectionProps {
  language: "en" | "el";
}

// User FAQs
const userFaqs = {
  el: [
    {
      question: "Τι είναι το ΦΟΜΟ και πώς λειτουργεί;",
      answer: "Το ΦΟΜΟ είναι η κορυφαία πλατφόρμα ανακάλυψης εκδηλώσεων της Κύπρου. Περιηγηθείτε σε εκδηλώσεις, κάντε RSVP, κρατήσεις και ξεκλειδώστε αποκλειστικές προσφορές - όλα σε μία εφαρμογή.",
    },
    {
      question: "Είναι δωρεάν το ΦΟΜΟ;",
      answer: "Ναι! Το ΦΟΜΟ είναι εντελώς δωρεάν για τους χρήστες. Περιηγηθείτε σε εκδηλώσεις, αποθηκεύστε αγαπημένα, κάντε RSVP και εξαργυρώστε προσφορές χωρίς κόστος.",
    },
    {
      question: "Πώς λειτουργούν οι κρατήσεις;",
      answer: "Για εκδηλώσεις που δέχονται κρατήσεις, μπορείτε να κλείσετε θέση απευθείας μέσω ΦΟΜΟ. Θα λάβετε κωδικό επιβεβαίωσης και QR code για να παρουσιάσετε στο μαγαζί.",
    },
    {
      question: "Πώς λειτουργούν οι εκδηλώσεις και οι προσφορές;",
      answer: "🎉 Εκδηλώσεις: Περιηγηθείτε στις διαθέσιμες εκδηλώσεις, κάντε RSVP (Going/Interested), κλείστε θέση ή αγοράστε εισιτήρια. Λάβετε υπενθύμιση και παρουσιάστε το QR code σας στην είσοδο. 🎁 Προσφορές: Βρείτε αποκλειστικές εκπτώσεις, αποθηκεύστε την προσφορά και δείξτε τον κωδικό QR στο μαγαζί. Η επιχείρηση θα τον σκανάρει και η έκπτωση εφαρμόζεται αυτόματα!",
    },
  ],
  en: [
    {
      question: "What is ΦΟΜΟ and how does it work?",
      answer: "ΦΟΜΟ is Cyprus's premier event discovery platform. Browse events, RSVP, make reservations, and unlock exclusive offers - all in one app.",
    },
    {
      question: "Is ΦΟΜΟ free to use?",
      answer: "Yes! ΦΟΜΟ is completely free for users. Browse events, save favorites, RSVP, and redeem offers at no cost.",
    },
    {
      question: "How do reservations work?",
      answer: "For events that accept reservations, you can book your spot directly through ΦΟΜΟ. You'll receive a confirmation code and QR code to present at the venue.",
    },
    {
      question: "How do events and offers work?",
      answer: "🎉 Events: Browse available events, RSVP (Going/Interested), book a spot or purchase tickets. Get a reminder and present your QR code at the entrance. 🎁 Offers: Find exclusive discounts, save the offer and show the QR code at the venue. The business scans it and the discount is applied instantly!",
    },
  ],
};

// Business FAQs
const businessFaqs = {
  el: [
    {
      question: "Μπορώ να καταχωρήσω την επιχείρησή μου στο ΦΟΜΟ;",
      answer: "Απολύτως! Δημιουργήστε επαγγελματικό λογαριασμό, ολοκληρώστε την επαλήθευση και ξεκινήστε να δημοσιεύετε εκδηλώσεις και προσφορές.",
    },
    {
      question: "Τι κερδίζω αν βάλω την επιχείρησή μου στο ΦΟΜΟ;",
      answer: "Αποκτήστε νέους πελάτες, αυξήστε την ορατότητα, διαχειριστείτε κρατήσεις και αναλύστε τα δεδομένα σας. Το ΦΟΜΟ είναι marketplace - φέρνει κόσμο απευθείας στην πόρτα σας!",
    },
    {
      question: "Είναι απλή προβολή ή φέρνει πραγματικούς πελάτες;",
      answer: "Το ΦΟΜΟ δεν είναι απλή σελίδα διαφήμισης - είναι marketplace που φέρνει πραγματικούς πελάτες! Με κρατήσεις, QR offers και RSVPs, μετράτε άμεσα τα αποτελέσματα και βλέπετε ποιος έρχεται στο μαγαζί σας.",
    },
    {
      question: "Υπάρχει δωρεάν πλάνο;",
      answer: "Ναι, υπάρχει δωρεάν πλάνο με βασικές λειτουργίες. Αναβαθμίστε για περισσότερες δυνατότητες όπως boost και analytics.",
    },
  ],
  en: [
    {
      question: "Can I list my business on ΦΟΜΟ?",
      answer: "Absolutely! Create a business account, complete verification, and start posting events and offers.",
    },
    {
      question: "What do I gain by adding my business to ΦΟΜΟ?",
      answer: "Get new customers, increase visibility, manage reservations, and analyze your data. ΦΟΜΟ is a marketplace - it brings people directly to your door!",
    },
    {
      question: "Is it just exposure or does it bring real customers?",
      answer: "ΦΟΜΟ is not just an advertising page - it's a marketplace that brings real customers! With reservations, QR offers, and RSVPs, you measure results directly and see who comes to your venue.",
    },
    {
      question: "Is there a free plan?",
      answer: "Yes, there's a free plan with basic features. Upgrade for more capabilities like boost and analytics.",
    },
  ],
};

const FAQItem = ({ 
  question, 
  answer, 
  isOpen, 
  onClick 
}: { 
  question: string; 
  answer: string; 
  isOpen: boolean; 
  onClick: () => void;
}) => (
  <div 
    className="bg-[#e8f4f4]/80 backdrop-blur-sm rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-[#e0f0f0]"
    onClick={onClick}
  >
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-[#1a4a5a] font-medium text-sm md:text-base pr-4">{question}</span>
      <ChevronDown 
        className={`w-5 h-5 text-[#2a6a7a] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
      />
    </div>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="px-5 pb-4"
      >
        <p className="text-[#3a7a8a] text-sm">{answer}</p>
      </motion.div>
    )}
  </div>
);

const FAQSection = ({ language }: FAQSectionProps) => {
  const [openUserFaq, setOpenUserFaq] = useState<number | null>(null);
  const [openBusinessFaq, setOpenBusinessFaq] = useState<number | null>(null);

  const content = {
    en: {
      title: '"We had the same questions at the beginning!"',
      userTitle: "User's FAQ",
      businessTitle: "Businesses' FAQ",
      tagline: "If it's happening, it's already on ΦΟΜΟ.",
    },
    el: {
      title: '"Κι εμείς τις ίδιες απορίες είχαμε στην αρχή!"',
      userTitle: "User's FAQ",
      businessTitle: "Businesses' FAQ",
      tagline: "Αν συμβαίνει, είναι ήδη στο ΦΟΜΟ.",
    },
  };

  const t = content[language];
  const currentUserFaqs = userFaqs[language];
  const currentBusinessFaqs = businessFaqs[language];

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-[#2da0b0] via-[#35b5b5] to-[#4dd4c4]">
      <div className="container mx-auto px-4">
        {/* Two Column FAQs - No title, reduced spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto mb-16">
          {/* User's FAQ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl md:text-2xl font-bold text-[#0d3b4a] mb-6">{t.userTitle}</h3>
            <div className="space-y-3">
              {currentUserFaqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openUserFaq === index}
                  onClick={() => setOpenUserFaq(openUserFaq === index ? null : index)}
                />
              ))}
            </div>
          </motion.div>

          {/* Business FAQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl md:text-2xl font-bold text-[#0d3b4a] mb-6">{t.businessTitle}</h3>
            <div className="space-y-3">
              {currentBusinessFaqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openBusinessFaq === index}
                  onClick={() => setOpenBusinessFaq(openBusinessFaq === index ? null : index)}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Heart Icon with Loading Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative">
            <Heart className="w-12 h-12 text-[#2a8a9a] fill-[#2a8a9a]" />
          </div>
          <div className="w-24 h-2 bg-[#1a5a6a]/30 rounded-full mt-2 overflow-hidden">
            <motion.div 
              className="h-full bg-[#2a8a9a] rounded-full"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl md:text-3xl font-semibold text-[#0d3b4a] mb-8"
        >
          {t.tagline}
        </motion.p>

        {/* App Store Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4"
        >
          {/* App Store Button */}
          <button
            type="button"
            onClick={() => console.log("App Store clicked")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-seafoam to-aegean text-white rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="flex flex-col items-start">
              <span className="text-xs opacity-90">Download on the</span>
              <span className="text-lg font-semibold -mt-1">App Store</span>
            </div>
          </button>

          {/* Google Play Button */}
          <button
            type="button"
            onClick={() => console.log("Google Play clicked")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-seafoam to-aegean text-white rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="flex flex-col items-start">
              <span className="text-xs opacity-90">GET IT ON</span>
              <span className="text-lg font-semibold -mt-1">Google Play</span>
            </div>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;