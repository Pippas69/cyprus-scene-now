import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQSectionProps {
  language: "en" | "el";
}

const faqs = [
  {
    question: {
      en: "What is ΦΟΜΟ and how does it work?",
      el: "Τι είναι το ΦΟΜΟ και πώς λειτουργεί;",
    },
    answer: {
      en: "ΦΟΜΟ is Cyprus's premier event discovery platform. Browse events, RSVP, make reservations, and unlock exclusive offers - all in one app. We connect you with the best happenings across the island.",
      el: "Το ΦΟΜΟ είναι η κορυφαία πλατφόρμα ανακάλυψης εκδηλώσεων της Κύπρου. Περιηγηθείτε σε εκδηλώσεις, κάντε RSVP, κρατήσεις και ξεκλειδώστε αποκλειστικές προσφορές - όλα σε μία εφαρμογή.",
    },
  },
  {
    question: {
      en: "Is ΦΟΜΟ free to use?",
      el: "Είναι δωρεάν το ΦΟΜΟ;",
    },
    answer: {
      en: "Yes! ΦΟΜΟ is completely free for users. Browse events, save favorites, RSVP, and redeem offers at no cost. Businesses pay a small subscription to list their events and offers.",
      el: "Ναι! Το ΦΟΜΟ είναι εντελώς δωρεάν για τους χρήστες. Περιηγηθείτε σε εκδηλώσεις, αποθηκεύστε αγαπημένα, κάντε RSVP και εξαργυρώστε προσφορές χωρίς κόστος.",
    },
  },
  {
    question: {
      en: "How do I redeem offers and discounts?",
      el: "Πώς εξαργυρώνω προσφορές και εκπτώσεις;",
    },
    answer: {
      en: "Simply browse available offers, tap to save them, and show the QR code at the venue. The business will scan your code to verify and apply the discount instantly.",
      el: "Απλά περιηγηθείτε στις διαθέσιμες προσφορές, πατήστε για αποθήκευση και δείξτε τον κωδικό QR στο μαγαζί. Η επιχείρηση θα σκανάρει τον κωδικό σας για επαλήθευση.",
    },
  },
  {
    question: {
      en: "Can I list my business or event on ΦΟΜΟ?",
      el: "Μπορώ να καταχωρήσω την επιχείρησή μου στο ΦΟΜΟ;",
    },
    answer: {
      en: "Absolutely! Create a business account, complete verification, and start posting events and offers. We offer flexible subscription plans with analytics, boost features, and promotional tools.",
      el: "Απολύτως! Δημιουργήστε επαγγελματικό λογαριασμό, ολοκληρώστε την επαλήθευση και ξεκινήστε να δημοσιεύετε εκδηλώσεις και προσφορές.",
    },
  },
  {
    question: {
      en: "Which cities does ΦΟΜΟ cover?",
      el: "Ποιες πόλεις καλύπτει το ΦΟΜΟ;",
    },
    answer: {
      en: "We currently cover all major Cyprus cities: Nicosia, Limassol, Larnaca, Paphos, and Ayia Napa. We're constantly expanding to include more venues and areas across the island.",
      el: "Αυτή τη στιγμή καλύπτουμε όλες τις μεγάλες πόλεις της Κύπρου: Λευκωσία, Λεμεσό, Λάρνακα, Πάφο και Αγία Νάπα. Επεκτεινόμαστε συνεχώς.",
    },
  },
  {
    question: {
      en: "How do reservations work?",
      el: "Πώς λειτουργούν οι κρατήσεις;",
    },
    answer: {
      en: "For events that accept reservations, you can book your spot directly through ΦΟΜΟ. You'll receive a confirmation code and QR code to present at the venue. Some events may require approval.",
      el: "Για εκδηλώσεις που δέχονται κρατήσεις, μπορείτε να κλείσετε θέση απευθείας μέσω ΦΟΜΟ. Θα λάβετε κωδικό επιβεβαίωσης και QR code για να παρουσιάσετε στο μαγαζί.",
    },
  },
];

const FAQSection = ({ language }: FAQSectionProps) => {
  const content = {
    en: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about ΦΟΜΟ",
    },
    el: {
      title: "Συχνές Ερωτήσεις",
      subtitle: "Όλα όσα χρειάζεται να ξέρετε για το ΦΟΜΟ",
    },
  };

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background to-seafoam/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-aegean/10 text-aegean mb-6">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">FAQ</span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            {content[language].title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl px-6 data-[state=open]:shadow-card transition-shadow"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:text-aegean transition-colors py-5">
                  {faq.question[language]}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer[language]}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
