import { useNavigate } from "react-router-dom";
import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lock, Database, Share2, UserCheck, Trash2, Mail, Globe, Shield, Clock, 
  FileText, Eye, Bell, Users, ArrowLeft, Cookie, RefreshCw, Scale, 
  Building2, Fingerprint, MapPin, CreditCard, BarChart3, MessageSquare,
  AlertTriangle, BookOpen, UserX, Handshake, Server, ShieldCheck, Megaphone
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface Section {
  icon: any;
  title: string;
  content: string;
  items?: string[];
  note?: string;
  subsections?: { subtitle: string; content: string; items?: string[] }[];
}

// ─── Component ───────────────────────────────────────────────────────
const PrivacyPolicy = () => {
  const { language } = useLanguage();

  /* ================================================================
     ΕΛΛΗΝΙΚΑ
     ================================================================ */
  const el = {
    title: "Πολιτική Απορρήτου",
    lastUpdated: "Τελευταία ενημέρωση: Απρίλιος 2025",

    executive: {
      title: "Εκτελεστική Περίληψη",
      content: "Η παρούσα πολιτική περιγράφει τη βάση σύμφωνα με την οποία τα προσωπικά δεδομένα που συλλέγουμε από εσάς, ή που μας παρέχετε, θα υποβάλλονται σε επεξεργασία. Στο ΦOMO δεσμευόμαστε να καλλιεργούμε μια διαφανή και αξιόπιστη σχέση με τους χρήστες μας, θέτοντας τη διασφάλιση του απορρήτου σας στο επίκεντρο των αξιών μας. Αναγνωρίζουμε την αξία και την ευαισθησία των δεδομένων που μοιράζεστε μαζί μας κατά την αλληλεπίδρασή σας με τις υπηρεσίες μας, θεωρώντας αυτό θεμελιώδη ευθύνη και όχι απλά ζήτημα συμμόρφωσης.\n\nΓια να διευκρινίσουμε τις πρακτικές μας σχετικά με τη συλλογή, χρήση και προστασία των πληροφοριών σας, δημιουργήσαμε αυτήν την Πολιτική Απορρήτου, η οποία ισχύει για την ιστοσελίδα του ΦOMO, την εφαρμογή και τυχόν σχετικές διεπαφές.\n\nΣημειώνεται ότι η πλατφόρμα δεν απευθύνεται σε παιδιά κάτω των 16 ετών και δεν συλλέγουμε εν γνώσει μας δεδομένα ανηλίκων. Σας ενθαρρύνουμε να διαβάσετε και να κατανοήσετε τους ακόλουθους όρους πριν χρησιμοποιήσετε την πλατφόρμα μας, καθώς η ενημερωμένη συμμετοχή σας μάς επιτρέπει να δημιουργήσουμε ένα ασφαλές και αρμονικό περιβάλλον για όλους τους χρήστες.",
    },

    consent: {
      title: "Συγκατάθεση",
      content: "Βάσει της νομοθεσίας για την προστασία δεδομένων, υποχρεούμαστε να σας παρέχουμε ορισμένες πληροφορίες σχετικά με το ποιοι είμαστε, πώς επεξεργαζόμαστε τα προσωπικά σας δεδομένα, για ποιους σκοπούς και ποια είναι τα δικαιώματά σας. Οι πληροφορίες αυτές παρέχονται στην παρούσα Πολιτική Απορρήτου.\n\nΠριν τη χρήση της πλατφόρμας ΦOMO, συμφωνείτε στην επεξεργασία των προσωπικών σας δεδομένων (συμπεριλαμβανομένων του ονόματός σας, των στοιχείων επικοινωνίας και των πληροφοριών της συσκευής σας) όπως περιγράφεται στην παρούσα πολιτική.",
      withdraw: "Μόλις παρέχετε τη συγκατάθεσή σας, μπορείτε να αλλάξετε γνώμη και να αποσύρετε τη συγκατάθεσή σας ανά πάσα στιγμή επικοινωνώντας μαζί μας, αλλά αυτό δεν θα επηρεάσει τη νομιμότητα οποιασδήποτε επεξεργασίας πραγματοποιήθηκε πριν από την απόσυρση.",
      location: "Ενδέχεται να χρησιμοποιήσουμε τεχνολογία GPS για τον προσδιορισμό της τρέχουσας τοποθεσίας σας. Ορισμένες λειτουργίες μας που βασίζονται σε τοποθεσία απαιτούν τα προσωπικά σας δεδομένα. Εάν θέλετε να χρησιμοποιήσετε αυτές τις λειτουργίες, σας ζητάμε να δηλώσετε τη συγκατάθεσή σας. Μπορείτε να αποσύρετε τη συγκατάθεσή σας ανά πάσα στιγμή απενεργοποιώντας τα Δεδομένα Τοποθεσίας στις ρυθμίσεις της συσκευής σας.",
    },

    sections: [
      // ── 1. Εισαγωγή ──────────────────────────────────
      {
        icon: BookOpen,
        title: "1. Εισαγωγή",
        content: "",
        subsections: [
          {
            subtitle: "1.1. Σκοπός",
            content: "Η παρούσα πολιτική (μαζί με τους Όρους Χρήσης μας και τυχόν πρόσθετους όρους) εφαρμόζεται στη χρήση:",
            items: [
              "Της εφαρμογής ΦOMO, διαθέσιμης μέσω της ιστοσελίδας μας στη διεύθυνση fomo.com.cy, αφού έχετε αποκτήσει πρόσβαση μέσω του προγράμματος περιήγησης ή της συσκευής σας.",
              "Οποιωνδήποτε υπηρεσιών είναι προσβάσιμες μέσω της πλατφόρμας ΦOMO."
            ],
          },
          {
            subtitle: "1.2. Εύρος Εφαρμογής",
            content: "Η παρούσα Πολιτική Απορρήτου εφαρμόζεται στα Προσωπικά Δεδομένα που υποβάλλονται σε επεξεργασία από τo ΦOMO, συμπεριλαμβανομένης της ιστοσελίδας fomo.com.cy. Όλα τα πρόσωπα που είναι υπεύθυνα για την επεξεργασία Προσωπικών Δεδομένων για λογαριασμό του ΦOMO αναμένεται να προστατεύουν αυτά τα δεδομένα τηρώντας την παρούσα Πολιτική.",
          },
          {
            subtitle: "1.3. Νόμοι & Κανονισμοί",
            content: "Το ΦOMO συμμορφώνεται με όλους τους εφαρμοστέους τοπικούς νόμους, ιδίως αυτούς της ΕΕ και της Κύπρου, κατά την επεξεργασία Προσωπικών Δεδομένων (π.χ. ο Γενικός Κανονισμός Προστασίας Δεδομένων «GDPR»). Ειδικότερα, κάθε τοπική νομική προϋπόθεση ή περιορισμός για τη μεταφορά Προσωπικών Δεδομένων θα τηρείται.",
          },
        ],
      },

      // ── 1.4 Βασικοί Ορισμοί ──────────────────────────
      {
        icon: Scale,
        title: "1.4. Βασικοί Ορισμοί",
        content: "Παρακάτω ακολουθεί λίστα με τους βασικούς ορισμούς που χρησιμοποιούνται στην παρούσα πολιτική:",
        items: [
          "Ανωνυμοποίηση: Η διαδικασία μετατροπής προσωπικών δεδομένων ώστε το υποκείμενο να μην είναι πλέον ταυτοποιήσιμο, άμεσα ή έμμεσα. Τα ανωνυμοποιημένα δεδομένα δεν εμπίπτουν στο πεδίο εφαρμογής του GDPR.",
          "Χρήστες Εφαρμογής: Τελικοί χρήστες που χρησιμοποιούν την πλατφόρμα για περιήγηση, κρατήσεις, αγορά εισιτηρίων και εξαργύρωση προσφορών.",
          "Δεσμευτικοί Εταιρικοί Κανόνες (BCR): Πολιτικές προστασίας δεδομένων που τηρούνται από υπεύθυνο ή εκτελούντα επεξεργασίας εντός ομίλου επιχειρήσεων για διασυνοριακές μεταφορές.",
          "Συμμόρφωση (με νομικές υποχρεώσεις): Επεξεργασία δεδομένων όπου είναι αναγκαίο για τη συμμόρφωση με νομική υποχρέωση.",
          "Συγκατάθεση: Κάθε ελεύθερα παρεχόμενη, συγκεκριμένη, ενημερωμένη και αδιαμφισβήτητη ένδειξη της βούλησης του υποκειμένου των δεδομένων.",
          "Υπεύθυνος Επεξεργασίας: Το φυσικό ή νομικό πρόσωπο που καθορίζει τους σκοπούς και τα μέσα επεξεργασίας προσωπικών δεδομένων.",
          "Εκτελών την Επεξεργασία: Φυσικό ή νομικό πρόσωπο που επεξεργάζεται δεδομένα για λογαριασμό του υπεύθυνου επεξεργασίας.",
          "Υποκείμενο Δεδομένων: Ταυτοποιημένο ή ταυτοποιήσιμο φυσικό πρόσωπο.",
          "Προσωπικά Δεδομένα: Κάθε πληροφορία που αφορά ταυτοποιημένο ή ταυτοποιήσιμο φυσικό πρόσωπο — συμπεριλαμβανομένων ονόματος, αριθμού ταυτότητας, δεδομένων τοποθεσίας, αναγνωριστικού online ή παραγόντων ειδικών της φυσικής, γενετικής, ψυχικής, οικονομικής, πολιτιστικής ή κοινωνικής ταυτότητας.",
          "Παραβίαση Προσωπικών Δεδομένων: Παράβαση ασφαλείας που οδηγεί σε τυχαία ή παράνομη καταστροφή, απώλεια, αλλοίωση, μη εξουσιοδοτημένη κοινοποίηση ή πρόσβαση σε προσωπικά δεδομένα.",
          "Επεξεργασία: Κάθε πράξη ή σύνολο πράξεων που εκτελείται σε προσωπικά δεδομένα, όπως συλλογή, καταχώρηση, οργάνωση, αποθήκευση, προσαρμογή, ανάκτηση, χρήση, κοινοποίηση, διαγραφή ή καταστροφή.",
          "Κατάρτιση Προφίλ: Κάθε μορφή αυτοματοποιημένης επεξεργασίας που αξιολογεί προσωπικές πτυχές ενός φυσικού προσώπου, ιδίως για ανάλυση ή πρόβλεψη προτιμήσεων, συμπεριφοράς ή τοποθεσίας.",
          "Ευαίσθητα Δεδομένα: Υποσύνολο Προσωπικών Δεδομένων που απαιτούν πρόσθετη προστασία, συμπεριλαμβανομένων φυλετικής/εθνοτικής καταγωγής, πολιτικών πεποιθήσεων, θρησκευτικών πεποιθήσεων, γενετικών/βιομετρικών δεδομένων, δεδομένων υγείας και σεξουαλικού προσανατολισμού.",
          "Τυποποιημένες Συμβατικές Ρήτρες (SCC): Νομικά εργαλεία που θεσπίστηκαν από την Ευρωπαϊκή Επιτροπή για τη διασφάλιση επαρκούς προστασίας κατά τη μεταφορά δεδομένων εκτός ΕΟΧ.",
          "Επιχειρήσεις/Διοργανωτές: Οντότητες ή πρόσωπα που παρέχουν χώρους εκδηλώσεων και χρησιμοποιούν την πλατφόρμα ΦOMO για τη διαχείριση κρατήσεων, εισιτηρίων, προσφορών και εκδηλώσεων.",
          "Έννομο Συμφέρον: Το συμφέρον της επιχείρησής μας στη διεξαγωγή και διαχείριση δραστηριοτήτων ώστε να σας παρέχουμε την καλύτερη υπηρεσία. Εξισορροπούμε πάντα τον πιθανό αντίκτυπο στα δικαιώματά σας.",
          "Εκτέλεση Σύμβασης: Επεξεργασία δεδομένων αναγκαία για την εκτέλεση σύμβασης στην οποία είστε συμβαλλόμενο μέρος.",
        ],
      },

      // ── 2. Πολιτική Απορρήτου — Χρήστες Εφαρμογής ──
      {
        icon: Users,
        title: "2. Πολιτική Απορρήτου — Χρήστες Εφαρμογής",
        content: "",
        subsections: [
          {
            subtitle: "2.1. Ποιοι Είμαστε",
            content: "Το ΦOMO, με έδρα τη Λευκωσία, Κύπρο, αναφερόμενο ως «η εταιρεία», «ΦOMO», «εμείς», «μας», είναι ο υπεύθυνος επεξεργασίας δεδομένων για τα προσωπικά σας δεδομένα που συλλέγονται μέσω της πλατφόρμας ΦOMO και των συναφών υπηρεσιών της (συλλογικά η «Πλατφόρμα»). Η παρούσα Πολιτική Απορρήτου & Cookies περιγράφει τους τύπους προσωπικών δεδομένων που ενδέχεται να συλλέξουμε και τον τρόπο διαχείρισής τους.",
          },
          {
            subtitle: "2.2. Ποια Προσωπικά Δεδομένα Συλλέγουμε",
            content: "Ενδέχεται να συλλέξουμε, χρησιμοποιήσουμε, αποθηκεύσουμε και μεταφέρουμε τις ακόλουθες κατηγορίες δεδομένων:",
            items: [
              "Δεδομένα Ταυτότητας: Ονοματεπώνυμο, ψευδώνυμο χρήστη ή παρόμοιο αναγνωριστικό, ημερομηνία γέννησης.",
              "Δεδομένα Επικοινωνίας: Διεύθυνση email, αριθμοί τηλεφώνων.",
              "Οικονομικά Δεδομένα: Στοιχεία τραπεζικών λογαριασμών και πληρωμών (αποθηκεύονται αποκλειστικά στον πάροχο πληρωμών Stripe — εμείς δεν τα βλέπουμε ούτε τα αποθηκεύουμε).",
              "Δεδομένα Συναλλαγών: Λεπτομέρειες πληρωμών, αγορών εισιτηρίων, κρατήσεων και προσφορών.",
              "Τεχνικά Δεδομένα: Διεύθυνση IP, δεδομένα σύνδεσης, τύπος και έκδοση browser.",
              "Δεδομένα Συσκευής: Τύπος κινητής συσκευής, μοναδικό αναγνωριστικό, λειτουργικό σύστημα, ζώνη ώρας.",
              "Δεδομένα Προφίλ: Στοιχεία σύνδεσης (email), ιστορικό αγορών εντός εφαρμογής, ενδιαφέροντα, προτιμήσεις, φοιτητική ιδιότητα.",
              "Δεδομένα Χρήσης: Πληροφορίες σχετικά με τον τρόπο που χρησιμοποιείτε την πλατφόρμα.",
              "Δεδομένα Μάρκετινγκ & Επικοινωνίας: Προτιμήσεις λήψης μάρκετινγκ.",
              "Δεδομένα Τοποθεσίας: Η τρέχουσα τοποθεσία σας μέσω GPS ή άλλης τεχνολογίας (μόνο με τη συγκατάθεσή σας).",
            ],
          },
        ],
        note: "Συλλέγουμε και μοιραζόμαστε Συγκεντρωτικά Δεδομένα (π.χ. στατιστικά ή δημογραφικά) για οποιονδήποτε σκοπό. Τα Συγκεντρωτικά Δεδομένα δεν θεωρούνται νομικά προσωπικά δεδομένα, εκτός εάν συνδυαστούν με τα προσωπικά σας δεδομένα.\n\nΓια πληρωμές χρησιμοποιούμε τρίτο πάροχο υπηρεσιών πληρωμών (Stripe) ο οποίος είναι άμεσα υπεύθυνος για τη συλλογή και επεξεργασία των οικονομικών σας δεδομένων. Εμείς δεν συλλέγουμε ούτε επεξεργαζόμαστε άμεσα οικονομικά δεδομένα.\n\nΔεν συλλέγουμε ειδικές κατηγορίες προσωπικών δεδομένων (ευαίσθητα δεδομένα όπως φυλετική ή εθνοτική καταγωγή, θρησκευτικές πεποιθήσεις, σεξουαλικός προσανατολισμός, δεδομένα υγείας, γενετικά/βιομετρικά δεδομένα). Δεν συλλέγουμε πληροφορίες για ποινικές καταδίκες.",
      },

      // ── 2.3 Πώς Συλλέγουμε Δεδομένα ─────────────────
      {
        icon: Database,
        title: "2.3. Πώς Συλλέγουμε τα Προσωπικά Σας Δεδομένα",
        content: "Συλλέγουμε τα προσωπικά σας δεδομένα μέσω:",
        items: [
          "Πληροφορίες που μας δίνετε: Κατά τη δημιουργία λογαριασμού, κράτηση, αγορά εισιτηρίου, εξαργύρωση προσφοράς, μεταφορά εισιτηρίου, συμμετοχή σε διαγωνισμό ή επικοινωνία μαζί μας.",
          "Πληροφορίες που συλλέγουμε αυτόματα: Κάθε φορά που επισκέπτεστε την πλατφόρμα, συλλέγουμε αυτόματα Δεδομένα Συσκευής, Χρήσης και Τεχνικά Δεδομένα μέσω cookies και παρόμοιων τεχνολογιών.",
          "Δεδομένα Τοποθεσίας: Μέσω GPS για λειτουργίες που βασίζονται στην τοποθεσία (μόνο με τη συγκατάθεσή σας). Μπορείτε να αποσύρετε τη συγκατάθεση απενεργοποιώντας τα Δεδομένα Τοποθεσίας.",
          "Τρίτες πηγές: Υπηρεσίες όπως Apple, Google ή Facebook ενδέχεται να μας παρέχουν email, ονοματεπώνυμο και άλλα δεδομένα. Πάροχοι analytics (π.χ. Google Analytics) ενδέχεται να μας παρέχουν Δεδομένα Συσκευής.",
        ],
      },

      // ── 2.4 Σκοποί Επεξεργασίας ─────────────────────
      {
        icon: Eye,
        title: "2.4. Σκοποί Επεξεργασίας",
        content: "",
        subsections: [
          {
            subtitle: "2.4.1. Νομικές Βάσεις",
            content: "Θα χρησιμοποιήσουμε τα δεδομένα σας μόνο όταν ο νόμος μας το επιτρέπει, σύμφωνα με τις ακόλουθες νομικές βάσεις του GDPR:",
            items: [
              "Συγκατάθεση: Όταν έχετε συναινέσει πριν από την επεξεργασία (Άρθρο 6(α), GDPR).",
              "Εκτέλεση σύμβασης: Όταν η επεξεργασία είναι αναγκαία για σύμβαση (Άρθρο 6(β), GDPR).",
              "Νομική υποχρέωση: Για συμμόρφωση με νομική ή κανονιστική υποχρέωση (Άρθρο 6(γ), GDPR).",
              "Έννομο συμφέρον: Όταν είναι αναγκαίο για τα συμφέροντά μας (ή τρίτων) χωρίς υπέρβαση των δικαιωμάτων σας (Άρθρο 6(στ), GDPR).",
            ],
          },
          {
            subtitle: "2.4.2. Μάρκετινγκ & Επικοινωνίες",
            content: "Θα σας στέλνουμε απευθείας μηνύματα μάρκετινγκ μέσω email, push notifications και εντός εφαρμογής βάσει της ρητής συγκατάθεσής σας κατά την εγγραφή.",
            items: [
              "Επιλέγοντας το πλαίσιο συγκατάθεσης κατά την εγγραφή, συμφωνείτε να λαμβάνετε μηνύματα μάρκετινγκ απευθείας από το ΦOMO, συμπεριλαμβανομένων ενημερώσεων εκδηλώσεων, προωθητικών ενεργειών χώρων και αποκλειστικών προσφορών.",
              "Μπορείτε να εξαιρεθείτε ανά πάσα στιγμή κάνοντας κλικ στο «απεγγραφή» σε οποιοδήποτε email ή επικοινωνώντας μαζί μας.",
              "Οι Επιχειρήσεις/Διοργανωτές πρέπει να αποκτήσουν ξεχωριστή ρητή συγκατάθεση πριν σας στείλουν δικά τους μηνύματα μάρκετινγκ.",
              "Μπορείτε να αποσύρετε τη συγκατάθεσή σας για μάρκετινγκ τρίτων ανά πάσα στιγμή μέσω των παρεχόμενων επιλογών απεγγραφής.",
            ],
          },
          {
            subtitle: "2.4.3. Εξαίρεση από Μάρκετινγκ",
            content: "Για να απεγγραφείτε από emails μάρκετινγκ, κάντε κλικ στον σύνδεσμο απεγγραφής στο τέλος κάθε email. Σημειώστε ότι η εξαίρεση από το μάρκετινγκ δεν αποκλείει τα transactional emails (επιβεβαιώσεις κρατήσεων, αλλαγές εκδηλώσεων κ.λπ.).",
          },
          {
            subtitle: "2.4.4. Κατάρτιση Προφίλ (Profiling)",
            content: "Η εφαρμογή πραγματοποιεί κατάρτιση προφίλ ατομικών και δημογραφικών τάσεων βάσει εκδηλώσεων/χώρων που έχετε παρακολουθήσει ή εκδηλώσει ενδιαφέρον, με τη συγκατάθεσή σας. Αυτό μας βοηθά να παρέχουμε εξατομικευμένες προτάσεις. Η συμμετοχή σας είναι εθελοντική και μπορείτε να αποσύρετε τη συγκατάθεσή σας ανά πάσα στιγμή.",
          },
        ],
      },

      // ── 2.5 Μεταφορές Δεδομένων ─────────────────────
      {
        icon: Globe,
        title: "2.5. Μεταφορές Δεδομένων",
        content: "",
        subsections: [
          {
            subtitle: "2.5.1. Κοινοποιήσεις",
            content: "Ενδέχεται να κοινοποιήσουμε τα δεδομένα σας σε τρίτους στις ακόλουθες περιπτώσεις:",
            items: [
              "Σε Εσωτερικούς Τρίτους εντός του ομίλου ΦOMO.",
              "Σε Εξωτερικούς Τρίτους: παρόχους IT και διαχείρισης συστημάτων, επαγγελματίες συμβούλους (νομικούς, λογιστές), φορολογικές αρχές Κύπρου και άλλες αρχές.",
              "Εάν πουλήσουμε ή αγοράσουμε επιχειρήσεις/περιουσιακά στοιχεία.",
              "Εάν υποχρεούμαστε νομικά να κοινοποιήσουμε δεδομένα ή εάν μας ζητηθεί από νόμιμη αρχή.",
              "Σε Επιχειρήσεις: μόνο τα απαραίτητα στοιχεία κράτησης (όνομα, μέγεθος παρέας, ώρα).",
              "Σε παρόχους analytics και μηχανών αναζήτησης.",
            ],
          },
          {
            subtitle: "2.5.2. Διεθνείς Μεταφορές",
            content: "Πολλοί τρίτοι εδρεύουν εκτός Κύπρου/ΕΕ. Όποτε μεταφέρουμε δεδομένα εκτός ΕΕ, διασφαλίζουμε επαρκή προστασία μέσω:",
            items: [
              "Μεταφοράς μόνο σε χώρες με επαρκές επίπεδο προστασίας.",
              "Χρήσης ειδικών συμβάσεων (Δεσμευτικοί Εταιρικοί Κανόνες / Τυποποιημένες Συμβατικές Ρήτρες) εγκεκριμένων από την ΕΕ.",
            ],
          },
        ],
      },

      // ── 2.6 Διατήρηση Δεδομένων ─────────────────────
      {
        icon: Clock,
        title: "2.6. Διατήρηση Δεδομένων",
        content: "Διατηρούμε τα προσωπικά σας δεδομένα μόνο για όσο χρειάζεται:",
        items: [
          "Δεδομένα Ταυτότητας, Επικοινωνίας, Συναλλαγών και Οικονομικά: 6 χρόνια (φορολογικοί σκοποί).",
          "Αδρανής λογαριασμός (2 χρόνια): ο λογαριασμός θεωρείται ληγμένος και τα δεδομένα ενδέχεται να διαγραφούν.",
          "Δεδομένα χρήσης/analytics: 24 μήνες.",
          "Logs ασφαλείας: 12 μήνες.",
          "Ορισμένα δεδομένα μπορεί να ανωνυμοποιηθούν για ερευνητικούς/στατιστικούς σκοπούς χωρίς περαιτέρω ειδοποίηση.",
        ],
        note: "Τα υποκείμενα δεδομένων έχουν δικαίωμα να ζητήσουν διαγραφή, εφόσον τα δεδομένα δεν απαιτούνται για νομικές υποχρεώσεις ή συμβατικές δεσμεύσεις.",
      },

      // ── 2.7 Σύνδεσμοι Τρίτων ────────────────────────
      {
        icon: Share2,
        title: "2.7. Σύνδεσμοι σε Ιστοσελίδες Τρίτων",
        content: "Η πλατφόρμα μας ενδέχεται περιστασιακά να περιλαμβάνει συνδέσμους σε ιστοσελίδες συνεργατών, διαφημιστών και θυγατρικών, οι οποίες έχουν τις δικές τους πολιτικές απορρήτου. Δεν αποδεχόμαστε καμία ευθύνη για αυτές τις πολιτικές. Σας ενθαρρύνουμε να τις εξετάσετε πριν υποβάλετε δεδομένα.\n\nΕπιπλέον, το ΦOMO ενδέχεται να εμφανίσει εκδηλώσεις ή χώρους για τους οποίους δεν παρέχει υπηρεσίες εισιτηρίων/κρατήσεων. Εάν ανακατευθυνθείτε σε εξωτερική ιστοσελίδα, η συναλλαγή είναι αποκλειστικά μεταξύ εσάς και του εξωτερικού παρόχου.",
      },

      // ── 2.8 Δικαιώματα Υποκειμένων ──────────────────
      {
        icon: UserCheck,
        title: "2.8. Δικαιώματα Υποκειμένων Δεδομένων",
        content: "Σύμφωνα με τον GDPR, έχετε τα ακόλουθα δικαιώματα:",
        items: [
          "Δικαίωμα ενημέρωσης: Να γνωρίζετε ποια δεδομένα συλλέγονται, γιατί, από ποιον, για πόσο χρονικό διάστημα και αν υπάρχει κοινοποίηση σε τρίτους.",
          "Δικαίωμα πρόσβασης: Να ζητήσετε αντίγραφο των δεδομένων σας.",
          "Δικαίωμα διόρθωσης: Να διορθώσετε ανακριβή ή ελλιπή δεδομένα.",
          "Δικαίωμα διαγραφής (\"δικαίωμα στη λήθη\"): Να ζητήσετε τη διαγραφή δεδομένων που δεν υπάρχει νόμιμος λόγος να διατηρούνται.",
          "Δικαίωμα περιορισμού: Να ζητήσετε αναστολή επεξεργασίας (π.χ. για επαλήθευση ακρίβειας ή αν η χρήση είναι παράνομη).",
          "Δικαίωμα φορητότητας: Να λάβετε τα δεδομένα σας σε δομημένο, μηχαναγνώσιμο μορφότυπο.",
          "Δικαίωμα εναντίωσης: Να αντιταχθείτε στην επεξεργασία για marketing ή profiling.",
          "Δικαιώματα σχετικά με αυτοματοποιημένη λήψη αποφάσεων και profiling.",
          "Δικαίωμα ανάκλησης συγκατάθεσης: Ανά πάσα στιγμή, χωρίς επηρεασμό της νομιμότητας προηγούμενης επεξεργασίας.",
        ],
        note: "Για να ασκήσετε τα δικαιώματά σας, επικοινωνήστε στο support@fomocy.com. Έχετε επίσης δικαίωμα καταγγελίας στην Επίτροπο Προστασίας Δεδομένων Κύπρου:\n\nΕπίτροπος Προστασίας Δεδομένων\nΚυπρανόρος 15, 1061 Λευκωσία\nΤ.Θ. 23378, 1682 Λευκωσία\nΤηλ: +35722818456\nFax: +35722304565\nEmail: commissioner@dataprotection.gov.cy",
      },

      // ── 2.9 Ασφάλεια ────────────────────────────────
      {
        icon: Shield,
        title: "2.9. Ασφάλεια Δεδομένων",
        content: "Εφαρμόζουμε κατάλληλα μέτρα ασφαλείας για την αποφυγή τυχαίας απώλειας, μη εξουσιοδοτημένης πρόσβασης, αλλοίωσης ή κοινοποίησης:",
        items: [
          "Εφαρμόζουμε την αρχή \"Need-to-Know\" — πρόσβαση μόνο σε προσωπικό με νόμιμη επιχειρησιακή ανάγκη.",
          "Κρυπτογράφηση SSL/TLS για όλες τις επικοινωνίες.",
          "Κρυπτογράφηση δεδομένων σε αποθήκευση (at-rest encryption).",
          "Αξιολογήσεις Κινδύνου και Εκτιμήσεις Επιπτώσεων Προστασίας Δεδομένων (DPIA).",
          "Τείχη προστασίας, συστήματα ανίχνευσης εισβολών και τακτικοί έλεγχοι ασφαλείας.",
          "Κρυπτογράφηση πληρωμών μέσω SSL ή ισοδύναμης τεχνολογίας.",
          "Τακτική εκπαίδευση προσωπικού σε θέματα ασφαλείας.",
          "Είστε υπεύθυνοι για τη μυστικότητα του κωδικού πρόσβασής σας.",
        ],
        note: "Αν και λαμβάνουμε όλα τα εύλογα μέτρα, δεν μπορούμε να εγγυηθούμε ότι δεν θα συμβεί ποτέ παραβίαση κυβερνοασφάλειας. Σε περίπτωση παραβίασης θα ενημερώσουμε τους επηρεαζόμενους χρήστες εντός 72 ωρών και θα συμμορφωθούμε με τις κανονιστικές υποχρεώσεις ειδοποίησης.",
      },

      // ── 2.10 Cookies ────────────────────────────────
      {
        icon: Cookie,
        title: "2.10. Cookies",
        content: "Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες παρακολούθησης. Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας. Το ΦOMO χρησιμοποιεί cookies για απομνημόνευση ρυθμίσεων (π.χ. γλώσσα), ταυτοποίηση και analytics. Ενδέχεται να χρησιμοποιούμε αξιόπιστες υπηρεσίες τρίτων (π.χ. Google Analytics) — τα δεδομένα ανωνυμοποιούνται.",
        items: [
          "Cookies Συνεδρίας: Προσωρινά, διαγράφονται όταν κλείσετε τον browser.",
          "Μόνιμα Cookies: Παραμένουν στη συσκευή σας για καθορισμένο χρονικό διάστημα.",
          "Απαραίτητα Cookies: Αναγκαία για τη λειτουργία της πλατφόρμας.",
          "Cookies Απόδοσης: Βοηθούν στην κατανόηση της αλληλεπίδρασης χρηστών.",
          "Cookies Λειτουργικότητας: Βελτιώνουν λειτουργικότητα και εξατομίκευση.",
          "Cookies Διαφήμισης: Κάνουν τα διαφημιστικά μηνύματα πιο σχετικά.",
        ],
        note: "Μπορείτε να ρυθμίσετε τον browser σας ώστε να σας προειδοποιεί ή να απενεργοποιεί τα cookies. Η απενεργοποίηση ορισμένων cookies μπορεί να περιορίσει τη λειτουργικότητα.",
      },

      // ── 2.11 Αλλαγές Πολιτικής ──────────────────────
      {
        icon: RefreshCw,
        title: "2.11. Αλλαγές στην Πολιτική Απορρήτου",
        content: "Επανεξετάζουμε τακτικά την πολιτική απορρήτου μας, με την πιο πρόσφατη ενημέρωση στις 06/04/2025. Αλλαγές θα δημοσιεύονται σε αυτήν τη σελίδα. Για ουσιαστικές αλλαγές θα σας ειδοποιήσουμε μέσω email ή ειδοποίησης εντός εφαρμογής. Σας ενθαρρύνουμε να ελέγχετε περιοδικά αυτήν τη σελίδα.",
      },

      // ── 2.12 Συμμόρφωση ─────────────────────────────
      {
        icon: ShieldCheck,
        title: "2.12. Συμμόρφωση",
        content: "Η παρούσα Πολιτική Απορρήτου επιβάλλεται από το ΦOMO και όλα τα επιχειρησιακά του τμήματα. Έχουμε θεσπίσει μηχανισμούς για τη διασφάλιση συνεχούς συμμόρφωσης. Κάθε υπάλληλος που παραβιάζει αυτήν την πολιτική θα αντιμετωπίσει πειθαρχικές ενέργειες.",
      },

      // ── 3. Πολιτική — Επιχειρήσεις/Διοργανωτές ─────
      {
        icon: Building2,
        title: "3. Πολιτική Απορρήτου — Επιχειρήσεις/Διοργανωτές",
        content: "",
        subsections: [
          {
            subtitle: "3.1. Ποιοι Είμαστε",
            content: "Το ΦOMO, με έδρα τη Λευκωσία, Κύπρο, είναι ο υπεύθυνος επεξεργασίας δεδομένων για τα προσωπικά δεδομένα που συλλέγονται μέσω της πλατφόρμας ΦOMO.",
          },
          {
            subtitle: "3.2. Ποια Δεδομένα Συλλέγουμε για Επιχειρήσεις",
            content: "Για Επιχειρήσεις/Διοργανωτές ενδέχεται να συλλέξουμε:",
            items: [
              "Δεδομένα Ταυτότητας: Ονοματεπώνυμο, ψευδώνυμο χρήστη, ημερομηνία γέννησης.",
              "Δεδομένα Επικοινωνίας: Email, διεύθυνση επιχείρησης, τηλέφωνα.",
              "Οικονομικά Δεδομένα: Στοιχεία τραπεζικών λογαριασμών (μέσω Stripe).",
              "Δεδομένα Συναλλαγών: Λεπτομέρειες πληρωμών μέσω της πλατφόρμας.",
              "Τεχνικά Δεδομένα: IP, browser, στοιχεία συσκευής.",
              "Δεδομένα Επιχείρησης: Επωνυμία, διεύθυνση, στοιχεία επικοινωνίας, λειτουργικά δεδομένα.",
              "Δεδομένα Εκδηλώσεων: Πληροφορίες για δημιουργημένες εκδηλώσεις, πωλήσεις εισιτηρίων, κρατήσεις, στατιστικά.",
              "Δεδομένα Κρατήσεων: Λεπτομέρειες καθημερινών κρατήσεων (μέγεθος τραπεζιού, ώρα, προτιμήσεις πελατών).",
              "Δεδομένα CRM: Πληροφορίες πελατών, σημειώσεις, ετικέτες (tags) εντός του συστήματος CRM.",
              "Δεδομένα Χρήσης & Μάρκετινγκ: Τρόπος αλληλεπίδρασης με την πλατφόρμα.",
            ],
          },
          {
            subtitle: "3.2.1. Πώς Χρησιμοποιούμε τα Δεδομένα σας",
            content: "Χρησιμοποιούμε αυτά τα δεδομένα για:",
            items: [
              "Διευκόλυνση καταχώρησης, προώθησης και ανακάλυψης εκδηλώσεων.",
              "Διαχείριση κρατήσεων, πωλήσεων εισιτηρίων και προσφορών.",
              "Επεξεργασία πληρωμών και παροχή analytics βελτιστοποίησης.",
              "Παροχή CRM εργαλείων για διαχείριση πελατολογίου.",
              "Συνεχή βελτίωση λειτουργιών πλατφόρμας.",
            ],
          },
        ],
      },

      // ── 3.3–3.4 Συλλογή & Σκοποί (Επιχειρήσεις) ───
      {
        icon: Fingerprint,
        title: "3.3–3.4. Συλλογή & Σκοποί (Επιχειρήσεις)",
        content: "Η συλλογή δεδομένων για Επιχειρήσεις/Διοργανωτές γίνεται με τον ίδιο τρόπο που περιγράφεται στην ενότητα 2.3 (άμεσες αλληλεπίδρασεις, αυτόματη συλλογή, τρίτες πηγές). Οι νομικές βάσεις είναι ίδιες με αυτές της ενότητας 2.4.1.",
        subsections: [
          {
            subtitle: "3.4.2. Μάρκετινγκ & Επικοινωνίες",
            content: "Θα σας στέλνουμε μηνύματα μάρκετινγκ μόνο με τη συγκατάθεσή σας. Μπορείτε να αποσύρετε τη συγκατάθεσή σας ανά πάσα στιγμή. Θα λάβουμε τη ρητή σας συναίνεση πριν μοιραστούμε τα δεδομένα σας με τρίτους για σκοπούς μάρκετινγκ.",
          },
          {
            subtitle: "3.4.4. Κατάρτιση Προφίλ",
            content: "Η εφαρμογή δεν πραγματοποιεί κατάρτιση προφίλ Επιχειρήσεων/Διοργανωτών, διασφαλίζοντας ότι τα δεδομένα σας δεν υπόκεινται σε αυτοματοποιημένη λήψη αποφάσεων.",
          },
        ],
      },

      // ── 3.5 Μεταφορές (Επιχειρήσεις) ───────────────
      {
        icon: Server,
        title: "3.5. Μεταφορές Δεδομένων (Επιχειρήσεις)",
        content: "",
        subsections: [
          {
            subtitle: "3.5.1. Κοινοποιήσεις",
            content: "Ενδέχεται να κοινοποιήσουμε τα δεδομένα σας σε τρίτους στις ίδιες περιπτώσεις που περιγράφονται στην ενότητα 2.5.1.",
          },
          {
            subtitle: "3.5.2. Διεθνείς Μεταφορές",
            content: "Ισχύουν οι ίδιες εγγυήσεις που περιγράφονται στην ενότητα 2.5.2.",
          },
          {
            subtitle: "3.5.3. Κοινοποιημένα Δεδομένα μεταξύ Διοργανωτών και Χώρων",
            content: "Εάν ένας διοργανωτής εκδηλώσεων δημοσίευσε εκδηλώσεις πριν η Επιχείρηση ενταχθεί στην πλατφόρμα, η Επιχείρηση μπορεί να αποκτήσει πρόσβαση σε ανωνυμοποιημένα και συγκεντρωτικά δεδομένα. Τα κοινοποιημένα δεδομένα μεταξύ Επιχειρήσεων/Διοργανωτών διέπονται αυστηρά από τα μέτρα προστασίας δεδομένων μας.",
          },
        ],
      },

      // ── 3.6–3.12 Λοιπά (Επιχειρήσεις) ──────────────
      {
        icon: Lock,
        title: "3.6–3.12. Διατήρηση, Δικαιώματα, Ασφάλεια, Cookies & Συμμόρφωση (Επιχειρήσεις)",
        content: "Τα ακόλουθα ισχύουν εξίσου για τις Επιχειρήσεις/Διοργανωτές:",
        items: [
          "Διατήρηση Δεδομένων (§3.6): Ίδιες περίοδοι με §2.6 — 6 χρόνια για φορολογικά, 2 χρόνια αδράνειας, δικαίωμα αίτησης διαγραφής.",
          "Σύνδεσμοι Τρίτων (§3.7): Δεν αποδεχόμαστε ευθύνη για πολιτικές απορρήτου εξωτερικών ιστοσελίδων.",
          "Δικαιώματα Υποκειμένων (§3.8): Ίδια δικαιώματα GDPR με §2.8 — ενημέρωση, πρόσβαση, διόρθωση, διαγραφή, περιορισμός, φορητότητα, εναντίωση, ανάκληση συγκατάθεσης.",
          "Ασφάλεια (§3.9): Ίδια μέτρα ασφαλείας με §2.9 — αρχή Need-to-Know, κρυπτογράφηση, DPIA, ειδοποίηση παραβίασης εντός 72 ωρών.",
          "Cookies (§3.10): Ίδιες κατηγορίες cookies με §2.10.",
          "Αλλαγές Πολιτικής (§3.11): Δικαίωμα τροποποίησης ανά πάσα στιγμή με ειδοποίηση.",
          "Συμμόρφωση (§3.12): Επιβολή πολιτικής σε όλα τα τμήματα, πειθαρχικές ενέργειες για παραβάσεις.",
        ],
        note: "Για άσκηση δικαιωμάτων επικοινωνήστε στο support@fomocy.com.\n\nΕπίτροπος Προστασίας Δεδομένων Κύπρου:\nΚυπρανόρος 15, 1061 Λευκωσία\nΤ.Θ. 23378, 1682 Λευκωσία\nΤηλ: +35722818456 | Fax: +35722304565\nEmail: commissioner@dataprotection.gov.cy",
      },
    ] as Section[],
  };

  /* ================================================================
     ENGLISH
     ================================================================ */
  const en = {
    title: "Privacy Policy",
    lastUpdated: "Last updated: April 2025",

    executive: {
      title: "Executive Summary",
      content: "This policy outlines the basis on which any personal data we collect from you, or that you provide to us, will be processed. At ΦOMO, we are committed to fostering a transparent and trustworthy relationship with our users, placing the safeguarding of your privacy at the heart of our beliefs. We recognise the value and sensitivity of the data you share with us as you interact with our services, viewing it as a fundamental responsibility rather than merely a compliance issue.\n\nTo clarify our practices regarding the collection, usage, and protection of your information, we have crafted this Privacy Policy, which applies to the ΦOMO website, application, and any associated interfaces.\n\nPlease note that the platform is not intended for children under 16 years of age, and we do not knowingly collect data relating to children. We encourage you to read and understand the following terms before engaging with our platform, as your informed participation enables us to create a secure and harmonious environment for all users.",
    },

    consent: {
      title: "Consent",
      content: "Under data protection laws, we are required to provide you with certain information about who we are, how we process your personal data and for what purposes, and your rights in relation to your personal data. This information is provided within this Privacy Policy.\n\nBefore using the ΦOMO platform, you agree to consent to our processing of your personal data (including your name, contact details, and device information) as described in this policy.",
      withdraw: "Once you provide consent, you may change your mind and withdraw consent at any time by contacting us, but that will not affect the lawfulness of any processing carried out before you withdraw your consent.",
      location: "We may use GPS technology to determine your current location. Some of our location-enabled features require your personal data to work. If you wish to use a particular feature, please indicate your consent. You can withdraw your consent at any time by disabling Location Data in your device settings.",
    },

    sections: [
      // ── 1. Introduction ──────────────────────────────
      {
        icon: BookOpen,
        title: "1. Introduction",
        content: "",
        subsections: [
          {
            subtitle: "1.1. Purpose",
            content: "This policy (together with our Terms of Use and any additional terms) applies to your use of:",
            items: [
              "The ΦOMO application, available via our website at fomo.com.cy, once you have accessed it through your browser or device.",
              "Any services accessible through the ΦOMO platform.",
            ],
          },
          {
            subtitle: "1.2. Scope",
            content: "This Privacy Policy applies to Personal Information processed by ΦOMO, including on the website located at fomo.com.cy. All individuals whose responsibilities include the processing of Personal Information on behalf of ΦOMO are expected to protect that data by adhering to this Privacy Policy.",
          },
          {
            subtitle: "1.3. Laws & Regulations",
            content: "ΦOMO will comply with all applicable local laws, specifically those of the EU and Cyprus, when processing Personal Information (e.g., the European General Data Protection Regulation 'GDPR'). In particular, any local legal conditions and restrictions on the transfer of Personal Information will be respected.",
          },
        ],
      },

      // ── 1.4 Key Terms ────────────────────────────────
      {
        icon: Scale,
        title: "1.4. Key Terms",
        content: "The following list includes terms used in this policy and their definitions:",
        items: [
          "Anonymization: The process of transforming personal data so that the data subject can no longer be identified. Anonymized data falls outside the scope of GDPR.",
          "Application Users: End users who connect to the platform to browse, book, purchase tickets, and redeem offers.",
          "Binding Corporate Rules (BCR): Personal data protection policies adhered to by a controller or processor within a group of undertakings for cross-border transfers.",
          "Compliance (with legal obligations): Processing your personal data where it is necessary for compliance with a legal obligation.",
          "Consent: Any freely given, specific, informed and unambiguous indication of the data subject's wishes.",
          "Data Controller: The natural or legal person which determines the purposes and means of processing personal data.",
          "Data Processor: A natural or legal person which processes personal data on behalf of the controller.",
          "Data Subject: An identified or identifiable natural person.",
          "Personal Data: Any information relating to an identified or identifiable natural person — including name, identification number, location data, online identifier, or factors specific to the physical, genetic, mental, economic, cultural or social identity.",
          "Personal Data Breach: A breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data.",
          "Processing: Any operation performed on personal data, such as collection, recording, organisation, storage, adaptation, retrieval, use, disclosure, erasure or destruction.",
          "Profiling: Any form of automated processing to evaluate certain personal aspects, particularly to analyse or predict preferences, behaviour, or location.",
          "Sensitive Data: A subset of Personal Information including racial/ethnic origin, political opinions, religious beliefs, genetic/biometric data, health information, and sexual orientation.",
          "Standard Contractual Clauses (SCC): Legal tools established by the European Commission to ensure adequate protection for data transferred outside the EEA.",
          "Businesses/Organisers: Entities or individuals that provide event spaces and use the ΦOMO platform to manage reservations, tickets, offers, and events.",
          "Legitimate Interest: The interest of our business in conducting and managing our business to give you the best service. We always balance any potential impact on your rights.",
          "Performance of Contract: Processing data necessary for the performance of a contract to which you are a party.",
        ],
      },

      // ── 2. Privacy Policy — Application Users ───────
      {
        icon: Users,
        title: "2. Privacy Policy — Application Users",
        content: "",
        subsections: [
          {
            subtitle: "2.1. Who We Are",
            content: "ΦOMO, based in Nicosia, Cyprus, referred to as 'the company', 'ΦOMO', 'us', 'our', or 'we', is the data controller responsible for your personal data collected through the ΦOMO platform and its associated services (collectively, the 'Platform'). This Privacy and Cookie Policy outlines the types of personal data we may collect and how we manage it.",
          },
          {
            subtitle: "2.2. What Personal Data We Collect",
            content: "We may collect, use, store and transfer the following categories of data:",
            items: [
              "Identity Data: First name, last name, username, date of birth.",
              "Contact Data: Email address, telephone numbers.",
              "Financial Data: Bank account and payment card details (stored exclusively by our payment provider Stripe — we do not see or store them).",
              "Transaction Data: Details about payments, ticket purchases, reservations, and offers.",
              "Technical Data: IP address, login data, browser type and version.",
              "Device Data: Mobile device type, unique device identifier, operating system, time zone.",
              "Profile Data: Login credentials (email), in-app purchase history, interests, preferences, student status.",
              "Usage Data: Information about how you use the platform.",
              "Marketing & Communications Data: Preferences for receiving marketing.",
              "Location Data: Your current location via GPS or other technology (only with your consent).",
            ],
          },
        ],
        note: "We also collect and share Aggregated Data (e.g., statistical or demographic) for any purpose. Aggregated Data is not considered personal data unless combined with your personal data.\n\nFor payments, we use a third-party payment provider (Stripe) which is directly responsible for collecting and processing your financial data. We do not directly collect or process any financial data.\n\nWe do not collect special categories of personal data (sensitive data such as racial/ethnic origin, religious beliefs, sexual orientation, health data, genetic/biometric data). We do not collect information about criminal convictions.",
      },

      // ── 2.3 How We Collect ──────────────────────────
      {
        icon: Database,
        title: "2.3. How We Collect Your Personal Data",
        content: "We collect your personal information through:",
        items: [
          "Information you give us: When creating an account, making a reservation, purchasing tickets, redeeming offers, transferring tickets, participating in competitions, or contacting us.",
          "Information we collect automatically: Each time you visit the platform, we automatically collect Device, Usage and Technical Data using cookies and similar technologies.",
          "Location Data: Via GPS for location-enabled features (only with your consent). You can withdraw consent by disabling Location Data.",
          "Third-party sources: Services like Apple, Google or Facebook may provide us with your email, name and other data. Analytics providers (e.g., Google Analytics) may provide Device Data.",
        ],
      },

      // ── 2.4 Purposes ───────────────────────────────
      {
        icon: Eye,
        title: "2.4. Purposes of Processing",
        content: "",
        subsections: [
          {
            subtitle: "2.4.1. Lawful Bases",
            content: "We will only use your personal data when the law allows us to, in accordance with the following GDPR lawful bases:",
            items: [
              "Consent: Where you have consented before the processing (Art. 6(a), GDPR).",
              "Contract performance: Where we need to perform a contract with you (Art. 6(b), GDPR).",
              "Legal obligation: To comply with a legal or regulatory obligation (Art. 6(c), GDPR).",
              "Legitimate interest: Where necessary for our interests (or those of a third party) without overriding your rights (Art. 6(f), GDPR).",
            ],
          },
          {
            subtitle: "2.4.2. Marketing & Communications",
            content: "We will send you direct marketing communications by email, push notifications, and in-app messages based on your explicit consent at registration.",
            items: [
              "By checking the consent box during sign-up, you agree to receive marketing messages directly from ΦOMO, including event updates, venue promotions, and exclusive offers.",
              "You may opt out at any time by clicking 'unsubscribe' in any email or contacting us.",
              "Businesses/Organisers must obtain separate explicit consent before sending their own marketing messages.",
              "You may withdraw your consent for third-party marketing at any time.",
            ],
          },
          {
            subtitle: "2.4.3. Opting Out of Marketing",
            content: "To unsubscribe from marketing emails, click the unsubscribe link at the bottom of any marketing email. Note that opting out does not exclude transactional emails (booking confirmations, event changes, etc.).",
          },
          {
            subtitle: "2.4.4. Profiling",
            content: "The application engages in profiling of individual and demographic trends based on events/venues you have attended or expressed interest in, with your consent. This helps us provide personalised recommendations. Your participation is voluntary, and you can withdraw consent at any time.",
          },
        ],
      },

      // ── 2.5 Data Transfers ──────────────────────────
      {
        icon: Globe,
        title: "2.5. Data Transfers",
        content: "",
        subsections: [
          {
            subtitle: "2.5.1. Disclosures",
            content: "We may disclose your personal data to third parties in the following cases:",
            items: [
              "To Internal Third Parties within the ΦOMO group.",
              "To External Third Parties: IT and system administration providers, professional advisers (lawyers, accountants), Cyprus Tax Department, and other authorities.",
              "If we sell or buy businesses/assets.",
              "If we are legally obliged to disclose data or asked by a lawful authority.",
              "To Businesses: only the necessary reservation details (name, party size, time).",
              "To analytics and search engine providers.",
            ],
          },
          {
            subtitle: "2.5.2. International Transfers",
            content: "Many of our external third parties are based outside Cyprus/EU. Whenever we transfer your data outside the EU, we ensure adequate protection through:",
            items: [
              "Transfer only to countries deemed to provide adequate protection.",
              "Use of specific contracts (Binding Corporate Rules / Standard Contractual Clauses) approved by the EU.",
            ],
          },
        ],
      },

      // ── 2.6 Data Retention ──────────────────────────
      {
        icon: Clock,
        title: "2.6. Data Retention",
        content: "We retain your personal data only for as long as necessary:",
        items: [
          "Identity, Contact, Transaction and Financial Data: 6 years (tax purposes).",
          "Inactive account (2 years): the account is treated as expired and data may be deleted.",
          "Usage/analytics data: 24 months.",
          "Security logs: 12 months.",
          "Some data may be anonymised for research/statistical purposes without further notice.",
        ],
        note: "Data subjects have the right to request deletion, provided the data is not required for legal obligations or contractual commitments.",
      },

      // ── 2.7 Third-Party Links ───────────────────────
      {
        icon: Share2,
        title: "2.7. Links to Third-Party Websites",
        content: "Our platform may occasionally include links to websites of partner networks, advertisers, and affiliates, which have their own privacy policies. We do not accept any responsibility for these policies. We encourage you to review them before submitting any personal data.\n\nAdditionally, ΦOMO may display events or venues for which it does not provide ticketing/reservation services. If you are redirected to an external website, the transaction is solely between you and the external provider.",
      },

      // ── 2.8 Data Subject Rights ─────────────────────
      {
        icon: UserCheck,
        title: "2.8. Data Subject Rights",
        content: "Under the GDPR, you have the following rights:",
        items: [
          "Right to be informed: To know what personal data is collected, why, by whom, for how long, and if there is data sharing.",
          "Right to access: To request a copy of your personal data.",
          "Right to rectification: To correct inaccurate or incomplete data.",
          "Right to erasure ('right to be forgotten'): To request deletion of data where there is no legitimate reason for continued processing.",
          "Right to restriction: To request suspension of processing (e.g., to verify accuracy or if use is unlawful).",
          "Right to portability: To receive your data in a structured, machine-readable format.",
          "Right to object: To oppose processing for marketing or profiling.",
          "Rights in relation to automated decision-making and profiling.",
          "Right to withdraw consent: At any time, without affecting the lawfulness of prior processing.",
        ],
        note: "To exercise your rights, contact support@fomocy.com. You also have the right to complain to the Cyprus Data Protection Commissioner:\n\nData Protection Commissioner\nKypranoros 15, 1061 Nicosia\nP.O. Box 23378, 1682 Nicosia\nTel: +35722818456\nFax: +35722304565\nEmail: commissioner@dataprotection.gov.cy",
      },

      // ── 2.9 Data Security ──────────────────────────
      {
        icon: Shield,
        title: "2.9. Data Security",
        content: "We have put in place appropriate security measures to prevent accidental loss, unauthorised access, alteration or disclosure:",
        items: [
          "We apply the 'Need-to-Know' principle — access limited to personnel with a legitimate business need.",
          "SSL/TLS encryption for all communications.",
          "At-rest encryption for stored data.",
          "Risk Assessments and Data Protection Impact Assessments (DPIA).",
          "Firewalls, intrusion detection systems, and regular security audits.",
          "Payment encryption via SSL or equivalent technology.",
          "Regular staff training on security matters.",
          "You are responsible for keeping your password confidential.",
        ],
        note: "While we take all reasonable measures, we cannot guarantee that cybersecurity breaches will never occur. In the event of a breach, we will notify affected users within 72 hours and comply with regulatory notification obligations.",
      },

      // ── 2.10 Cookies ───────────────────────────────
      {
        icon: Cookie,
        title: "2.10. Cookies",
        content: "We use cookies and similar tracking technologies. Cookies are small text files stored on your device. ΦOMO uses cookies to remember settings (e.g., language), for authentication, and for analytics. We may use trusted third-party services (e.g., Google Analytics) — all data used will be anonymised.",
        items: [
          "Session Cookies: Temporary, deleted when you close your browser.",
          "Persistent Cookies: Remain on your device for a set period.",
          "Essential Cookies: Necessary for platform functionality.",
          "Performance Cookies: Help understand how visitors interact with our platform.",
          "Functionality Cookies: Enhance functionality and personalisation.",
          "Advertising Cookies: Make advertising messages more relevant to your interests.",
        ],
        note: "You can configure your browser to warn you or disable cookies. Disabling some cookies may limit platform functionality.",
      },

      // ── 2.11 Changes ──────────────────────────────
      {
        icon: RefreshCw,
        title: "2.11. Changes to the Privacy Policy",
        content: "We regularly review our privacy policy, with the most recent update on 06/04/2025. Changes will be posted on this page. For material changes, we will provide notice via email or in-app notification. We encourage you to check this page periodically.",
      },

      // ── 2.12 Compliance ────────────────────────────
      {
        icon: ShieldCheck,
        title: "2.12. Compliance",
        content: "This Privacy Policy will be enforced by ΦOMO and all its operational divisions. We have established mechanisms to ensure continuous compliance. Any employee who breaches this Privacy Policy will face disciplinary actions.",
      },

      // ── 3. Businesses/Organisers ───────────────────
      {
        icon: Building2,
        title: "3. Privacy Policy — Businesses/Organisers",
        content: "",
        subsections: [
          {
            subtitle: "3.1. Who We Are",
            content: "ΦOMO, based in Nicosia, Cyprus, is the data controller responsible for personal data collected through the ΦOMO platform.",
          },
          {
            subtitle: "3.2. What Data We Collect for Businesses",
            content: "For Businesses/Organisers, we may collect:",
            items: [
              "Identity Data: First name, last name, username, date of birth.",
              "Contact Data: Email, business address, phone numbers.",
              "Financial Data: Bank account details (via Stripe).",
              "Transaction Data: Payment details via the platform.",
              "Technical Data: IP, browser, device information.",
              "Business Data: Business name, address, contact details, operational data.",
              "Event-Related Data: Events created, ticket sales, reservations, statistics.",
              "Reservation Data: Day-to-day reservation details (table size, time, customer preferences).",
              "CRM Data: Customer information, notes, tags within the CRM system.",
              "Usage & Marketing Data: How you interact with the platform.",
            ],
          },
          {
            subtitle: "3.2.1. How We Use Your Data",
            content: "We use this data to:",
            items: [
              "Facilitate event listing, promotion, and discoverability.",
              "Manage reservations, ticket sales, and offers.",
              "Process payments and provide optimisation analytics.",
              "Provide CRM tools for customer management.",
              "Continuously improve platform features.",
            ],
          },
        ],
      },

      // ── 3.3–3.4 Collection & Purposes (Businesses) ─
      {
        icon: Fingerprint,
        title: "3.3–3.4. Collection & Purposes (Businesses)",
        content: "Data collection for Businesses/Organisers follows the same methods described in section 2.3 (direct interactions, automatic collection, third-party sources). The lawful bases are identical to those in section 2.4.1.",
        subsections: [
          {
            subtitle: "3.4.2. Marketing & Communications",
            content: "We will only send you direct marketing communications with your consent. You can withdraw your consent at any time. We will get your express opt-in consent before sharing your personal data with any third party for marketing purposes.",
          },
          {
            subtitle: "3.4.4. Profiling",
            content: "The application does not engage in any form of profiling of Businesses/Organisers, ensuring that your personal data is not subjected to automated decision-making processes.",
          },
        ],
      },

      // ── 3.5 Transfers (Businesses) ──────────────────
      {
        icon: Server,
        title: "3.5. Data Transfers (Businesses)",
        content: "",
        subsections: [
          {
            subtitle: "3.5.1. Disclosures",
            content: "We may disclose your data to third parties in the same cases described in section 2.5.1.",
          },
          {
            subtitle: "3.5.2. International Transfers",
            content: "The same safeguards described in section 2.5.2 apply.",
          },
          {
            subtitle: "3.5.3. Shared Data Between Organisers and Venues",
            content: "If an event organiser published events before a venue onboarded, the venue may gain access to anonymised and aggregated data. Data shared between Businesses/Organisers is strictly governed by our data protection measures.",
          },
        ],
      },

      // ── 3.6–3.12 Remaining (Businesses) ─────────────
      {
        icon: Lock,
        title: "3.6–3.12. Retention, Rights, Security, Cookies & Compliance (Businesses)",
        content: "The following apply equally to Businesses/Organisers:",
        items: [
          "Data Retention (§3.6): Same periods as §2.6 — 6 years for tax, 2 years inactivity, right to request deletion.",
          "Third-Party Links (§3.7): We accept no responsibility for external website privacy policies.",
          "Data Subject Rights (§3.8): Same GDPR rights as §2.8 — information, access, rectification, erasure, restriction, portability, objection, withdrawal of consent.",
          "Data Security (§3.9): Same security measures as §2.9 — Need-to-Know principle, encryption, DPIA, breach notification within 72 hours.",
          "Cookies (§3.10): Same cookie categories as §2.10.",
          "Policy Changes (§3.11): Right to modify at any time with notification.",
          "Compliance (§3.12): Policy enforced across all divisions, disciplinary actions for breaches.",
        ],
        note: "To exercise your rights, contact support@fomocy.com.\n\nCyprus Data Protection Commissioner:\nKypranoros 15, 1061 Nicosia\nP.O. Box 23378, 1682 Nicosia\nTel: +35722818456 | Fax: +35722304565\nEmail: commissioner@dataprotection.gov.cy",
      },
    ] as Section[],
  };

  const content = language === 'el' ? el : en;

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-background">
      <InfoNavbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.close();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'el' ? 'Πίσω' : 'Back'}
          </Button>

          {/* Title */}
          <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
            {content.title}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {content.lastUpdated}
          </p>

          {/* Executive Summary */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                    {content.executive.title}
                  </h2>
                  {content.executive.content.split('\n\n').map((p, i) => (
                    <p key={i} className="text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">{p}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consent */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Handshake className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="font-poppins font-semibold text-xl text-foreground mb-3">
                    {content.consent.title}
                  </h2>
                  {content.consent.content.split('\n\n').map((p, i) => (
                    <p key={i} className="text-muted-foreground mb-3 leading-relaxed">{p}</p>
                  ))}
                  <div className="mt-4 space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {language === 'el' ? 'Πώς μπορείτε να αποσύρετε τη συγκατάθεση' : 'How you can withdraw consent'}
                      </p>
                      <p className="text-sm text-muted-foreground">{content.consent.withdraw}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {language === 'el' ? 'Συγκατάθεση για Δεδομένα Τοποθεσίας' : 'Consent to Location Data'}
                      </p>
                      <p className="text-sm text-muted-foreground">{content.consent.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Sections */}
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

                      {section.content && (
                        <p className="text-muted-foreground mb-4 leading-relaxed whitespace-pre-line">
                          {section.content}
                        </p>
                      )}

                      {/* Items */}
                      {section.items && (
                        <ul className="space-y-2 mb-4">
                          {section.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-foreground text-sm">
                              <span className="text-accent mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Subsections */}
                      {section.subsections?.map((sub, si) => (
                        <div key={si} className="mb-5 last:mb-0">
                          <h3 className="font-poppins font-medium text-foreground mb-2">
                            {sub.subtitle}
                          </h3>
                          <p className="text-muted-foreground mb-3 leading-relaxed whitespace-pre-line text-sm">
                            {sub.content}
                          </p>
                          {sub.items && (
                            <ul className="space-y-1.5 mb-3">
                              {sub.items.map((item, ii) => (
                                <li key={ii} className="flex items-start gap-2 text-foreground text-sm">
                                  <span className="text-accent mt-0.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}

                      {/* Note */}
                      {section.note && (
                        <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg whitespace-pre-line">
                          {section.note}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
