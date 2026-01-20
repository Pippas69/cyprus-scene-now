import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, Settings, BarChart3, Shield } from "lucide-react";

const CookiesPolicy = () => {
  const { language } = useLanguage();

  const t = {
    el: {
      title: "Πολιτική Cookies",
      lastUpdated: "Τελευταία ενημέρωση: Ιανουάριος 2026",
      intro: "Αυτή η σελίδα εξηγεί πώς το ΦΟΜΟ χρησιμοποιεί cookies και παρόμοιες τεχνολογίες για να βελτιώσει την εμπειρία σας.",
      sections: [
        {
          icon: Cookie,
          title: "Τι είναι τα Cookies;",
          content: "Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας όταν επισκέπτεστε έναν ιστότοπο ή χρησιμοποιείτε μια εφαρμογή. Μας βοηθούν να θυμόμαστε τις προτιμήσεις σας, να κατανοούμε πώς χρησιμοποιείτε την πλατφόρμα και να βελτιώνουμε τις υπηρεσίες μας.",
        },
        {
          icon: Shield,
          title: "Απαραίτητα Cookies",
          content: "Αυτά τα cookies είναι απαραίτητα για τη λειτουργία της πλατφόρμας. Χωρίς αυτά, δεν θα μπορούσαμε να παρέχουμε βασικές λειτουργίες όπως η σύνδεση στο λογαριασμό σας, η αποθήκευση των προτιμήσεων γλώσσας και η ασφάλεια της περιήγησής σας. Αυτά τα cookies δεν μπορούν να απενεργοποιηθούν.",
          items: [
            "Αυθεντικοποίηση χρήστη και διαχείριση session",
            "Προτιμήσεις γλώσσας (Ελληνικά/Αγγλικά)",
            "Ασφάλεια και προστασία από απάτη",
            "Λειτουργία καλαθιού αγορών και checkout",
          ],
        },
        {
          icon: BarChart3,
          title: "Cookies Απόδοσης",
          content: "Αυτά τα cookies μας βοηθούν να κατανοούμε πώς χρησιμοποιείτε την πλατφόρμα. Συλλέγουν συγκεντρωτικά στατιστικά στοιχεία για τη βελτίωση της εμπειρίας χρήσης.",
          items: [
            "Ανάλυση επισκεψιμότητας σελίδων",
            "Μέτρηση απόδοσης και ταχύτητας",
            "Εντοπισμός τεχνικών προβλημάτων",
            "Κατανόηση μοτίβων χρήσης",
          ],
        },
        {
          icon: Settings,
          title: "Cookies Λειτουργικότητας",
          content: "Αυτά τα cookies επιτρέπουν στην πλατφόρμα να θυμάται επιλογές που κάνετε και να παρέχει βελτιωμένες, προσωποποιημένες λειτουργίες.",
          items: [
            "Αποθήκευση προτιμήσεων εμφάνισης (dark/light mode)",
            "Θυμάται τις αγαπημένες σας τοποθεσίες",
            "Προσαρμογή περιεχομένου με βάση τα ενδιαφέροντά σας",
            "Βελτίωση εμπειρίας για επαναλαμβανόμενους επισκέπτες",
          ],
        },
      ],
      manage: {
        title: "Διαχείριση Cookies",
        content: "Μπορείτε να διαχειριστείτε τα cookies μέσω των ρυθμίσεων του browser σας. Σημειώστε ότι η απενεργοποίηση ορισμένων cookies μπορεί να επηρεάσει τη λειτουργικότητα της πλατφόρμας.",
        browsers: "Οι περισσότεροι browsers σας επιτρέπουν να:",
        options: [
          "Δείτε ποια cookies έχουν αποθηκευτεί",
          "Διαγράψετε συγκεκριμένα ή όλα τα cookies",
          "Αποκλείσετε cookies από συγκεκριμένους ιστότοπους",
          "Αποκλείσετε cookies τρίτων",
          "Λάβετε ειδοποίηση πριν την αποθήκευση cookie",
        ],
      },
      contact: {
        title: "Επικοινωνία",
        content: "Για ερωτήσεις σχετικά με τη χρήση cookies, επικοινωνήστε μαζί μας:",
        email: "hello@fomo.cy",
      },
    },
    en: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: January 2026",
      intro: "This page explains how ΦΟΜΟ uses cookies and similar technologies to improve your experience.",
      sections: [
        {
          icon: Cookie,
          title: "What are Cookies?",
          content: "Cookies are small text files stored on your device when you visit a website or use an app. They help us remember your preferences, understand how you use the platform, and improve our services.",
        },
        {
          icon: Shield,
          title: "Essential Cookies",
          content: "These cookies are necessary for the platform to function. Without them, we couldn't provide basic features like logging into your account, saving language preferences, and securing your browsing. These cookies cannot be disabled.",
          items: [
            "User authentication and session management",
            "Language preferences (Greek/English)",
            "Security and fraud protection",
            "Shopping cart and checkout functionality",
          ],
        },
        {
          icon: BarChart3,
          title: "Performance Cookies",
          content: "These cookies help us understand how you use the platform. They collect aggregated statistics to improve the user experience.",
          items: [
            "Page traffic analysis",
            "Performance and speed measurement",
            "Technical issue detection",
            "Understanding usage patterns",
          ],
        },
        {
          icon: Settings,
          title: "Functionality Cookies",
          content: "These cookies allow the platform to remember choices you make and provide enhanced, personalized features.",
          items: [
            "Saving display preferences (dark/light mode)",
            "Remembering your favorite locations",
            "Customizing content based on your interests",
            "Improving experience for returning visitors",
          ],
        },
      ],
      manage: {
        title: "Managing Cookies",
        content: "You can manage cookies through your browser settings. Note that disabling certain cookies may affect the functionality of the platform.",
        browsers: "Most browsers allow you to:",
        options: [
          "View which cookies have been stored",
          "Delete specific or all cookies",
          "Block cookies from specific websites",
          "Block third-party cookies",
          "Receive notification before a cookie is stored",
        ],
      },
      contact: {
        title: "Contact",
        content: "For questions about cookie usage, contact us:",
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

            {/* Manage Cookies */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                  {content.manage.title}
                </h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {content.manage.content}
                </p>
                <p className="text-foreground mb-3">{content.manage.browsers}</p>
                <ul className="space-y-2">
                  {content.manage.options.map((option, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="text-accent mt-1.5">•</span>
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

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

export default CookiesPolicy;
