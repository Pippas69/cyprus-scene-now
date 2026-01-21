import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, Settings, BarChart3, Shield, Target, Clock, Globe, Mail } from "lucide-react";

const CookiesPolicy = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Πολιτική Cookies",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Αυτή η πολιτική εξηγεί πώς το ΦΟΜΟ χρησιμοποιεί cookies και παρόμοιες τεχνολογίες αποθήκευσης για να βελτιώσει την εμπειρία σας, σύμφωνα με τον Κανονισμό ePrivacy της ΕΕ και τον GDPR.",
      sections: [
        {
          icon: Cookie,
          title: "1. Τι είναι τα Cookies;",
          content: "Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας (υπολογιστή, τηλέφωνο, tablet) όταν επισκέπτεστε έναν ιστότοπο ή χρησιμοποιείτε μια εφαρμογή. Μας βοηθούν να θυμόμαστε τις προτιμήσεις σας, να κατανοούμε πώς χρησιμοποιείτε την πλατφόρμα και να βελτιώνουμε τις υπηρεσίες μας. Εκτός από cookies, χρησιμοποιούμε και παρόμοιες τεχνολογίες όπως local storage και session storage.",
        },
        {
          icon: Shield,
          title: "2. Απαραίτητα Cookies (Strictly Necessary)",
          content: "Αυτά τα cookies είναι απαραίτητα για τη λειτουργία της πλατφόρμας. Χωρίς αυτά, δεν θα μπορούσαμε να παρέχουμε βασικές λειτουργίες. Αυτά τα cookies δεν μπορούν να απενεργοποιηθούν.",
          items: [
            "Αυθεντικοποίηση χρήστη και διαχείριση session",
            "Διατήρηση σύνδεσης κατά την περιήγηση",
            "Προτιμήσεις γλώσσας (Ελληνικά/Αγγλικά)",
            "Ασφάλεια και προστασία από CSRF attacks",
            "Λειτουργία καλαθιού αγορών και checkout",
            "Αποθήκευση συγκατάθεσης cookies",
            "Load balancing και απόδοση server",
          ],
          note: "Νομική βάση: Έννομο συμφέρον - απαραίτητα για την παροχή της υπηρεσίας.",
        },
        {
          icon: BarChart3,
          title: "3. Cookies Απόδοσης & Analytics",
          content: "Αυτά τα cookies μας βοηθούν να κατανοούμε πώς χρησιμοποιείτε την πλατφόρμα. Συλλέγουν συγκεντρωτικά και ανώνυμα στατιστικά στοιχεία.",
          items: [
            "Ανάλυση επισκεψιμότητας σελίδων",
            "Μέτρηση χρόνου παραμονής και bounce rate",
            "Εντοπισμός τεχνικών προβλημάτων και σφαλμάτων",
            "Κατανόηση μοτίβων πλοήγησης",
            "Μέτρηση απόδοσης και ταχύτητας φόρτωσης",
            "A/B testing για βελτίωση εμπειρίας",
          ],
          note: "Νομική βάση: Συγκατάθεση - μπορείτε να τα απορρίψετε.",
        },
        {
          icon: Settings,
          title: "4. Cookies Λειτουργικότητας",
          content: "Αυτά τα cookies επιτρέπουν στην πλατφόρμα να θυμάται επιλογές που κάνετε και να παρέχει βελτιωμένες, προσωποποιημένες λειτουργίες.",
          items: [
            "Αποθήκευση προτιμήσεων εμφάνισης (dark/light mode)",
            "Θυμάται τις αγαπημένες σας τοποθεσίες και φίλτρα",
            "Αποθήκευση πρόσφατων αναζητήσεων",
            "Προσαρμογή περιεχομένου με βάση τα ενδιαφέροντά σας",
            "Βελτίωση εμπειρίας για επαναλαμβανόμενους επισκέπτες",
            "Αποθήκευση ρυθμίσεων ειδοποιήσεων",
          ],
          note: "Νομική βάση: Συγκατάθεση - μπορείτε να τα απορρίψετε.",
        },
        {
          icon: Target,
          title: "5. Cookies Marketing & Διαφήμισης",
          content: "Προς το παρόν, το ΦΟΜΟ ΔΕΝ χρησιμοποιεί cookies για σκοπούς στοχευμένης διαφήμισης ή remarketing. Αν αυτό αλλάξει στο μέλλον:",
          items: [
            "Θα σας ζητήσουμε ρητή συγκατάθεση πριν την ενεργοποίησή τους",
            "Θα ενημερώσουμε αυτή την πολιτική με λεπτομέρειες",
            "Θα μπορείτε να τα απορρίψετε χωρίς επίπτωση στη χρήση της πλατφόρμας",
          ],
        },
        {
          icon: Globe,
          title: "6. Cookies Τρίτων",
          content: "Ορισμένα cookies μπορεί να τοποθετούνται από τρίτους παρόχους υπηρεσιών:",
          items: [
            "Stripe: για ασφαλείς πληρωμές",
            "Supabase: για αυθεντικοποίηση και βάση δεδομένων",
            "Mapbox: για λειτουργίες χάρτη (εκδηλώσεις κοντά σας)",
          ],
          note: "Κάθε τρίτος πάροχος έχει τη δική του πολιτική cookies. Σας ενθαρρύνουμε να τις διαβάσετε.",
        },
        {
          icon: Clock,
          title: "7. Διάρκεια Ζωής Cookies",
          content: "Τα cookies που χρησιμοποιούμε έχουν διαφορετική διάρκεια:",
          items: [
            "Session cookies: διαγράφονται όταν κλείσετε τον browser",
            "Persistent cookies αυθεντικοποίησης: έως 30 ημέρες (ή μέχρι να αποσυνδεθείτε)",
            "Cookies προτιμήσεων: έως 12 μήνες",
            "Analytics cookies: έως 24 μήνες",
            "Συγκατάθεση cookies: 12 μήνες (μετά θα ερωτηθείτε ξανά)",
          ],
        },
      ],
      manage: {
        title: "8. Διαχείριση Cookies",
        content: "Έχετε πλήρη έλεγχο στα cookies που αποδέχεστε:",
        options: [
          "Cookie banner: Κατά την πρώτη επίσκεψη, μπορείτε να επιλέξετε ποια cookies αποδέχεστε",
          "Ρυθμίσεις εφαρμογής: Μπορείτε να αλλάξετε τις προτιμήσεις σας ανά πάσα στιγμή από τις ρυθμίσεις",
          "Ρυθμίσεις browser: Οι περισσότεροι browsers επιτρέπουν τη διαχείριση cookies",
        ],
        browsers: "Μέσω του browser μπορείτε να:",
        browserOptions: [
          "Δείτε ποια cookies έχουν αποθηκευτεί",
          "Διαγράψετε συγκεκριμένα ή όλα τα cookies",
          "Αποκλείσετε cookies από συγκεκριμένους ιστότοπους",
          "Αποκλείσετε cookies τρίτων (third-party cookies)",
          "Λάβετε ειδοποίηση πριν την αποθήκευση cookie",
          "Ενεργοποιήσετε λειτουργία \"Do Not Track\"",
        ],
        warning: "Σημείωση: Η απενεργοποίηση απαραίτητων cookies μπορεί να επηρεάσει τη λειτουργικότητα της πλατφόρμας (π.χ. δεν θα μπορείτε να συνδεθείτε).",
      },
      rights: {
        title: "9. Τα Δικαιώματά Σας",
        content: "Σύμφωνα με τον GDPR, έχετε το δικαίωμα να:",
        items: [
          "Ανακαλέσετε τη συγκατάθεσή σας για cookies ανά πάσα στιγμή",
          "Ζητήσετε πληροφορίες για τα cookies που χρησιμοποιούμε",
          "Υποβάλετε καταγγελία στην εποπτική αρχή",
        ],
      },
      updates: {
        title: "10. Ενημερώσεις Πολιτικής",
        content: "Μπορεί να ενημερώνουμε αυτή την πολιτική για να αντικατοπτρίζει αλλαγές στις πρακτικές μας ή για νομικούς λόγους. Η ημερομηνία \"Τελευταία ενημέρωση\" στην αρχή της σελίδας δείχνει πότε έγινε η πιο πρόσφατη αλλαγή. Για σημαντικές αλλαγές, θα σας ζητήσουμε ξανά τη συγκατάθεσή σας.",
      },
      contact: {
        title: "11. Επικοινωνία",
        content: "Για ερωτήσεις σχετικά με τη χρήση cookies ή για να ασκήσετε τα δικαιώματά σας:",
        email: "hello@fomo.cy",
        address: "ΦΟΜΟ, Λευκωσία, Κύπρος",
      },
    },
    en: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: January 2026",
      intro: "This policy explains how ΦΟΜΟ uses cookies and similar storage technologies to improve your experience, in accordance with the EU ePrivacy Regulation and GDPR.",
      sections: [
        {
          icon: Cookie,
          title: "1. What are Cookies?",
          content: "Cookies are small text files stored on your device (computer, phone, tablet) when you visit a website or use an app. They help us remember your preferences, understand how you use the platform, and improve our services. In addition to cookies, we also use similar technologies such as local storage and session storage.",
        },
        {
          icon: Shield,
          title: "2. Essential Cookies (Strictly Necessary)",
          content: "These cookies are necessary for the platform to function. Without them, we couldn't provide basic features. These cookies cannot be disabled.",
          items: [
            "User authentication and session management",
            "Maintaining login during browsing",
            "Language preferences (Greek/English)",
            "Security and CSRF attack protection",
            "Shopping cart and checkout functionality",
            "Cookie consent storage",
            "Load balancing and server performance",
          ],
          note: "Legal basis: Legitimate interest - necessary for service provision.",
        },
        {
          icon: BarChart3,
          title: "3. Performance & Analytics Cookies",
          content: "These cookies help us understand how you use the platform. They collect aggregated and anonymous statistics.",
          items: [
            "Page traffic analysis",
            "Time spent and bounce rate measurement",
            "Technical problem and error detection",
            "Understanding navigation patterns",
            "Performance and loading speed measurement",
            "A/B testing for experience improvement",
          ],
          note: "Legal basis: Consent - you can reject them.",
        },
        {
          icon: Settings,
          title: "4. Functionality Cookies",
          content: "These cookies allow the platform to remember choices you make and provide enhanced, personalized features.",
          items: [
            "Saving display preferences (dark/light mode)",
            "Remembering your favorite locations and filters",
            "Storing recent searches",
            "Customizing content based on your interests",
            "Improving experience for returning visitors",
            "Storing notification settings",
          ],
          note: "Legal basis: Consent - you can reject them.",
        },
        {
          icon: Target,
          title: "5. Marketing & Advertising Cookies",
          content: "Currently, ΦΟΜΟ does NOT use cookies for targeted advertising or remarketing purposes. If this changes in the future:",
          items: [
            "We will ask for your explicit consent before activating them",
            "We will update this policy with details",
            "You will be able to reject them without affecting platform use",
          ],
        },
        {
          icon: Globe,
          title: "6. Third-Party Cookies",
          content: "Some cookies may be placed by third-party service providers:",
          items: [
            "Stripe: for secure payments",
            "Supabase: for authentication and database",
            "Mapbox: for map features (events near you)",
          ],
          note: "Each third-party provider has their own cookie policy. We encourage you to read them.",
        },
        {
          icon: Clock,
          title: "7. Cookie Lifespan",
          content: "The cookies we use have different durations:",
          items: [
            "Session cookies: deleted when you close the browser",
            "Persistent authentication cookies: up to 30 days (or until logout)",
            "Preference cookies: up to 12 months",
            "Analytics cookies: up to 24 months",
            "Cookie consent: 12 months (then you'll be asked again)",
          ],
        },
      ],
      manage: {
        title: "8. Managing Cookies",
        content: "You have full control over the cookies you accept:",
        options: [
          "Cookie banner: On first visit, you can choose which cookies to accept",
          "App settings: You can change your preferences at any time from settings",
          "Browser settings: Most browsers allow cookie management",
        ],
        browsers: "Through your browser you can:",
        browserOptions: [
          "View which cookies have been stored",
          "Delete specific or all cookies",
          "Block cookies from specific websites",
          "Block third-party cookies",
          "Receive notification before a cookie is stored",
          "Enable \"Do Not Track\" mode",
        ],
        warning: "Note: Disabling essential cookies may affect platform functionality (e.g., you won't be able to log in).",
      },
      rights: {
        title: "9. Your Rights",
        content: "Under GDPR, you have the right to:",
        items: [
          "Withdraw your consent for cookies at any time",
          "Request information about the cookies we use",
          "File a complaint with the supervisory authority",
        ],
      },
      updates: {
        title: "10. Policy Updates",
        content: "We may update this policy to reflect changes in our practices or for legal reasons. The \"Last updated\" date at the top of the page shows when the most recent change was made. For significant changes, we will ask for your consent again.",
      },
      contact: {
        title: "11. Contact",
        content: "For questions about cookie usage or to exercise your rights:",
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

            {/* Manage Cookies */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  {content.manage.title}
                </h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {content.manage.content}
                </p>
                <ul className="space-y-2 mb-4">
                  {content.manage.options.map((option, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="text-accent mt-1.5">•</span>
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-foreground mb-3 font-medium">{content.manage.browsers}</p>
                <ul className="space-y-2 mb-4">
                  {content.manage.browserOptions.map((option, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="text-accent mt-1.5">•</span>
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  ⚠️ {content.manage.warning}
                </p>
              </CardContent>
            </Card>

            {/* Rights */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  {content.rights.title}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {content.rights.content}
                </p>
                <ul className="space-y-2">
                  {content.rights.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="text-accent mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Updates */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  {content.updates.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {content.updates.content}
                </p>
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

export default CookiesPolicy;