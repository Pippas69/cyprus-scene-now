import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Store, QrCode, Shield, AlertTriangle, Scale, CreditCard, Ban, UserX, Globe, Gavel, Clock, Bell } from "lucide-react";

const TermsOfService = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Όροι Χρήσης",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Καλώς ήρθατε στο ΦΟΜΟ. Χρησιμοποιώντας την πλατφόρμα μας, αποδέχεστε τους παρακάτω όρους χρήσης. Παρακαλούμε διαβάστε τους προσεκτικά. Η χρήση της πλατφόρμας συνεπάγεται πλήρη και ανεπιφύλακτη αποδοχή αυτών των όρων.",
      sections: [
        {
          icon: FileText,
          title: "1. Τι είναι το ΦΟΜΟ",
          content: "Το ΦΟΜΟ είναι μια ψηφιακή πλατφόρμα που συνδέει χρήστες με επιχειρήσεις στην Κύπρο. Μέσω της εφαρμογής μας, μπορείτε να ανακαλύπτετε εκδηλώσεις, προσφορές, να κάνετε κρατήσεις και να αγοράζετε εισιτήρια. Η πλατφόρμα λειτουργεί ως ενδιάμεσος μεταξύ χρηστών και επιχειρήσεων.",
        },
        {
          icon: Users,
          title: "2. Ηλικιακοί Περιορισμοί",
          content: "Για τη χρήση της πλατφόρμας ΦΟΜΟ:",
          items: [
            "Πρέπει να είστε τουλάχιστον 16 ετών για να δημιουργήσετε λογαριασμό",
            "Για χρήστες κάτω των 18, απαιτείται συγκατάθεση γονέα/κηδεμόνα",
            "Ορισμένες εκδηλώσεις μπορεί να έχουν ηλικιακούς περιορισμούς (π.χ. 18+, 21+)",
            "Η επιχείρηση δύναται να ζητήσει ταυτότητα για επαλήθευση ηλικίας",
            "Η παροχή ψευδών στοιχείων ηλικίας αποτελεί παραβίαση των όρων χρήσης",
          ],
        },
        {
          icon: Store,
          title: "3. Περιεχόμενο Επιχειρήσεων",
          content: "Οι εκδηλώσεις, προσφορές, εισιτήρια και υπηρεσίες που εμφανίζονται στην πλατφόρμα παρέχονται από τρίτες επιχειρήσεις. Το ΦΟΜΟ λειτουργεί ως ενδιάμεσος και δεν είναι υπεύθυνο για:",
          items: [
            "Τη διαθεσιμότητα και τις τιμές των υπηρεσιών",
            "Την ποιότητα των παρεχόμενων υπηρεσιών",
            "Την ακρίβεια των πληροφοριών που παρέχουν οι επιχειρήσεις",
            "Τυχόν αλλαγές ή ακυρώσεις εκδηλώσεων",
            "Την εκπλήρωση υποσχέσεων ή δεσμεύσεων των επιχειρήσεων",
          ],
        },
        {
          icon: Users,
          title: "4. Πρόσβαση Επισκεπτών & Εγγραφή",
          content: "Μπορείτε να περιηγηθείτε στην πλατφόρμα ως επισκέπτης με περιορισμένη πρόσβαση. Για να αποκτήσετε πλήρη πρόσβαση σε όλες τις λειτουργίες, πρέπει να δημιουργήσετε λογαριασμό.",
          items: [
            "Οι επισκέπτες μπορούν να δουν περιορισμένο περιεχόμενο",
            "Για κρατήσεις απαιτείται λογαριασμός",
            "Για αγορά εισιτηρίων απαιτείται λογαριασμός",
            "Για εξαργύρωση προσφορών και check-in απαιτείται λογαριασμός",
            "Πρέπει να παρέχετε ακριβείς και αληθείς πληροφορίες κατά την εγγραφή",
            "Είστε υπεύθυνοι για τη διατήρηση της εμπιστευτικότητας του κωδικού σας",
          ],
        },
        {
          icon: CreditCard,
          title: "5. Πληρωμές & Επιστροφές Χρημάτων",
          content: "Οι πληρωμές για εισιτήρια και κρατήσεις διεκπεραιώνονται μέσω ασφαλών τρίτων παρόχων (Stripe):",
          items: [
            "Οι τιμές εμφανίζονται σε Ευρώ (€) και περιλαμβάνουν ΦΠΑ όπου ισχύει",
            "Τυχόν χρεώσεις υπηρεσίας αναφέρονται ξεκάθαρα πριν την ολοκλήρωση",
            "Η πολιτική επιστροφών εξαρτάται από την κάθε επιχείρηση/εκδήλωση",
            "Σε περίπτωση ακύρωσης εκδήλωσης, η επιστροφή γίνεται από την επιχείρηση",
            "Πολιτική ακύρωσης: Μέχρι 3 ακυρώσεις επιτρέπονται. Μετά από 3 ακυρώσεις, περιορισμός 2 εβδομάδων",
            "Το ΦΟΜΟ δεν ευθύνεται για καθυστερήσεις στις επιστροφές χρημάτων",
          ],
        },
        {
          icon: QrCode,
          title: "6. Χρήση QR Codes",
          content: "Τα QR codes που δημιουργούνται για εισιτήρια, προσφορές και check-in είναι μοναδικά και προσωπικά. Απαγορεύεται:",
          items: [
            "Η αντιγραφή ή διαμοιρασμός QR codes",
            "Η κατάχρηση συστήματος εξαργυρώσεων",
            "Η παραπλανητική χρήση ή απάτη",
            "Η μεταπώληση εισιτηρίων χωρίς εξουσιοδότηση",
            "Η χρήση αυτοματοποιημένων εργαλείων για εξαργύρωση",
          ],
        },
        {
          icon: Ban,
          title: "7. Απαγορευμένες Συμπεριφορές",
          content: "Απαγορεύεται αυστηρά η χρήση της πλατφόρμας για:",
          items: [
            "Δημοσίευση ψευδούς, παραπλανητικού ή προσβλητικού περιεχομένου",
            "Παρενόχληση άλλων χρηστών ή επιχειρήσεων",
            "Απόπειρα παραβίασης της ασφάλειας της πλατφόρμας",
            "Χρήση bots, scrapers ή αυτοματοποιημένων εργαλείων",
            "Παραβίαση πνευματικών δικαιωμάτων",
            "Προώθηση παράνομων δραστηριοτήτων",
            "Spam ή ανεπιθύμητα μηνύματα",
          ],
        },
        {
          icon: AlertTriangle,
          title: "8. Ευθύνες Επιχειρήσεων",
          content: "Οι επιχειρήσεις που χρησιμοποιούν την πλατφόρμα είναι αποκλειστικά υπεύθυνες για:",
          items: [
            "Την ακρίβεια των πληροφοριών που καταχωρούν",
            "Την τήρηση των δεσμεύσεών τους προς τους χρήστες",
            "Τη διαθεσιμότητα και τιμολόγηση των υπηρεσιών τους",
            "Την τήρηση της τοπικής νομοθεσίας και κανονισμών",
            "Την ασφάλεια των χώρων τους",
            "Τη συμμόρφωση με υγειονομικούς κανονισμούς",
          ],
        },
        {
          icon: Shield,
          title: "9. Δικαιώματα του ΦΟΜΟ",
          content: "Το ΦΟΜΟ διατηρεί το δικαίωμα να:",
          items: [
            "Αφαιρεί περιεχόμενο που παραβιάζει τους όρους χρήσης",
            "Αναστέλλει ή τερματίζει λογαριασμούς χρηστών ή επιχειρήσεων",
            "Τροποποιεί τη λειτουργικότητα της πλατφόρμας",
            "Ενημερώνει τους όρους χρήσης με προηγούμενη ειδοποίηση",
            "Αρνηθεί υπηρεσίες σε οποιονδήποτε χωρίς εξήγηση",
            "Διερευνά υποψίες κατάχρησης και λαμβάνει μέτρα",
          ],
        },
        {
          icon: UserX,
          title: "10. Περιορισμός Ευθύνης",
          content: "Η πλατφόρμα ΦΟΜΟ παρέχεται \"ως έχει\". Δεν εγγυόμαστε:",
          items: [
            "Την αδιάλειπτη ή χωρίς σφάλματα λειτουργία",
            "Την ακρίβεια ή πληρότητα του περιεχομένου τρίτων",
            "Ότι η πλατφόρμα θα πληροί τις προσδοκίες σας",
            "Την ασφάλεια από κυβερνοεπιθέσεις (αν και λαμβάνουμε όλα τα μέτρα)",
          ],
        },
        {
          icon: Globe,
          title: "11. Πνευματική Ιδιοκτησία",
          content: "Όλο το περιεχόμενο της πλατφόρμας ΦΟΜΟ προστατεύεται:",
          items: [
            "Το λογότυπο, το όνομα και το branding είναι σήματα κατατεθέντα",
            "Ο κώδικας, το design και η λειτουργικότητα ανήκουν στο ΦΟΜΟ",
            "Απαγορεύεται η αντιγραφή ή αναπαραγωγή χωρίς άδεια",
            "Οι επιχειρήσεις διατηρούν τα δικαιώματα του δικού τους περιεχομένου",
            "Οι χρήστες παραχωρούν άδεια χρήσης για περιεχόμενο που δημοσιεύουν",
          ],
        },
        {
          icon: Gavel,
          title: "12. Εφαρμοστέο Δίκαιο & Επίλυση Διαφορών",
          content: "Οι παρόντες όροι διέπονται από το δίκαιο της Κυπριακής Δημοκρατίας:",
          items: [
            "Αρμόδια δικαστήρια είναι τα δικαστήρια της Λευκωσίας, Κύπρος",
            "Σε περίπτωση διαφοράς, θα επιδιώξουμε πρώτα εξωδικαστική επίλυση",
            "Ο χρήστης μπορεί να υποβάλει καταγγελία μέσω της πλατφόρμας",
            "Εφαρμόζεται ο Κανονισμός GDPR της ΕΕ για τα προσωπικά δεδομένα",
          ],
        },
        {
          icon: Clock,
          title: "13. Διάρκεια & Τερματισμός",
          content: "Οι παρόντες όροι ισχύουν από τη στιγμή που χρησιμοποιείτε την πλατφόρμα:",
          items: [
            "Μπορείτε να διαγράψετε τον λογαριασμό σας ανά πάσα στιγμή",
            "Το ΦΟΜΟ μπορεί να τερματίσει λογαριασμούς για παραβιάσεις",
            "Ορισμένοι όροι παραμένουν σε ισχύ μετά τον τερματισμό (π.χ. πνευματική ιδιοκτησία)",
            "Οφειλόμενα ποσά πρέπει να εξοφληθούν πριν τη διαγραφή",
          ],
        },
        {
          icon: Bell,
          title: "14. Ειδοποιήσεις & Επικοινωνία",
          content: "Επικοινωνούμε μαζί σας μέσω:",
          items: [
            "Email στη διεύθυνση που έχετε δηλώσει",
            "Push notifications (αν έχετε ενεργοποιήσει)",
            "Μηνυμάτων εντός της εφαρμογής",
            "Για σημαντικές αλλαγές, θα ειδοποιηθείτε τουλάχιστον 14 ημέρες νωρίτερα",
          ],
        },
        {
          icon: Scale,
          title: "15. Αλλαγές στους Όρους",
          content: "Οι παρόντες όροι μπορεί να τροποποιηθούν. Σε περίπτωση σημαντικών αλλαγών, θα ενημερωθείτε μέσω της εφαρμογής ή email τουλάχιστον 14 ημέρες πριν την εφαρμογή τους. Η συνέχιση χρήσης της πλατφόρμας μετά από αλλαγές σημαίνει αποδοχή των νέων όρων. Αν διαφωνείτε, μπορείτε να διαγράψετε τον λογαριασμό σας.",
        },
      ],
      contact: {
        title: "Επικοινωνία",
        content: "Για ερωτήσεις σχετικά με τους όρους χρήσης, επικοινωνήστε μαζί μας:",
        email: "hello@fomo.cy",
        address: "ΦΟΜΟ, Λευκωσία, Κύπρος",
      },
    },
    en: {
      title: "Terms of Service",
      lastUpdated: "Last updated: January 2026",
      intro: "Welcome to ΦΟΜΟ. By using our platform, you accept the following terms of use. Please read them carefully. Use of the platform implies full and unconditional acceptance of these terms.",
      sections: [
        {
          icon: FileText,
          title: "1. What is ΦΟΜΟ",
          content: "ΦΟΜΟ is a digital platform that connects users with businesses in Cyprus. Through our app, you can discover events, offers, make reservations, and buy tickets. The platform operates as an intermediary between users and businesses.",
        },
        {
          icon: Users,
          title: "2. Age Restrictions",
          content: "To use the ΦΟΜΟ platform:",
          items: [
            "You must be at least 16 years old to create an account",
            "For users under 18, parental/guardian consent is required",
            "Some events may have age restrictions (e.g., 18+, 21+)",
            "Businesses may request ID for age verification",
            "Providing false age information is a violation of terms of use",
          ],
        },
        {
          icon: Store,
          title: "3. Business Content",
          content: "Events, offers, tickets, and services displayed on the platform are provided by third-party businesses. ΦΟΜΟ operates as an intermediary and is not responsible for:",
          items: [
            "Availability and pricing of services",
            "Quality of provided services",
            "Accuracy of information provided by businesses",
            "Any changes or cancellations of events",
            "Fulfillment of promises or commitments by businesses",
          ],
        },
        {
          icon: Users,
          title: "4. Guest Access & Registration",
          content: "You can browse the platform as a guest with limited access. To get full access to all features, you must create an account.",
          items: [
            "Guests can view limited content",
            "Account required for reservations",
            "Account required for ticket purchases",
            "Account required for offer redemption and check-in",
            "You must provide accurate and truthful information during registration",
            "You are responsible for maintaining the confidentiality of your password",
          ],
        },
        {
          icon: CreditCard,
          title: "5. Payments & Refunds",
          content: "Payments for tickets and reservations are processed through secure third-party providers (Stripe):",
          items: [
            "Prices are displayed in Euros (€) and include VAT where applicable",
            "Any service fees are clearly stated before completion",
            "Refund policy depends on each business/event",
            "In case of event cancellation, refund is made by the business",
            "Cancellation policy: Up to 3 cancellations allowed. After 3 cancellations, 2-week restriction",
            "ΦΟΜΟ is not liable for delays in refunds",
          ],
        },
        {
          icon: QrCode,
          title: "6. QR Code Usage",
          content: "QR codes generated for tickets, offers, and check-in are unique and personal. It is prohibited to:",
          items: [
            "Copy or share QR codes",
            "Abuse the redemption system",
            "Engage in misleading use or fraud",
            "Resell tickets without authorization",
            "Use automated tools for redemption",
          ],
        },
        {
          icon: Ban,
          title: "7. Prohibited Conduct",
          content: "Use of the platform is strictly prohibited for:",
          items: [
            "Posting false, misleading, or offensive content",
            "Harassing other users or businesses",
            "Attempting to breach platform security",
            "Using bots, scrapers, or automated tools",
            "Copyright infringement",
            "Promoting illegal activities",
            "Spam or unsolicited messages",
          ],
        },
        {
          icon: AlertTriangle,
          title: "8. Business Responsibilities",
          content: "Businesses using the platform are solely responsible for:",
          items: [
            "Accuracy of information they submit",
            "Fulfilling their commitments to users",
            "Availability and pricing of their services",
            "Compliance with local legislation and regulations",
            "Safety of their premises",
            "Compliance with health regulations",
          ],
        },
        {
          icon: Shield,
          title: "9. ΦΟΜΟ's Rights",
          content: "ΦΟΜΟ reserves the right to:",
          items: [
            "Remove content that violates terms of use",
            "Suspend or terminate user or business accounts",
            "Modify platform functionality",
            "Update terms of use with prior notice",
            "Refuse services to anyone without explanation",
            "Investigate suspected abuse and take action",
          ],
        },
        {
          icon: UserX,
          title: "10. Limitation of Liability",
          content: "The ΦΟΜΟ platform is provided \"as is\". We do not guarantee:",
          items: [
            "Uninterrupted or error-free operation",
            "Accuracy or completeness of third-party content",
            "That the platform will meet your expectations",
            "Security from cyberattacks (although we take all measures)",
          ],
        },
        {
          icon: Globe,
          title: "11. Intellectual Property",
          content: "All ΦΟΜΟ platform content is protected:",
          items: [
            "The logo, name, and branding are registered trademarks",
            "Code, design, and functionality belong to ΦΟΜΟ",
            "Copying or reproduction without permission is prohibited",
            "Businesses retain rights to their own content",
            "Users grant license to use content they publish",
          ],
        },
        {
          icon: Gavel,
          title: "12. Governing Law & Dispute Resolution",
          content: "These terms are governed by the laws of the Republic of Cyprus:",
          items: [
            "Competent courts are the courts of Nicosia, Cyprus",
            "In case of dispute, we will first seek out-of-court resolution",
            "Users can file complaints through the platform",
            "EU GDPR Regulation applies to personal data",
          ],
        },
        {
          icon: Clock,
          title: "13. Duration & Termination",
          content: "These terms apply from the moment you use the platform:",
          items: [
            "You can delete your account at any time",
            "ΦΟΜΟ can terminate accounts for violations",
            "Some terms remain in effect after termination (e.g., intellectual property)",
            "Outstanding amounts must be paid before deletion",
          ],
        },
        {
          icon: Bell,
          title: "14. Notifications & Communication",
          content: "We communicate with you through:",
          items: [
            "Email to the address you provided",
            "Push notifications (if enabled)",
            "In-app messages",
            "For significant changes, you will be notified at least 14 days in advance",
          ],
        },
        {
          icon: Scale,
          title: "15. Changes to Terms",
          content: "These terms may be modified. In case of significant changes, you will be notified through the app or email at least 14 days before they take effect. Continued use of the platform after changes means acceptance of the new terms. If you disagree, you can delete your account.",
        },
      ],
      contact: {
        title: "Contact",
        content: "For questions about terms of use, contact us:",
        email: "hello@fomo.cy",
        address: "ΦΟΜΟ, Nicosia, Cyprus",
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
                <p className="text-muted-foreground mt-2 text-sm">
                  {content.contact.address}
                </p>
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