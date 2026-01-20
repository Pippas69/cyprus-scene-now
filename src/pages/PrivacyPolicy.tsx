import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Database, Share2, UserCheck, Trash2, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Πολιτική Απορρήτου",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Στο ΦΟΜΟ σεβόμαστε την ιδιωτικότητά σας. Αυτή η πολιτική εξηγεί ποια δεδομένα συλλέγουμε, πώς τα χρησιμοποιούμε και ποια είναι τα δικαιώματά σας.",
      sections: [
        {
          icon: Database,
          title: "1. Ποια Δεδομένα Συλλέγουμε",
          content: "Συλλέγουμε δεδομένα που είναι απαραίτητα για τη λειτουργία της πλατφόρμας:",
          items: [
            "Στοιχεία λογαριασμού (email, όνομα, τηλέφωνο)",
            "Δεδομένα χρήσης (σελίδες που επισκέπτεστε, ενέργειες)",
            "Κρατήσεις και αγορές εισιτηρίων",
            "Προτιμήσεις και αγαπημένα",
            "Πληροφορίες συσκευής (για βελτιστοποίηση εμπειρίας)",
          ],
        },
        {
          icon: Lock,
          title: "2. Πώς Χρησιμοποιούμε τα Δεδομένα",
          content: "Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:",
          items: [
            "Λειτουργία της πλατφόρμας και παροχή υπηρεσιών",
            "Διαχείριση κρατήσεων και εισιτηρίων",
            "Αποστολή ειδοποιήσεων που έχετε επιλέξει",
            "Βελτίωση της εμπειρίας χρήστη",
            "Ασφάλεια και πρόληψη απάτης",
            "Συγκεντρωτικά analytics (ανώνυμα στατιστικά)",
          ],
        },
        {
          icon: Share2,
          title: "3. Κοινοποίηση σε Τρίτους",
          content: "Κοινοποιούμε δεδομένα μόνο όταν είναι απαραίτητο:",
          items: [
            "Σε επιχειρήσεις για την ολοκλήρωση κρατήσεων (μόνο τα απαραίτητα στοιχεία)",
            "Σε παρόχους πληρωμών (Stripe) για ασφαλείς συναλλαγές",
            "Σε τεχνικούς παρόχους που υποστηρίζουν τη λειτουργία μας",
            "Σε αρχές εάν απαιτείται από το νόμο",
          ],
          note: "Τα analytics που παρέχουμε στις επιχειρήσεις είναι συγκεντρωτικά και δεν περιλαμβάνουν προσωπικά στοιχεία.",
        },
        {
          icon: UserCheck,
          title: "4. Τα Δικαιώματά Σας",
          content: "Έχετε πλήρη έλεγχο των δεδομένων σας. Μπορείτε να:",
          items: [
            "Ζητήσετε πρόσβαση στα δεδομένα σας",
            "Διορθώσετε τυχόν λανθασμένες πληροφορίες",
            "Ζητήσετε διαγραφή του λογαριασμού σας",
            "Εξαγάγετε τα δεδομένα σας",
            "Αλλάξετε τις προτιμήσεις ειδοποιήσεων",
            "Αποσυνδέσετε συνδεδεμένες υπηρεσίες",
          ],
        },
        {
          icon: Trash2,
          title: "5. Διαγραφή Δεδομένων",
          content: "Μπορείτε να ζητήσετε διαγραφή του λογαριασμού σας ανά πάσα στιγμή. Η διαγραφή περιλαμβάνει:",
          items: [
            "Όλα τα προσωπικά στοιχεία",
            "Ιστορικό κρατήσεων και αγορών",
            "Αγαπημένα και προτιμήσεις",
            "Ρυθμίσεις ειδοποιήσεων",
          ],
          note: "Ορισμένα δεδομένα μπορεί να διατηρηθούν για νομικούς λόγους (π.χ. φορολογικά παραστατικά).",
        },
      ],
      security: {
        title: "6. Ασφάλεια Δεδομένων",
        content: "Προστατεύουμε τα δεδομένα σας με:",
        items: [
          "Κρυπτογράφηση SSL/TLS για όλες τις επικοινωνίες",
          "Ασφαλή αποθήκευση σε πιστοποιημένα data centers",
          "Περιορισμένη πρόσβαση μόνο σε εξουσιοδοτημένο προσωπικό",
          "Τακτικούς ελέγχους ασφαλείας",
        ],
      },
      contact: {
        title: "Επικοινωνία για Θέματα Απορρήτου",
        content: "Για ερωτήσεις, αιτήματα πρόσβασης ή διαγραφής δεδομένων:",
        email: "hello@fomo.cy",
      },
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: January 2026",
      intro: "At ΦΟΜΟ we respect your privacy. This policy explains what data we collect, how we use it, and what your rights are.",
      sections: [
        {
          icon: Database,
          title: "1. Data We Collect",
          content: "We collect data necessary for the platform to function:",
          items: [
            "Account details (email, name, phone)",
            "Usage data (pages visited, actions taken)",
            "Reservations and ticket purchases",
            "Preferences and favorites",
            "Device information (for experience optimization)",
          ],
        },
        {
          icon: Lock,
          title: "2. How We Use Data",
          content: "Your data is used exclusively for:",
          items: [
            "Platform operation and service delivery",
            "Managing reservations and tickets",
            "Sending notifications you've opted into",
            "Improving user experience",
            "Security and fraud prevention",
            "Aggregated analytics (anonymous statistics)",
          ],
        },
        {
          icon: Share2,
          title: "3. Sharing with Third Parties",
          content: "We share data only when necessary:",
          items: [
            "With businesses to complete reservations (only necessary details)",
            "With payment providers (Stripe) for secure transactions",
            "With technical providers that support our operations",
            "With authorities if required by law",
          ],
          note: "Analytics we provide to businesses are aggregated and do not include personal details.",
        },
        {
          icon: UserCheck,
          title: "4. Your Rights",
          content: "You have full control of your data. You can:",
          items: [
            "Request access to your data",
            "Correct any incorrect information",
            "Request deletion of your account",
            "Export your data",
            "Change notification preferences",
            "Disconnect linked services",
          ],
        },
        {
          icon: Trash2,
          title: "5. Data Deletion",
          content: "You can request deletion of your account at any time. Deletion includes:",
          items: [
            "All personal details",
            "Reservation and purchase history",
            "Favorites and preferences",
            "Notification settings",
          ],
          note: "Some data may be retained for legal reasons (e.g., tax documents).",
        },
      ],
      security: {
        title: "6. Data Security",
        content: "We protect your data with:",
        items: [
          "SSL/TLS encryption for all communications",
          "Secure storage in certified data centers",
          "Limited access only to authorized personnel",
          "Regular security audits",
        ],
      },
      contact: {
        title: "Contact for Privacy Matters",
        content: "For questions, access requests, or data deletion:",
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
                        <ul className="space-y-2 mb-4">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-2 text-foreground">
                              <span className="text-accent mt-1.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {"note" in section && section.note && (
                        <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg">
                          {section.note}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Security */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                      {content.security.title}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {content.security.content}
                    </p>
                    <ul className="space-y-2">
                      {content.security.items.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-foreground">
                          <span className="text-accent mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
