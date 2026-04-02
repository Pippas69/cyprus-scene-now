import InfoNavbar from "@/components/info/InfoNavbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Shield, Users, Store, Ban, Scale, CreditCard, 
  Globe, Gavel, Clock, Bell, Lock, UserCheck, Smartphone,
  RefreshCw, AlertTriangle, BookOpen, Eye, Building2
} from "lucide-react";

interface LicenseSection {
  icon: any;
  title: string;
  content: string;
  items?: string[];
  subsections?: {
    title: string;
    content: string;
    items?: string[];
  }[];
}

interface LicenseContent {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LicenseSection[];
  contact: {
    title: string;
    content: string;
    email: string;
    address: string;
  };
}

const LicenseAgreement = () => {
  const { language } = useLanguage();

  const t: Record<'el' | 'en', LicenseContent> = {
    el: {
      title: "Άδεια Χρήσης Λογισμικού",
      lastUpdated: "Τελευταία ενημέρωση: Απρίλιος 2026",
      intro: "Η παρούσα Άδεια Χρήσης Λογισμικού (License Agreement) εξηγεί τους όρους υπό τους οποίους η ΦΟΜΟ Cyprus (εφεξής «ΦΟΜΟ», «εμείς», «η εταιρεία»), με έδρα τη Λευκωσία, Κύπρος, παρέχει στους χρήστες:\n\n• Την εφαρμογή ΦΟΜΟ (η «Εφαρμογή»), διαθέσιμη μέσω του ιστοτόπου μας στο fomo.com.cy και ως progressive web app, ή/και μέσω App Store / Google Play Store.\n• Τα δεδομένα που παρέχονται μαζί με την Εφαρμογή, καθώς και οποιεσδήποτε ενημερώσεις ή συμπληρώματά της.\n• Τη σχετική τεκμηρίωση (Τεκμηρίωση).\n• Τις υπηρεσίες στις οποίες συνδέεστε μέσω της Εφαρμογής και το περιεχόμενο που σας παρέχουμε (Υπηρεσία).\n\nΚατεβάζοντας, εγκαθιστώντας ή χρησιμοποιώντας την Εφαρμογή, αποδέχεστε ρητά ότι δεσμεύεστε από την παρούσα Άδεια Χρήσης και τους Όρους Χρήσης που τη συνοδεύουν. Εάν δεν συμφωνείτε, παρακαλούμε μην χρησιμοποιείτε το λογισμικό.\n\nΟι τρόποι χρήσης μπορεί επίσης να ελέγχονται από τους κανόνες του Apple App Store (για iOS) ή του Google Play Store (για Android). Σε περίπτωση αντίφασης, υπερισχύουν οι κανόνες του αντίστοιχου καταστήματος.",
      sections: [
        {
          icon: Shield,
          title: "1. Προστασία Δεδομένων & Απόρρητο",
          content: "Σύμφωνα με τη νομοθεσία περί προστασίας δεδομένων, υποχρεούμαστε να σας παρέχουμε πληροφορίες σχετικά με το ποιοι είμαστε, πώς επεξεργαζόμαστε τα προσωπικά σας δεδομένα, για ποιους σκοπούς και τα δικαιώματά σας. Αυτές οι πληροφορίες παρέχονται στην Πολιτική Απορρήτου μας.",
          items: [],
        },
        {
          icon: Users,
          title: "2. Δικαιώματα Άδειας Χρηστών Εφαρμογής",
          content: "Σε αντάλλαγμα της συμμόρφωσής σας με αυτούς τους όρους, μπορείτε να:",
          items: [
            "Κατεβάσετε ή μεταδώσετε αντίγραφο της Εφαρμογής σε μία συσκευή και να τη χρησιμοποιήσετε για προσωπικούς σκοπούς.",
            "Χρησιμοποιήσετε οποιαδήποτε Τεκμηρίωση για υποστήριξη της επιτρεπόμενης χρήσης.",
            "Λαμβάνετε δωρεάν ενημερώσεις και διορθώσεις σφαλμάτων.",
          ],
          subsections: [
            {
              title: "2.1. Ηλικιακοί Περιορισμοί",
              content: "Πρέπει να είστε πάνω από τη νόμιμη ηλικία για τη χώρα σας ώστε να αποδεχτείτε αυτούς τους όρους. Πρέπει επίσης να είστε πάνω από τη νόμιμη ηλικία εισόδου/κατανάλωσης αλκοόλ στον τόπο παροχής της υπηρεσίας. Χρησιμοποιώντας τις υπηρεσίες μας, επιβεβαιώνετε ότι πληροίτε τις ηλικιακές απαιτήσεις.",
              items: [],
            },
            {
              title: "2.2. Εύρος Άδειας",
              content: "Η ΦΟΜΟ παρέχει την Υπηρεσία ώστε οι χρήστες να μπορούν να κάνουν online κρατήσεις, να χρησιμοποιούν τις υπηρεσίες έκδοσης εισιτηρίων/booking και παραγγελιών σε συγκεκριμένες εκδηλώσεις ή απευθείας σε συμμετέχουσες επιχειρήσεις.",
              items: [
                "Για κράτηση, θα χρειαστεί να δώσετε το όνομά σας, τηλέφωνο και email. Με τη δήλωση του email σας, συμφωνείτε να λαμβάνετε πληροφορίες σχετικά με την κράτησή σας.",
                "Όλες οι κρατήσεις υπόκεινται σε διαθεσιμότητα και δεν επιβεβαιώνονται μέχρι να λάβετε email επιβεβαίωσης.",
                "Ακόμα και αν μια κράτηση επιβεβαιωθεί, η Επιχείρηση/Διοργανωτής διατηρεί το δικαίωμα να απορρίψει χρήστη. Η ΦΟΜΟ δεν φέρει ευθύνη για ενέργειες της Επιχείρησης/Διοργανωτή.",
                "Η Εφαρμογή ενσωματώνει υπηρεσίες παραγγελίας. Οι χρήστες μπορούν να παραγγείλουν εκ των προτέρων ή επιτόπου.",
              ],
            },
          ],
        },
        {
          icon: Ban,
          title: "3. Περιορισμοί Χρήσης",
          content: "Συμφωνείτε ότι δεν θα:",
          items: [
            "Ενοικιάσετε, δανείσετε ή διαθέσετε την Εφαρμογή σε τρίτους χωρίς γραπτή συγκατάθεσή μας.",
            "Αντιγράψετε την Εφαρμογή εκτός από κανονική χρήση ή backup.",
            "Μεταφράσετε, τροποποιήσετε ή συγχωνεύσετε μέρος ή σύνολο της Εφαρμογής.",
            "Αποσυναρμολογήσετε, αντίστροφα μηχανολογήσετε (reverse engineer) ή δημιουργήσετε παράγωγα έργα.",
            "Χρησιμοποιήσετε την Εφαρμογή με παράνομο τρόπο ή εισάγετε κακόβουλο κώδικα.",
            "Παραβιάσετε τα πνευματικά μας δικαιώματα ή τρίτων.",
            "Μεταδώσετε δυσφημιστικό ή προσβλητικό υλικό.",
            "Συλλέξετε πληροφορίες ή δεδομένα από τα συστήματά μας.",
          ],
        },
        {
          icon: Lock,
          title: "4. Πνευματική Ιδιοκτησία",
          content: "Όλα τα δικαιώματα πνευματικής ιδιοκτησίας στην Εφαρμογή, την Τεκμηρίωση και τις Υπηρεσίες ανήκουν σε εμάς (ή στους αδειοδότες μας). Τα δικαιώματα στην Εφαρμογή και τις Υπηρεσίες σας παραχωρούνται με άδεια χρήσης (δεν πωλούνται). Δεν έχετε δικαιώματα πνευματικής ιδιοκτησίας εκτός από το δικαίωμα χρήσης σύμφωνα με αυτούς τους όρους.",
          items: [],
        },
        {
          icon: UserCheck,
          title: "5. Υποχρεώσεις Χρηστών Εφαρμογής",
          content: "",
          subsections: [
            {
              title: "5.1. Συμμόρφωση με τη Νομοθεσία",
              content: "Η χρήση της Εφαρμογής εξαρτάται από την τήρηση όλων των εφαρμοστέων νόμων. Η παραβίαση μπορεί να οδηγήσει σε ανάκληση της άδειας και νομική δράση.",
              items: [],
            },
            {
              title: "5.2. Χρέωση Υπηρεσίας/Κράτησης",
              content: "Κατά την κράτηση, υποχρεούστε να καταβάλετε το σχετικό τέλος υπηρεσίας/κράτησης ή παραγγελίας.",
              items: [],
            },
            {
              title: "5.3. Πολιτική Μη Εμφάνισης (No-Show)",
              content: "Πρέπει να τηρείτε την πολιτική κράτησης/ακύρωσης κάθε Επιχείρησης. Αν δεν υπάρχει τέτοια πολιτική, η ΦΟΜΟ απαιτεί τουλάχιστον 48 ώρες προειδοποίηση ακύρωσης.",
              items: [],
            },
            {
              title: "5.4. Περιεχόμενο Τρίτων",
              content: "Οι Υπηρεσίες μπορεί να περιέχουν συνδέσμους προς ιστοσελίδες και εφαρμογές τρίτων. Η ΦΟΜΟ δεν ευθύνεται για αυτό το περιεχόμενο. Η χρήση γίνεται με δική σας ευθύνη.",
              items: [],
            },
            {
              title: "5.5. Μεταβίβαση Δικαιωμάτων",
              content: "Μπορείτε να μεταβιβάσετε τα δικαιώματα ή τις υποχρεώσεις σας μόνο με γραπτή συμφωνία μας.",
              items: [],
            },
          ],
        },
        {
          icon: Store,
          title: "6. Δικαιώματα Άδειας Επιχειρήσεων/Διοργανωτών",
          content: "Σε αντάλλαγμα της συμμόρφωσής σας, μπορείτε να:",
          items: [
            "Κατεβάσετε ή μεταδώσετε αντίγραφο της Εφαρμογής σε μία συσκευή για τους σκοπούς σας.",
            "Χρησιμοποιήσετε την Τεκμηρίωση για υποστήριξη.",
            "Λαμβάνετε δωρεάν ενημερώσεις και διορθώσεις.",
          ],
          subsections: [
            {
              title: "6.1. Εύρος Άδειας για Επιχειρήσεις",
              content: "Η ΦΟΜΟ παρέχει την Υπηρεσία ώστε οι χρήστες να κάνουν online κρατήσεις, booking και παραγγελίες. Ως ιδιοκτήτης/διοργανωτής, μπορείτε να καταχωρίσετε τις εγκαταστάσεις σας, να ορίσετε τιμολόγηση, διαθεσιμότητα και να αλληλεπιδράτε με τους χρήστες. Υποχρεούστε να παρέχετε οικονομικά στοιχεία για την εκτέλεση της σύμβασης.",
              items: [],
            },
            {
              title: "6.2. Περιορισμοί Χρήσης",
              content: "Ισχύουν οι ίδιοι περιορισμοί με τους χρήστες εφαρμογής (Ενότητα 3), συμπεριλαμβανομένης της απαγόρευσης αντιγραφής, τροποποίησης, reverse engineering και κακόβουλης χρήσης.",
              items: [],
            },
            {
              title: "6.3. Ιδιοκτησία Δεδομένων",
              content: "Τα δεδομένα που συλλέγονται μέσω κρατήσεων/εκδηλώσεων θα είναι προσβάσιμα τόσο στον διοργανωτή όσο και στην επιχείρηση, εφόσον και οι δύο είναι εγγεγραμμένοι στην πλατφόρμα.",
              items: [],
            },
          ],
        },
        {
          icon: Building2,
          title: "7. Υποχρεώσεις Επιχειρήσεων/Διοργανωτών",
          content: "",
          subsections: [
            {
              title: "7.1. Συμμόρφωση με τη Νομοθεσία",
              content: "Η χρήση υπόκειται σε τήρηση όλων των νόμων. Δημιουργώντας εκδήλωση, η Επιχείρηση εγγυάται συμμόρφωση με τοπικούς κανονισμούς, νόμους περί ανηλίκων και αδειών αλκοόλ. Η Επιχείρηση αποζημιώνει τη ΦΟΜΟ για πρόστιμα ή κυρώσεις.",
              items: [],
            },
            {
              title: "7.2. Συμβατική Συμφωνία",
              content: "Η παρούσα Άδεια Χρήσης αποτελεί δεσμευτική σύμβαση. Ελλείψει ξεχωριστής σύμβασης, τα παρόντα έγγραφα διέπουν τη σχέση. Η άδεια δεν μεταβιβάζεται. Η ΦΟΜΟ δεν αναλαμβάνει ευθύνη για εσωτερικές οικονομικές ρυθμίσεις μεταξύ Επιχείρησης και τρίτων.",
              items: [],
            },
            {
              title: "7.3. Υπηρεσίες Πληρωμής",
              content: "Η πληρωμή για τις Υπηρεσίες μας γίνεται σε μηνιαία, τριμηνιαία, εξαμηνιαία ή ετήσια βάση, ανάλογα με το πλάνο που επιλέξατε.",
              items: [],
            },
            {
              title: "7.4. Ακυρώσεις & Επιστροφές",
              content: "Τα τέλη υπηρεσίας/κράτησης της ΦΟΜΟ δεν επιστρέφονται, εκτός αν απαιτείται νομικά.",
              items: [
                "Ακύρωση εκδήλωσης από επιχείρηση: Ο χρήστης δικαιούται επιστροφή ποσού (εκτός τελών ΦΟΜΟ).",
                "Αλλαγή ημερομηνίας/τοποθεσίας: Επιστροφή σε χρήστες που δεν μπορούν να παρευρεθούν.",
                "Ακύρωση από χρήστη >48 ώρες πριν: Δυνατή επιστροφή κατόπιν συμφωνίας με την επιχείρηση.",
                "Ακύρωση <48 ώρες πριν: Δεν γίνεται επιστροφή εκτός αν η επιχείρηση συμφωνεί.",
                "Προωθητικές πληρωμές: Δεν επιστρέφονται, ανεξαρτήτως αποτελεσμάτων.",
              ],
            },
            {
              title: "7.5. Φορολογική Συμμόρφωση (ΦΠΑ)",
              content: "Η ΦΟΜΟ λειτουργεί αποκλειστικά ως ενδιάμεσος. Η Επιχείρηση φέρει την ευθύνη για τον καθορισμό, την εφαρμογή και την απόδοση ΦΠΑ ή άλλων φόρων. Η Επιχείρηση αποζημιώνει τη ΦΟΜΟ για τυχόν αξιώσεις λόγω μη φορολογικής συμμόρφωσης.",
              items: [],
            },
          ],
        },
        {
          icon: Eye,
          title: "8. Επεξεργασία Δεδομένων & Συμμόρφωση (GDPR)",
          content: "Η ΦΟΜΟ ενεργεί ως Υπεύθυνος Επεξεργασίας (Data Controller). Οι Επιχειρήσεις/Διοργανωτές που λαμβάνουν πρόσβαση σε δεδομένα χρηστών αναλαμβάνουν τον ρόλο του Εκτελούντος Επεξεργασία (Data Processor) σύμφωνα με τον GDPR.",
          subsections: [
            {
              title: "8.1. Κατηγορίες Δεδομένων",
              content: "Τα προσωπικά δεδομένα που συλλέγονται περιλαμβάνουν:",
              items: [
                "Δεδομένα ταυτότητας: Όνομα, email, τηλέφωνο, ημερομηνία γέννησης.",
                "Δεδομένα συναλλαγών: Ιστορικό κρατήσεων, πληρωμών, προτιμήσεις.",
                "Δεδομένα εκδηλώσεων: Εισιτήρια, κρατήσεις, παρουσίες.",
              ],
            },
            {
              title: "8.2. Υποχρεώσεις Εκτελούντος Επεξεργασία",
              content: "Ο Εκτελών Επεξεργασία πρέπει:",
              items: [
                "Να επεξεργάζεται δεδομένα μόνο για υπηρεσίες μέσω της ΦΟΜΟ.",
                "Να μην αποθηκεύει ή χρησιμοποιεί δεδομένα για εξωτερικό marketing χωρίς ρητή συγκατάθεση.",
                "Να διατηρεί εμπιστευτικότητα και να εξασφαλίζει ότι υπάλληλοι/υπεργολάβοι συμμορφώνονται με τα πρότυπα GDPR.",
                "Να εφαρμόζει κατάλληλα τεχνικά και οργανωτικά μέτρα ασφαλείας (Άρθρο 32 GDPR).",
              ],
            },
            {
              title: "8.3. Ασφάλεια & Αναφορά Παραβίασης",
              content: "Ο Εκτελών Επεξεργασία οφείλει να ειδοποιεί χωρίς καθυστέρηση σε περίπτωση Παραβίασης Προσωπικών Δεδομένων, να συνεργάζεται στη διερεύνηση και αποκατάσταση.",
              items: [],
            },
            {
              title: "8.4. Περιορισμοί Υποεπεξεργασίας",
              content: "Πριν τη χρήση νέου Υποεπεξεργαστή, ο Εκτελών Επεξεργασία οφείλει γραπτή ειδοποίηση 30 ημερών. Η ΦΟΜΟ διατηρεί το δικαίωμα αντίρρησης εντός 30 ημερών.",
              items: [],
            },
            {
              title: "8.5. Μεταφορά Δεδομένων",
              content: "Δεν επιτρέπεται μεταφορά δεδομένων εκτός ΕΕ/ΕΟΧ χωρίς γραπτή συγκατάθεση. Τυχόν μεταφορές διέπονται από Τυπικές Συμβατικές Ρήτρες (SCCs) εγκεκριμένες από την Ευρωπαϊκή Επιτροπή.",
              items: [],
            },
            {
              title: "8.6. Έλεγχος & Συμμόρφωση",
              content: "Ο Εκτελών Επεξεργασία οφείλει να παρέχει πληροφορίες συμμόρφωσης κατ' αίτηση και να επιτρέπει ελέγχους (μέχρι μία φορά ανά ημερολογιακό έτος, με 30 ημερών γραπτή ειδοποίηση).",
              items: [],
            },
            {
              title: "8.7. Δικαιώματα Υποκειμένων Δεδομένων",
              content: "Ο Εκτελών Επεξεργασία οφείλει να ειδοποιεί αμέσως τη ΦΟΜΟ αν λάβει αίτημα υποκειμένου δεδομένων και να μην απαντά χωρίς οδηγίες, εκτός αν απαιτείται νομικά.",
              items: [],
            },
            {
              title: "8.8. Εμπιστευτικότητα",
              content: "Όλο το προσωπικό που χειρίζεται δεδομένα πρέπει να δεσμεύεται από συμφωνίες εμπιστευτικότητας. Η πρόσβαση περιορίζεται στο αναγκαίο.",
              items: [],
            },
            {
              title: "8.9. Ευθύνη για Παραβιάσεις GDPR",
              content: "Ο Εκτελών Επεξεργασία ευθύνεται για παραβιάσεις GDPR και αποζημιώνει πλήρως τη ΦΟΜΟ για πρόστιμα ή αγωγές.",
              items: [],
            },
            {
              title: "8.10. Διαγραφή Δεδομένων",
              content: "Κατά τη λήξη της Άδειας, ο Εκτελών Επεξεργασία θα επιστρέψει ή/και θα διαγράψει με ασφάλεια όλα τα δεδομένα εντός 30 ημερών, εκτός αν απαιτείται νομικά η διατήρησή τους.",
              items: [],
            },
          ],
        },
        {
          icon: Smartphone,
          title: "9. Ενημερώσεις & Υποστήριξη",
          content: "",
          subsections: [
            {
              title: "9.1. Απαιτήσεις Λειτουργικού Συστήματος",
              content: "Ελάχιστες απαιτήσεις (τύπος συσκευής, μνήμη, λειτουργικό σύστημα) μπορεί να ορίζονται στον ιστότοπό μας ή στα app stores.",
              items: [],
            },
            {
              title: "9.2. Ενημερώσεις Λογισμικού",
              content: "Κατά καιρούς, ενημερώνουμε αυτόματα την Εφαρμογή για βελτίωση απόδοσης, λειτουργικότητας ή ασφάλειας. Αν δεν εγκαταστήσετε ενημερώσεις, ενδέχεται να μην μπορείτε να συνεχίσετε τη χρήση.",
              items: [],
            },
            {
              title: "9.3. Τεχνική Υποστήριξη",
              content: "Για προβλήματα ή ερωτήσεις, επικοινωνήστε μέσω support@fomocy.com ή μέσω του ιστοτόπου μας.",
              items: [],
            },
            {
              title: "9.4. Επικοινωνία",
              content: "Αν χρειαστεί να επικοινωνήσουμε μαζί σας, θα το κάνουμε μέσω email ή/και SMS, χρησιμοποιώντας τα στοιχεία επικοινωνίας που μας έχετε παράσχει.",
              items: [],
            },
          ],
        },
        {
          icon: AlertTriangle,
          title: "10. Τερματισμός Άδειας",
          content: "",
          subsections: [
            {
              title: "10.1. Τερματισμός",
              content: "Η ΦΟΜΟ, κατά τη διακριτική της ευχέρεια, μπορεί να αναστείλει ή να τερματίσει την πρόσβασή σας οποιαδήποτε στιγμή, με ή χωρίς ειδοποίηση, σε περιπτώσεις πραγματικής ή ύποπτης απάτης, παραβίασης αυτής της συμφωνίας ή νόμων.",
              items: [],
            },
            {
              title: "10.2. Συνέπειες Τερματισμού",
              content: "Μετά τον τερματισμό:",
              items: [
                "Πρέπει να σταματήσετε κάθε χρήση της Εφαρμογής.",
                "Πρέπει να διαγράψετε την Εφαρμογή από όλες τις συσκευές σας.",
                "Ενδέχεται να αφαιρέσουμε απομακρυσμένα την Εφαρμογή από τις συσκευές σας.",
              ],
            },
            {
              title: "10.3. Μεταβίβαση Συμφωνίας",
              content: "Μπορούμε να μεταβιβάσουμε τα δικαιώματα και τις υποχρεώσεις μας σε άλλον οργανισμό. Θα σας ενημερώσουμε πάντα γραπτώς.",
              items: [],
            },
          ],
        },
        {
          icon: Scale,
          title: "11. Περιορισμός Ευθύνης",
          content: "",
          subsections: [
            {
              title: "11.1. Αποποίηση Εγγυήσεων",
              content: "Η υπηρεσία παρέχεται «ως έχει» (as is), χωρίς εγγυήσεις ρητές ή σιωπηρές, σύμφωνα με τους νόμους της Κυπριακής Δημοκρατίας.",
              items: [],
            },
            {
              title: "11.2. Περιορισμός Ευθύνης",
              content: "Σε καμία περίπτωση η ΦΟΜΟ δεν ευθύνεται για έμμεσες, ειδικές ή επακόλουθες ζημίες, συμπεριλαμβανομένων απωλειών κερδών ή διακοπής εργασιών. Η Εφαρμογή προορίζεται για οικιακή και ιδιωτική χρήση. Συνιστούμε backup όλου του περιεχομένου.",
              items: [],
            },
            {
              title: "11.3. Αποζημίωση",
              content: "Είμαστε υπεύθυνοι για προβλέψιμη απώλεια λόγω δικής μας αμέλειας. Δεν αποκλείουμε ευθύνη όπου αυτό θα ήταν παράνομο (θάνατος, σωματική βλάβη, απάτη). Δεν φέρουμε ευθύνη για γεγονότα εκτός ελέγχου μας.",
              items: [],
            },
          ],
        },
        {
          icon: Gavel,
          title: "12. Εφαρμοστέο Δίκαιο",
          content: "",
          subsections: [
            {
              title: "12.1. Δικαιοδοσία",
              content: "Η παρούσα Άδεια διέπεται από τους νόμους της Κυπριακής Δημοκρατίας. Δεν μπορείτε να στερηθείτε δικαιωμάτων που σας παρέχει η υποχρεωτική νομοθεσία προστασίας καταναλωτή.",
              items: [],
            },
            {
              title: "12.2. Επίλυση Διαφορών",
              content: "Οι διαφορές θα επιλύονται από τα αρμόδια δικαστήρια της Κυπριακής Δημοκρατίας. Αν είστε κάτοικος ΕΕ, μπορείτε να χρησιμοποιήσετε την πλατφόρμα ODR της Ευρωπαϊκής Επιτροπής. Μπορείτε επίσης να προσφύγετε στην Κυπριακή Υπηρεσία Προστασίας Καταναλωτή.",
              items: [],
            },
          ],
        },
        {
          icon: RefreshCw,
          title: "13. Αλλαγές στην Άδεια Χρήσης",
          content: "Αναθεωρούμε περιοδικά αυτήν την Άδεια Χρήσης. Η ΦΟΜΟ διατηρεί το δικαίωμα τροποποίησης ανά πάσα στιγμή. Οι αλλαγές θα δημοσιεύονται σε αυτή τη σελίδα και, όπου ενδείκνυται, θα ειδοποιείστε κατά την επόμενη χρήση. Για ουσιώδεις αλλαγές, θα λάβετε ειδοποίηση μέσω email ή μέσω της Εφαρμογής πριν τεθούν σε ισχύ.",
          items: [],
        },
      ],
      contact: {
        title: "Επικοινωνία",
        content: "Για ερωτήσεις σχετικά με αυτήν την Άδεια Χρήσης:",
        email: "support@fomocy.com",
        address: "ΦΟΜΟ Cyprus, Λευκωσία, Κύπρος",
      },
    },
    en: {
      title: "License Agreement",
      lastUpdated: "Last updated: April 2026",
      intro: "This License Agreement explains the terms under which ΦΟΜΟ Cyprus (hereinafter \"ΦΟΜΟ\", \"we\", \"the company\"), headquartered in Nicosia, Cyprus, provides users with:\n\n• The ΦΟΜΟ mobile application (the \"App\"), available on our website at fomo.com.cy and as a progressive web app, or via App Store / Google Play Store.\n• The data supplied with the App, and any updates or supplements to it.\n• The related online documentation (Documentation).\n• The service you connect to via the App and the content we provide to you through it (Service).\n\nBy downloading, installing, or using the App, you explicitly agree to be bound by this License Agreement and the Terms of Use that accompany it. If you do not agree, please refrain from using the software.\n\nThe ways in which you can use the App may also be controlled by the rules of the Apple App Store (for iOS) or Google Play Store (for Android). Where there are differences, the respective store's rules will prevail.",
      sections: [
        {
          icon: Shield,
          title: "1. Data Protection & Privacy",
          content: "Under data protection legislation, we are required to provide you with certain information including who we are, how we process your personal data and for what purposes, and your rights in relation to your personal data. This information is provided in our Privacy Policy.",
          items: [],
        },
        {
          icon: Users,
          title: "2. Application Users License Rights",
          content: "In return for your agreeing to comply with these terms you may:",
          items: [
            "Download or stream a copy of the App onto one device and use it for your personal purposes only.",
            "Use any Documentation to support your permitted use of the App and the Service.",
            "Receive and use any free supplementary software code or updates incorporating patches and corrections.",
          ],
          subsections: [
            {
              title: "2.1. Age Requirements",
              content: "You must be above the legal age for your country to accept these terms. You must also be above the legal drinking or age of entry for the country where the service is taking place. By using our services, you confirm that you meet the age requirements of the venue and local laws.",
              items: [],
            },
            {
              title: "2.2. Scope of License",
              content: "ΦΟΜΟ provides the Service to enable users to make online reservations, and to use the application's ticketing/booking and ordering services at participating events or directly at participating venues.",
              items: [
                "To make a booking, you will need to provide your name, phone number, and email address. By providing your email, you agree to receive information about your reservation.",
                "All bookings are subject to availability and are not confirmed until you receive a confirmation email.",
                "Even if a booking is confirmed, the Venue/Event Organizer retains the right to reject a user. ΦΟΜΟ shall not be held liable for any actions taken by the Venue/Event Organizer.",
                "The App incorporates ordering services. Users can pre-order or place orders on-site.",
              ],
            },
          ],
        },
        {
          icon: Ban,
          title: "3. Restrictions on Use",
          content: "You agree that you will:",
          items: [
            "Not rent, lease, sub-license, loan, or make available the App to any person without our written consent.",
            "Not copy the App except as part of normal use or for back-up/operational security.",
            "Not translate, merge, adapt, vary, alter or modify any part of the App.",
            "Not disassemble, de-compile, reverse engineer or create derivative works from the App.",
            "Not use the App in any unlawful manner or insert malicious code.",
            "Not infringe our intellectual property rights or those of any third party.",
            "Not transmit any defamatory, offensive or objectionable material.",
            "Not collect or harvest any information or data from our systems.",
          ],
        },
        {
          icon: Lock,
          title: "4. Intellectual Property Rights",
          content: "All intellectual property rights in the App, Documentation and Services worldwide belong to us (or our licensors). The rights in the App and Services are licensed (not sold) to you. You have no intellectual property rights in, or to, the App, Documentation or Services other than the right to use them in accordance with these terms.",
          items: [],
        },
        {
          icon: UserCheck,
          title: "5. Application Users Obligations",
          content: "",
          subsections: [
            {
              title: "5.1. Compliance with Laws",
              content: "The licensed use of the application is contingent upon your adherence to all applicable laws and regulations. Any violation may result in license revocation and legal action.",
              items: [],
            },
            {
              title: "5.2. Booking/Service Fee",
              content: "Upon booking a service or reservation, you are required to pay the associated booking/service fee or ordering fee, as applicable.",
              items: [],
            },
            {
              title: "5.3. No-Show Policy",
              content: "You must adhere to each Venue's/Event Organizer's booking and cancellation policy. If no such policy exists, ΦΟΜΟ requires at least 48 hours' notice of cancellation.",
              items: [],
            },
            {
              title: "5.4. Third Party Content",
              content: "The Services may contain links to third-party websites and applications. ΦΟΜΟ is not responsible for such content. You use all Third-Party Content at your own risk.",
              items: [],
            },
            {
              title: "5.5. Transfer of Rights",
              content: "You may only transfer your rights or obligations under these terms to another person if we agree in writing.",
              items: [],
            },
          ],
        },
        {
          icon: Store,
          title: "6. Venues/Event Organizers License Rights",
          content: "In return for your agreeing to comply with these terms you may:",
          items: [
            "Download or stream a copy of the App onto one device and use it for your purposes.",
            "Use any Documentation to support your permitted use.",
            "Receive and use any free updates and patches.",
          ],
          subsections: [
            {
              title: "6.1. Scope of License for Businesses",
              content: "ΦΟΜΟ provides the Service to enable users to make online bookings, reservations and orders. As a venue owner/organizer, you can list your facilities, set pricing, define availability, and interact with users. You are required to provide financial details for contract execution.",
              items: [],
            },
            {
              title: "6.2. Restrictions on Use",
              content: "The same restrictions as for Application Users (Section 3) apply, including the prohibition of copying, modification, reverse engineering and malicious use.",
              items: [],
            },
            {
              title: "6.3. Data Ownership",
              content: "Data collected from events or bookings managed through the Platform will be accessible to both the event organizer and the venue, provided both are onboarded as users of the Platform.",
              items: [],
            },
          ],
        },
        {
          icon: Building2,
          title: "7. Venues/Event Organizers Obligations",
          content: "",
          subsections: [
            {
              title: "7.1. Compliance with Laws",
              content: "By creating an event on the Platform, the Venue or Event Organizer warrants compliance with all local regulations, including minor protection and alcohol licensing laws. The Venue shall indemnify ΦΟΜΟ against any fines or penalties.",
              items: [],
            },
            {
              title: "7.2. Contractual Agreement",
              content: "This License Agreement constitutes a binding contractual agreement. In the absence of a separate contract, these documents shall govern the relationship. The license is non-transferable. ΦΟΜΟ assumes no liability for internal financial arrangements between Venues and third parties.",
              items: [],
            },
            {
              title: "7.3. Payment Services",
              content: "Payment for our Services is required on a monthly, quarterly, bi-annual, or annual basis, depending on the plan selected.",
              items: [],
            },
            {
              title: "7.4. Cancellations & Refunds",
              content: "ΦΟΜΟ's booking/service fees are non-refundable, except where legally required.",
              items: [
                "Venue/organizer cancels event: User is eligible for a refund (excluding ΦΟΜΟ fees).",
                "Date/location change: Refund available for users who cannot attend.",
                "User cancels >48 hours before: Refund possible subject to agreement with the venue.",
                "User cancels <48 hours before: No refund unless the venue agrees.",
                "Promotional payments: Non-refundable, regardless of campaign results.",
              ],
            },
            {
              title: "7.5. Tax & VAT Compliance",
              content: "ΦΟΜΟ operates solely as an intermediary. The Venue/Event Organizer is responsible for determining, applying, and remitting all applicable VAT, sales tax, or similar levies. The Venue shall indemnify ΦΟΜΟ against any claims from tax non-compliance.",
              items: [],
            },
          ],
        },
        {
          icon: Eye,
          title: "8. Data Processing & Compliance (GDPR)",
          content: "ΦΟΜΟ acts as the Data Controller. Venues/Event Organizers receiving access to user data assume the role of Data Processor in accordance with GDPR (Regulation (EU) 2016/679).",
          subsections: [
            {
              title: "8.1. Data Categories",
              content: "Personal data collected includes:",
              items: [
                "Identity Data: Name, email address, phone number, date of birth.",
                "Transactional Data: Booking history, payment details, preferences.",
                "Event Data: Tickets purchased, reservations, attendance records.",
              ],
            },
            {
              title: "8.2. Processor Obligations",
              content: "The Processor must:",
              items: [
                "Process data only as necessary for services through ΦΟΜΟ.",
                "Not store or use data for external marketing without explicit consent.",
                "Maintain confidentiality and ensure employees/subcontractors comply with GDPR.",
                "Implement appropriate technical and organizational security measures (Article 32 GDPR).",
              ],
            },
            {
              title: "8.3. Security & Breach Reporting",
              content: "The Processor must notify ΦΟΜΟ without undue delay upon becoming aware of a Personal Data Breach. The Processor shall cooperate in investigation, mitigation, and remediation.",
              items: [],
            },
            {
              title: "8.4. Subprocessing Restrictions",
              content: "Before engaging a new Subprocessor, the Processor must provide 30 days' written notice. ΦΟΜΟ reserves the right to object within 30 days.",
              items: [],
            },
            {
              title: "8.5. Data Transfer",
              content: "No transfer of data outside the EU/EEA without written consent. Any transfers shall be governed by EU-approved Standard Contractual Clauses (SCCs).",
              items: [],
            },
            {
              title: "8.6. Audit & Compliance",
              content: "The Processor must provide compliance information on request and allow audits (up to once per calendar year, with 30 days' written notice).",
              items: [],
            },
            {
              title: "8.7. Data Subject Rights",
              content: "The Processor must promptly notify ΦΟΜΟ of any data subject request and must not respond without instructions, except as required by law.",
              items: [],
            },
            {
              title: "8.8. Confidentiality",
              content: "All personnel handling personal data must be bound by confidentiality agreements. Access must be restricted to what is strictly necessary.",
              items: [],
            },
            {
              title: "8.9. Liability for GDPR Violations",
              content: "The Processor shall be liable for GDPR breaches and shall fully indemnify ΦΟΜΟ against any fines or lawsuits.",
              items: [],
            },
            {
              title: "8.10. Data Deletion",
              content: "Upon termination, the Processor shall return and/or securely delete all personal data within 30 days, unless further storage is required by law.",
              items: [],
            },
          ],
        },
        {
          icon: Smartphone,
          title: "9. Updates & Support",
          content: "",
          subsections: [
            {
              title: "9.1. Operating System Requirements",
              content: "Minimum specification requirements may be set out on our website or within the app stores where ΦΟΜΟ is available.",
              items: [],
            },
            {
              title: "9.2. Software Updates",
              content: "We may automatically update the App to improve performance, enhance functionality, or address security issues. If you choose not to install updates, you may not be able to continue using the App.",
              items: [],
            },
            {
              title: "9.3. Technical Support",
              content: "For issues or questions, please contact us at support@fomocy.com or via our website.",
              items: [],
            },
            {
              title: "9.4. Communication",
              content: "If we need to contact you, we will do so by email and/or SMS, using the contact details you have provided.",
              items: [],
            },
          ],
        },
        {
          icon: AlertTriangle,
          title: "10. Termination",
          content: "",
          subsections: [
            {
              title: "10.1. Termination of License",
              content: "ΦΟΜΟ may suspend or terminate your access at any time, with or without notice, in cases of actual or suspected fraud, or violations of this agreement or applicable laws.",
              items: [],
            },
            {
              title: "10.2. Effects of Termination",
              content: "Upon termination:",
              items: [
                "You must stop all use of the App and Services.",
                "You must delete the App from all your devices.",
                "We may remotely remove the App from your devices.",
              ],
            },
            {
              title: "10.3. Transfer of Agreement",
              content: "We may transfer our rights and obligations to another organization. We will always notify you in writing.",
              items: [],
            },
          ],
        },
        {
          icon: Scale,
          title: "11. Limitation of Liability",
          content: "",
          subsections: [
            {
              title: "11.1. Disclaimer of Warranties",
              content: "The service is provided on an \"as is\", \"as available\" basis, without warranties of any kind, either express or implied, under the laws of the Republic of Cyprus.",
              items: [],
            },
            {
              title: "11.2. Limitation of Liability",
              content: "Under no circumstances shall ΦΟΜΟ be liable for any indirect, special, or consequential damages, including lost profits or business interruption. The App is for domestic and private use. We recommend that you back up any content.",
              items: [],
            },
            {
              title: "11.3. Indemnification",
              content: "We are responsible for foreseeable loss caused by our negligence. We do not exclude liability where it would be unlawful (death, personal injury, fraud). We are not responsible for events outside our control.",
              items: [],
            },
          ],
        },
        {
          icon: Gavel,
          title: "12. Governing Law",
          content: "",
          subsections: [
            {
              title: "12.1. Jurisdiction",
              content: "This License Agreement shall be governed by the laws of the Republic of Cyprus. You cannot be deprived of rights granted by mandatory consumer protection laws.",
              items: [],
            },
            {
              title: "12.2. Dispute Resolution",
              content: "Disputes shall be resolved by the competent courts of the Republic of Cyprus. If you are an EU resident, you may also use the European Commission's ODR platform. You may also refer a dispute to the Cypriot Consumer Protection Service.",
              items: [],
            },
          ],
        },
        {
          icon: RefreshCw,
          title: "13. Changes to this License Agreement",
          content: "We periodically review this License Agreement. ΦΟΜΟ reserves the right to modify this agreement at any time. Changes will be posted on this page and, where appropriate, communicated during your next use. For material changes, we will provide notice via email or through the App before they take effect.",
          items: [],
        },
      ],
      contact: {
        title: "Contact",
        content: "For questions about this License Agreement:",
        email: "support@fomocy.com",
        address: "ΦΟΜΟ Cyprus, Nicosia, Cyprus",
      },
    },
  };

  const content = t[language];

  return (
    <>
      <InfoNavbar />
      <div className="min-h-screen bg-background pt-16 sm:pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {content.title}
            </h1>
            <p className="text-muted-foreground text-sm">{content.lastUpdated}</p>
          </div>

          {/* Intro */}
          <Card className="mb-8 border-primary/20">
            <CardContent className="p-6">
              <p className="text-foreground/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {content.intro}
              </p>
            </CardContent>
          </Card>

          {/* Sections */}
          <div className="space-y-6">
            {content.sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="font-poppins text-lg sm:text-xl font-semibold text-foreground pt-1.5">
                        {section.title}
                      </h2>
                    </div>

                    {section.content && (
                      <p className="text-foreground/70 text-sm sm:text-base leading-relaxed mb-4 ml-[52px]">
                        {section.content}
                      </p>
                    )}

                    {section.items && section.items.length > 0 && (
                      <ul className="space-y-2 ml-[52px] mb-4">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-foreground/70 text-sm sm:text-base">
                            <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.subsections?.map((sub, si) => (
                      <div key={si} className="ml-[52px] mb-4 last:mb-0">
                        <h3 className="font-poppins font-semibold text-foreground text-sm sm:text-base mb-2">
                          {sub.title}
                        </h3>
                        {sub.content && (
                          <p className="text-foreground/70 text-sm leading-relaxed mb-2">
                            {sub.content}
                          </p>
                        )}
                        {sub.items && sub.items.length > 0 && (
                          <ul className="space-y-1.5">
                            {sub.items.map((item, ii) => (
                              <li key={ii} className="flex items-start gap-2 text-foreground/70 text-sm">
                                <span className="text-primary mt-1 flex-shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact */}
          <Card className="mt-8 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-poppins text-lg font-semibold text-foreground mb-2">
                    {content.contact.title}
                  </h2>
                  <p className="text-foreground/70 text-sm mb-2">{content.contact.content}</p>
                  <p className="text-sm">
                    <span className="text-foreground/50">Email: </span>
                    <a href={`mailto:${content.contact.email}`} className="text-primary hover:underline">
                      {content.contact.email}
                    </a>
                  </p>
                  <p className="text-foreground/50 text-sm mt-1">{content.contact.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default LicenseAgreement;
