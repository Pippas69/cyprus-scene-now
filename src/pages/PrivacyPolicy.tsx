import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Database, Share2, UserCheck, Trash2, Mail, Globe, Shield, Clock, FileText, Eye, Bell, Users } from "lucide-react";

const PrivacyPolicy = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Πολιτική Απορρήτου",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Στο ΦΟΜΟ σεβόμαστε την ιδιωτικότητά σας και δεσμευόμαστε στην προστασία των προσωπικών σας δεδομένων. Αυτή η πολιτική εξηγεί ποια δεδομένα συλλέγουμε, πώς τα χρησιμοποιούμε, τη νομική βάση επεξεργασίας και ποια είναι τα δικαιώματά σας σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) της ΕΕ.",
      sections: [
        {
          icon: FileText,
          title: "1. Υπεύθυνος Επεξεργασίας",
          content: "Υπεύθυνος επεξεργασίας των προσωπικών σας δεδομένων είναι η εταιρεία ΦΟΜΟ με έδρα τη Λευκωσία, Κύπρος. Για οποιοδήποτε θέμα σχετικά με τα προσωπικά σας δεδομένα, μπορείτε να επικοινωνήσετε μαζί μας στο hello@fomo.cy.",
        },
        {
          icon: Database,
          title: "2. Ποια Δεδομένα Συλλέγουμε",
          content: "Συλλέγουμε δεδομένα που είναι απαραίτητα για τη λειτουργία της πλατφόρμας:",
          items: [
            "Στοιχεία λογαριασμού: email, όνομα, τηλέφωνο (προαιρετικά)",
            "Στοιχεία προφίλ: φωτογραφία, ηλικία (προαιρετικά), φοιτητική ιδιότητα",
            "Δεδομένα χρήσης: σελίδες που επισκέπτεστε, ενέργειες, χρόνος παραμονής",
            "Δεδομένα συναλλαγών: κρατήσεις, αγορές εισιτηρίων, ιστορικό πληρωμών",
            "Προτιμήσεις: αγαπημένα, ρυθμίσεις ειδοποιήσεων, γλώσσα",
            "Τεχνικά δεδομένα: διεύθυνση IP, τύπος συσκευής, browser, λειτουργικό σύστημα",
            "Δεδομένα τοποθεσίας: μόνο αν δώσετε άδεια, για εύρεση κοντινών εκδηλώσεων",
          ],
        },
        {
          icon: Eye,
          title: "3. Νομική Βάση Επεξεργασίας",
          content: "Επεξεργαζόμαστε τα δεδομένα σας βάσει:",
          items: [
            "Συγκατάθεση: όταν εγγράφεστε και αποδέχεστε την πολιτική απορρήτου",
            "Εκτέλεση σύμβασης: για την παροχή των υπηρεσιών μας (κρατήσεις, εισιτήρια)",
            "Έννομο συμφέρον: για βελτίωση υπηρεσιών, ασφάλεια, πρόληψη απάτης",
            "Νομική υποχρέωση: για τήρηση φορολογικής νομοθεσίας και άλλων κανονισμών",
          ],
        },
        {
          icon: Lock,
          title: "4. Πώς Χρησιμοποιούμε τα Δεδομένα",
          content: "Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:",
          items: [
            "Λειτουργία της πλατφόρμας και παροχή υπηρεσιών",
            "Διαχείριση κρατήσεων, εισιτηρίων και προσφορών",
            "Επικοινωνία για επιβεβαιώσεις και υπενθυμίσεις",
            "Αποστολή ειδοποιήσεων που έχετε επιλέξει",
            "Εξατομίκευση περιεχομένου και προτάσεων",
            "Βελτίωση της εμπειρίας χρήστη",
            "Ασφάλεια, πρόληψη απάτης και εντοπισμός κατάχρησης",
            "Συγκεντρωτικά analytics (ανώνυμα στατιστικά)",
            "Συμμόρφωση με νομικές υποχρεώσεις",
          ],
        },
        {
          icon: Share2,
          title: "5. Κοινοποίηση σε Τρίτους",
          content: "Κοινοποιούμε δεδομένα μόνο όταν είναι απαραίτητο:",
          items: [
            "Σε επιχειρήσεις: μόνο τα απαραίτητα στοιχεία για κρατήσεις (όνομα, αριθμός ατόμων, ώρα)",
            "Σε παρόχους πληρωμών (Stripe): για ασφαλείς συναλλαγές - δεν αποθηκεύουμε στοιχεία καρτών",
            "Σε τεχνικούς παρόχους: hosting, email, analytics (με συμβάσεις επεξεργασίας)",
            "Σε αρχές: μόνο εάν απαιτείται από το νόμο ή δικαστική απόφαση",
          ],
          note: "Τα analytics που παρέχουμε στις επιχειρήσεις είναι συγκεντρωτικά και δεν περιλαμβάνουν προσωπικά στοιχεία. Δεν πουλάμε ποτέ τα δεδομένα σας.",
        },
        {
          icon: Globe,
          title: "6. Διεθνείς Μεταφορές Δεδομένων",
          content: "Τα δεδομένα σας αποθηκεύονται σε servers εντός του Ευρωπαϊκού Οικονομικού Χώρου (ΕΟΧ). Σε περίπτωση μεταφοράς εκτός ΕΟΧ:",
          items: [
            "Χρησιμοποιούμε μόνο παρόχους με επαρκή εγγύηση προστασίας (π.χ. Standard Contractual Clauses)",
            "Διασφαλίζουμε συμμόρφωση με τον GDPR",
            "Μπορείτε να ζητήσετε πληροφορίες για τις εγγυήσεις που εφαρμόζονται",
          ],
        },
        {
          icon: Clock,
          title: "7. Χρόνος Διατήρησης Δεδομένων",
          content: "Διατηρούμε τα δεδομένα σας για όσο χρονικό διάστημα είναι απαραίτητο:",
          items: [
            "Δεδομένα λογαριασμού: μέχρι να διαγράψετε τον λογαριασμό σας",
            "Δεδομένα συναλλαγών: 6 χρόνια για φορολογικούς σκοπούς",
            "Δεδομένα χρήσης/analytics: 24 μήνες",
            "Logs ασφαλείας: 12 μήνες",
            "Μετά τη λήξη, τα δεδομένα διαγράφονται ή ανωνυμοποιούνται",
          ],
        },
        {
          icon: UserCheck,
          title: "8. Τα Δικαιώματά Σας (GDPR)",
          content: "Έχετε πλήρη έλεγχο των δεδομένων σας. Σύμφωνα με τον GDPR, έχετε δικαίωμα να:",
          items: [
            "Πρόσβαση: ζητήσετε αντίγραφο των δεδομένων σας",
            "Διόρθωση: διορθώσετε λανθασμένες πληροφορίες",
            "Διαγραφή (\"δικαίωμα στη λήθη\"): ζητήσετε διαγραφή των δεδομένων σας",
            "Περιορισμός: περιορίσετε την επεξεργασία σε ορισμένες περιπτώσεις",
            "Φορητότητα: λάβετε τα δεδομένα σας σε μηχαναγνώσιμη μορφή",
            "Εναντίωση: αντιταχθείτε στην επεξεργασία για marketing ή profilin",
            "Ανάκληση συγκατάθεσης: οποτεδήποτε, χωρίς επηρεασμό της νομιμότητας προηγούμενης επεξεργασίας",
          ],
          note: "Για να ασκήσετε τα δικαιώματά σας, επικοινωνήστε στο hello@fomo.cy. Θα απαντήσουμε εντός 30 ημερών.",
        },
        {
          icon: Bell,
          title: "9. Ειδοποιήσεις & Marketing",
          content: "Σχετικά με τις επικοινωνίες μας:",
          items: [
            "Transactional emails (επιβεβαιώσεις, υπενθυμίσεις): απαραίτητα για τις υπηρεσίες",
            "Marketing emails: μόνο με τη ρητή συγκατάθεσή σας",
            "Push notifications: μπορείτε να τις απενεργοποιήσετε ανά πάσα στιγμή",
            "Μπορείτε να διαχειριστείτε τις προτιμήσεις σας από τις ρυθμίσεις του λογαριασμού",
            "Κάθε marketing email περιέχει link απεγγραφής",
          ],
        },
        {
          icon: Trash2,
          title: "10. Διαγραφή Δεδομένων",
          content: "Μπορείτε να ζητήσετε διαγραφή του λογαριασμού σας ανά πάσα στιγμή. Η διαγραφή περιλαμβάνει:",
          items: [
            "Όλα τα προσωπικά στοιχεία",
            "Ιστορικό κρατήσεων και αγορών (πλην φορολογικών υποχρεώσεων)",
            "Αγαπημένα και προτιμήσεις",
            "Ρυθμίσεις ειδοποιήσεων",
            "Φωτογραφίες και περιεχόμενο που έχετε ανεβάσει",
          ],
          note: "Ορισμένα δεδομένα μπορεί να διατηρηθούν για νομικούς λόγους (π.χ. φορολογικά παραστατικά έως 6 χρόνια).",
        },
      ],
      security: {
        title: "11. Ασφάλεια Δεδομένων",
        content: "Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα για την προστασία των δεδομένων σας:",
        items: [
          "Κρυπτογράφηση SSL/TLS για όλες τις επικοινωνίες",
          "Κρυπτογράφηση δεδομένων σε αποθήκευση (at-rest encryption)",
          "Ασφαλή αποθήκευση σε πιστοποιημένα data centers (ISO 27001)",
          "Πρόσβαση μόνο σε εξουσιοδοτημένο προσωπικό με 2FA",
          "Τακτικούς ελέγχους ασφαλείας και penetration testing",
          "Εκπαίδευση προσωπικού σε θέματα ασφαλείας δεδομένων",
          "Διαδικασίες αντιμετώπισης περιστατικών παραβίασης",
        ],
      },
      breach: {
        title: "12. Ειδοποίηση Παραβίασης",
        content: "Σε περίπτωση παραβίασης δεδομένων που επηρεάζει τα δικαιώματά σας:",
        items: [
          "Θα ενημερώσουμε την αρμόδια εποπτική αρχή εντός 72 ωρών",
          "Θα σας ειδοποιήσουμε χωρίς αδικαιολόγητη καθυστέρηση αν ο κίνδυνος είναι υψηλός",
          "Θα λάβουμε όλα τα απαραίτητα μέτρα για τον περιορισμό της ζημίας",
        ],
      },
      children: {
        title: "13. Προστασία Ανηλίκων",
        content: "Η πλατφόρμα ΦΟΜΟ δεν απευθύνεται σε παιδιά κάτω των 16 ετών. Δεν συλλέγουμε εν γνώσει μας δεδομένα από ανήλικους χωρίς γονική συγκατάθεση. Αν ανακαλύψουμε τέτοια δεδομένα, θα τα διαγράψουμε άμεσα.",
      },
      contact: {
        title: "14. Επικοινωνία & Καταγγελίες",
        content: "Για ερωτήσεις, αιτήματα άσκησης δικαιωμάτων ή καταγγελίες:",
        email: "hello@fomo.cy",
        address: "ΦΟΜΟ, Λευκωσία, Κύπρος",
        supervisory: "Έχετε επίσης δικαίωμα να υποβάλετε καταγγελία στην Επίτροπο Προστασίας Δεδομένων Προσωπικού Χαρακτήρα Κύπρου (www.dataprotection.gov.cy).",
      },
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: January 2026",
      intro: "At ΦΟΜΟ we respect your privacy and are committed to protecting your personal data. This policy explains what data we collect, how we use it, the legal basis for processing, and your rights under the EU General Data Protection Regulation (GDPR).",
      sections: [
        {
          icon: FileText,
          title: "1. Data Controller",
          content: "The data controller for your personal data is ΦΟΜΟ, based in Nicosia, Cyprus. For any matters regarding your personal data, you can contact us at hello@fomo.cy.",
        },
        {
          icon: Database,
          title: "2. Data We Collect",
          content: "We collect data necessary for the platform to function:",
          items: [
            "Account details: email, name, phone (optional)",
            "Profile details: photo, age (optional), student status",
            "Usage data: pages visited, actions, time spent",
            "Transaction data: reservations, ticket purchases, payment history",
            "Preferences: favorites, notification settings, language",
            "Technical data: IP address, device type, browser, operating system",
            "Location data: only with your permission, to find nearby events",
          ],
        },
        {
          icon: Eye,
          title: "3. Legal Basis for Processing",
          content: "We process your data based on:",
          items: [
            "Consent: when you register and accept the privacy policy",
            "Contract performance: to provide our services (reservations, tickets)",
            "Legitimate interest: for service improvement, security, fraud prevention",
            "Legal obligation: for tax compliance and other regulations",
          ],
        },
        {
          icon: Lock,
          title: "4. How We Use Data",
          content: "Your data is used exclusively for:",
          items: [
            "Platform operation and service delivery",
            "Managing reservations, tickets, and offers",
            "Communication for confirmations and reminders",
            "Sending notifications you've opted into",
            "Content personalization and recommendations",
            "Improving user experience",
            "Security, fraud prevention, and abuse detection",
            "Aggregated analytics (anonymous statistics)",
            "Compliance with legal obligations",
          ],
        },
        {
          icon: Share2,
          title: "5. Sharing with Third Parties",
          content: "We share data only when necessary:",
          items: [
            "With businesses: only necessary details for reservations (name, party size, time)",
            "With payment providers (Stripe): for secure transactions - we don't store card details",
            "With technical providers: hosting, email, analytics (with processing agreements)",
            "With authorities: only if required by law or court order",
          ],
          note: "Analytics we provide to businesses are aggregated and do not include personal details. We never sell your data.",
        },
        {
          icon: Globe,
          title: "6. International Data Transfers",
          content: "Your data is stored on servers within the European Economic Area (EEA). In case of transfer outside the EEA:",
          items: [
            "We only use providers with adequate protection guarantees (e.g., Standard Contractual Clauses)",
            "We ensure GDPR compliance",
            "You can request information about the safeguards applied",
          ],
        },
        {
          icon: Clock,
          title: "7. Data Retention Period",
          content: "We retain your data for as long as necessary:",
          items: [
            "Account data: until you delete your account",
            "Transaction data: 6 years for tax purposes",
            "Usage/analytics data: 24 months",
            "Security logs: 12 months",
            "After expiration, data is deleted or anonymized",
          ],
        },
        {
          icon: UserCheck,
          title: "8. Your Rights (GDPR)",
          content: "You have full control of your data. Under GDPR, you have the right to:",
          items: [
            "Access: request a copy of your data",
            "Rectification: correct inaccurate information",
            "Erasure (\"right to be forgotten\"): request deletion of your data",
            "Restriction: restrict processing in certain cases",
            "Portability: receive your data in machine-readable format",
            "Object: oppose processing for marketing or profiling",
            "Withdraw consent: at any time, without affecting the lawfulness of prior processing",
          ],
          note: "To exercise your rights, contact hello@fomo.cy. We will respond within 30 days.",
        },
        {
          icon: Bell,
          title: "9. Notifications & Marketing",
          content: "Regarding our communications:",
          items: [
            "Transactional emails (confirmations, reminders): necessary for services",
            "Marketing emails: only with your explicit consent",
            "Push notifications: you can disable them at any time",
            "You can manage your preferences from account settings",
            "Every marketing email contains an unsubscribe link",
          ],
        },
        {
          icon: Trash2,
          title: "10. Data Deletion",
          content: "You can request deletion of your account at any time. Deletion includes:",
          items: [
            "All personal details",
            "Reservation and purchase history (except tax obligations)",
            "Favorites and preferences",
            "Notification settings",
            "Photos and content you've uploaded",
          ],
          note: "Some data may be retained for legal reasons (e.g., tax documents for up to 6 years).",
        },
      ],
      security: {
        title: "11. Data Security",
        content: "We implement technical and organizational measures to protect your data:",
        items: [
          "SSL/TLS encryption for all communications",
          "At-rest encryption for stored data",
          "Secure storage in certified data centers (ISO 27001)",
          "Access only to authorized personnel with 2FA",
          "Regular security audits and penetration testing",
          "Staff training on data security",
          "Breach incident response procedures",
        ],
      },
      breach: {
        title: "12. Breach Notification",
        content: "In case of a data breach affecting your rights:",
        items: [
          "We will notify the competent supervisory authority within 72 hours",
          "We will notify you without undue delay if the risk is high",
          "We will take all necessary measures to limit the damage",
        ],
      },
      children: {
        title: "13. Protection of Minors",
        content: "The ΦΟΜΟ platform is not directed at children under 16 years of age. We do not knowingly collect data from minors without parental consent. If we discover such data, we will delete it immediately.",
      },
      contact: {
        title: "14. Contact & Complaints",
        content: "For questions, rights requests, or complaints:",
        email: "hello@fomo.cy",
        address: "ΦΟΜΟ, Nicosia, Cyprus",
        supervisory: "You also have the right to file a complaint with the Commissioner for Personal Data Protection of Cyprus (www.dataprotection.gov.cy).",
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
                    <Shield className="w-5 h-5 text-accent" />
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

            {/* Breach Notification */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                      {content.breach.title}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {content.breach.content}
                    </p>
                    <ul className="space-y-2">
                      {content.breach.items.map((item, index) => (
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

            {/* Children */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                      {content.children.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {content.children.content}
                    </p>
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
                    <p className="text-muted-foreground mt-2 text-sm">
                      {content.contact.address}
                    </p>
                    <p className="text-muted-foreground mt-4 text-sm bg-muted/50 p-3 rounded-lg">
                      {content.contact.supervisory}
                    </p>
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