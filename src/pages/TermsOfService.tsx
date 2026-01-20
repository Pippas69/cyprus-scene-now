import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Store, QrCode, Shield, AlertTriangle, Scale } from "lucide-react";

const TermsOfService = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Όροι Χρήσης",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Καλώς ήρθατε στο ΦΟΜΟ. Χρησιμοποιώντας την πλατφόρμα μας, αποδέχεστε τους παρακάτω όρους χρήσης. Παρακαλούμε διαβάστε τους προσεκτικά.",
      sections: [
        {
          icon: FileText,
          title: "1. Τι είναι το ΦΟΜΟ",
          content: "Το ΦΟΜΟ είναι μια ψηφιακή πλατφόρμα που συνδέει χρήστες με επιχειρήσεις στην Κύπρο. Μέσω της εφαρμογής μας, μπορείτε να ανακαλύπτετε εκδηλώσεις, προσφορές, να κάνετε κρατήσεις και να αγοράζετε εισιτήρια.",
        },
        {
          icon: Store,
          title: "2. Περιεχόμενο Επιχειρήσεων",
          content: "Οι εκδηλώσεις, προσφορές, εισιτήρια και υπηρεσίες που εμφανίζονται στην πλατφόρμα παρέχονται από τρίτες επιχειρήσεις. Το ΦΟΜΟ λειτουργεί ως ενδιάμεσος και δεν είναι υπεύθυνο για:",
          items: [
            "Τη διαθεσιμότητα και τις τιμές των υπηρεσιών",
            "Την ποιότητα των παρεχόμενων υπηρεσιών",
            "Την ακρίβεια των πληροφοριών που παρέχουν οι επιχειρήσεις",
            "Τυχόν αλλαγές ή ακυρώσεις εκδηλώσεων",
          ],
        },
        {
          icon: Users,
          title: "3. Πρόσβαση Επισκεπτών",
          content: "Μπορείτε να περιηγηθείτε στην πλατφόρμα ως επισκέπτης με περιορισμένη πρόσβαση. Για να αποκτήσετε πλήρη πρόσβαση σε όλες τις λειτουργίες, πρέπει να δημιουργήσετε λογαριασμό.",
          items: [
            "Οι επισκέπτες μπορούν να δουν περιορισμένο περιεχόμενο",
            "Για κρατήσεις απαιτείται λογαριασμός",
            "Για αγορά εισιτηρίων απαιτείται λογαριασμός",
            "Για εξαργύρωση προσφορών και check-in απαιτείται λογαριασμός",
          ],
        },
        {
          icon: QrCode,
          title: "4. Χρήση QR Codes",
          content: "Τα QR codes που δημιουργούνται για εισιτήρια, προσφορές και check-in είναι μοναδικά και προσωπικά. Απαγορεύεται:",
          items: [
            "Η αντιγραφή ή διαμοιρασμός QR codes",
            "Η κατάχρηση συστήματος εξαργυρώσεων",
            "Η παραπλανητική χρήση ή απάτη",
            "Η μεταπώληση εισιτηρίων χωρίς εξουσιοδότηση",
          ],
        },
        {
          icon: AlertTriangle,
          title: "5. Ευθύνες Επιχειρήσεων",
          content: "Οι επιχειρήσεις που χρησιμοποιούν την πλατφόρμα είναι αποκλειστικά υπεύθυνες για:",
          items: [
            "Την ακρίβεια των πληροφοριών που καταχωρούν",
            "Την τήρηση των δεσμεύσεών τους προς τους χρήστες",
            "Τη διαθεσιμότητα και τιμολόγηση των υπηρεσιών τους",
            "Την τήρηση της τοπικής νομοθεσίας",
          ],
        },
        {
          icon: Shield,
          title: "6. Δικαιώματα του ΦΟΜΟ",
          content: "Το ΦΟΜΟ διατηρεί το δικαίωμα να:",
          items: [
            "Αφαιρεί περιεχόμενο που παραβιάζει τους όρους χρήσης",
            "Αναστέλλει ή τερματίζει λογαριασμούς χρηστών ή επιχειρήσεων",
            "Τροποποιεί τη λειτουργικότητα της πλατφόρμας",
            "Ενημερώνει τους όρους χρήσης με προηγούμενη ειδοποίηση",
          ],
        },
        {
          icon: Scale,
          title: "7. Αλλαγές στους Όρους",
          content: "Οι παρόντες όροι μπορεί να τροποποιηθούν. Σε περίπτωση σημαντικών αλλαγών, θα ενημερωθείτε μέσω της εφαρμογής ή email. Η συνέχιση χρήσης της πλατφόρμας μετά από αλλαγές σημαίνει αποδοχή των νέων όρων.",
        },
      ],
      contact: {
        title: "Επικοινωνία",
        content: "Για ερωτήσεις σχετικά με τους όρους χρήσης, επικοινωνήστε μαζί μας:",
        email: "hello@fomo.cy",
      },
    },
    en: {
      title: "Terms of Service",
      lastUpdated: "Last updated: January 2026",
      intro: "Welcome to ΦΟΜΟ. By using our platform, you accept the following terms of use. Please read them carefully.",
      sections: [
        {
          icon: FileText,
          title: "1. What is ΦΟΜΟ",
          content: "ΦΟΜΟ is a digital platform that connects users with businesses in Cyprus. Through our app, you can discover events, offers, make reservations, and buy tickets.",
        },
        {
          icon: Store,
          title: "2. Business Content",
          content: "Events, offers, tickets, and services displayed on the platform are provided by third-party businesses. ΦΟΜΟ operates as an intermediary and is not responsible for:",
          items: [
            "Availability and pricing of services",
            "Quality of provided services",
            "Accuracy of information provided by businesses",
            "Any changes or cancellations of events",
          ],
        },
        {
          icon: Users,
          title: "3. Guest Access",
          content: "You can browse the platform as a guest with limited access. To get full access to all features, you must create an account.",
          items: [
            "Guests can view limited content",
            "Account required for reservations",
            "Account required for ticket purchases",
            "Account required for offer redemption and check-in",
          ],
        },
        {
          icon: QrCode,
          title: "4. QR Code Usage",
          content: "QR codes generated for tickets, offers, and check-in are unique and personal. It is prohibited to:",
          items: [
            "Copy or share QR codes",
            "Abuse the redemption system",
            "Engage in misleading use or fraud",
            "Resell tickets without authorization",
          ],
        },
        {
          icon: AlertTriangle,
          title: "5. Business Responsibilities",
          content: "Businesses using the platform are solely responsible for:",
          items: [
            "Accuracy of information they submit",
            "Fulfilling their commitments to users",
            "Availability and pricing of their services",
            "Compliance with local legislation",
          ],
        },
        {
          icon: Shield,
          title: "6. ΦΟΜΟ's Rights",
          content: "ΦΟΜΟ reserves the right to:",
          items: [
            "Remove content that violates terms of use",
            "Suspend or terminate user or business accounts",
            "Modify platform functionality",
            "Update terms of use with prior notice",
          ],
        },
        {
          icon: Scale,
          title: "7. Changes to Terms",
          content: "These terms may be modified. In case of significant changes, you will be notified through the app or email. Continued use of the platform after changes means acceptance of the new terms.",
        },
      ],
      contact: {
        title: "Contact",
        content: "For questions about terms of use, contact us:",
        email: "hello@fomo.cy",
      },
    },
  };

  const content = t[language];

  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
            {content.title}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {content.lastUpdated}
          </p>

          <Card className="mb-8">
            <CardContent className="p-6">
              <p className="text-foreground leading-relaxed">
                {content.intro}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {content.sections.map((section, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                        {section.title}
                      </h2>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {section.content}
                      </p>
                      {"items" in section && section.items && (
                        <ul className="space-y-2">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-2 text-foreground">
                              <span className="text-accent mt-1.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Contact */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  {content.contact.title}
                </h2>
                <p className="text-muted-foreground mb-2">
                  {content.contact.content}
                </p>
                <a
                  href={`mailto:${content.contact.email}`}
                  className="text-accent hover:underline font-medium"
                >
                  {content.contact.email}
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
