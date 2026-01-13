import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Gift, Ticket, Star, CheckCircle, XCircle, FileText, Mail, Lightbulb, Eye, MousePointer, MapPin, Info } from 'lucide-react';
import { useGuidanceData } from '@/hooks/useGuidanceData';
import { useToast } from '@/hooks/use-toast';

const translations = {
  el: {
    title: 'Καθοδήγηση',
    subtitle: 'Πότε και πώς να χρησιμοποιήσεις την προβολή για μέγιστα αποτελέσματα',
    featuredProfile: 'Επιλεγμένο Προφίλ',
    boostedOffers: 'Boosted Offers',
    boostedEvents: 'Boosted Events',
    metric: 'Μετρική',
    views: 'Προβολές',
    interactions: 'Αλληλεπιδράσεις',
    visits: 'Επισκέψεις',
    bestTimes: 'Καλύτερες Ώρες',
    tips: 'Συμβουλές',
    profileViewsTip: 'Δημοσίευσε προσφορές ή εκδηλώσεις λίγο πριν από αυτά τα διαστήματα για μέγιστη έκθεση.',
    profileInteractionsTip: 'Εδώ ο κόσμος αποθηκεύει και δηλώνει πρόθεση. Φρόντισε το περιεχόμενο να είναι ενεργό.',
    profileVisitsTip: 'Αυτές οι ώρες δείχνουν πότε έρχεται πραγματικά ο κόσμος. Χρησιμοποίησέ τες ως στόχο.',
    offerViewsTip: 'Κάνε προβολή της προσφοράς σε αυτά τα διαστήματα για περισσότερες προβολές.',
    offerInteractionsTip: 'Σε αυτές τις ώρες ο κόσμος αποφασίζει αν θα έρθει.',
    offerVisitsTip: 'Η προβολή αποδίδει περισσότερο εδώ. Εκτός αυτών των ωρών, η διαφορά είναι περιορισμένη.',
    eventViewsTip: 'Ανέβασε και προώθησε το event σε αυτά τα διαστήματα.',
    eventInteractionsTip: 'Εδώ ο κόσμος δηλώνει ότι θα πάει.',
    eventVisitsTip: 'Η προβολή έχει ουσιαστικό αποτέλεσμα σε αυτά τα διαστήματα.',
    recommendedPlan: 'Προτεινόμενο Πλάνο',
    publish: 'Δημοσίευση / Προβολή',
    targetInteractions: 'Στόχευση Αλληλεπιδράσεων',
    targetVisits: 'Στόχευση Επισκέψεων',
    planNote: 'Αυτό το πλάνο αξιοποιεί καλύτερα τα boost credits σου.',
    application: 'Εφαρμογή & Έλεγχος',
    applied: 'Το εφάρμοσα',
    notApplied: 'Δεν το εφάρμοσα',
    report: 'Αναφορά Καθοδήγησης',
    downloadPdf: 'PDF',
    sendEmail: 'Email',
    feedbackSaved: 'Η επιλογή σου αποθηκεύτηκε!',
    emailSent: 'Η αναφορά στάλθηκε στο email σου!',
    noData: 'Χρειάζονται περισσότερα δεδομένα για ασφαλή καθοδήγηση.',
    dataSource: 'Πηγή δεδομένων',
    // Metric explanations
    profileViewsExplanation: 'Βέλτιστες ώρες για προβολές προφίλ',
    profileViewsDetails: 'Οι ώρες που οι περισσότεροι χρήστες βλέπουν επιλεγμένα προφίλ στο feed. Δημοσίευσε προσφορές/εκδηλώσεις λίγο πριν.',
    profileViewsSource: 'Ιστορικό προβολών feed',
    profileInteractionsExplanation: 'Βέλτιστες ώρες για αλληλεπιδράσεις',
    profileInteractionsDetails: 'Οι ώρες που ο κόσμος αποθηκεύει, κάνει follow και shares. Φρόντισε το περιεχόμενο να είναι ενεργό.',
    profileInteractionsSource: 'Ιστορικό αλληλεπιδράσεων',
    profileVisitsExplanation: 'Βέλτιστες ώρες για επισκέψεις',
    profileVisitsDetails: 'Οι ώρες που ο κόσμος έρχεται πραγματικά. Στόχευσε αυτές τις ώρες για μέγιστη απόδοση.',
    profileVisitsSource: 'Ιστορικό check-ins',
    offersViewsExplanation: 'Βέλτιστες ώρες για προβολές προσφορών',
    offersViewsDetails: 'Οι ώρες που οι προσφορές λαμβάνουν περισσότερες προβολές. Προγραμμάτισε boost σε αυτά τα διαστήματα.',
    offersViewsSource: 'Ιστορικό προβολών προσφορών',
    offersInteractionsExplanation: 'Βέλτιστες ώρες για ενδιαφέρον',
    offersInteractionsDetails: 'Οι ώρες που ο κόσμος αποφασίζει αν θα εξαργυρώσει την προσφορά.',
    offersInteractionsSource: 'Ιστορικό αλληλεπιδράσεων',
    offersVisitsExplanation: 'Βέλτιστες ώρες για εξαργυρώσεις',
    offersVisitsDetails: 'Οι ώρες που οι περισσότεροι έρχονται για εξαργύρωση. Η προβολή αποδίδει περισσότερο εδώ.',
    offersVisitsSource: 'Ιστορικό εξαργυρώσεων',
    eventsViewsExplanation: 'Βέλτιστες ώρες για προβολές events',
    eventsViewsDetails: 'Οι ώρες που τα events λαμβάνουν περισσότερες προβολές. Ανέβασε και προώθησε σε αυτά τα διαστήματα.',
    eventsViewsSource: 'Ιστορικό προβολών events',
    eventsInteractionsExplanation: 'Βέλτιστες ώρες για RSVPs',
    eventsInteractionsDetails: 'Οι ώρες που ο κόσμος δηλώνει "Ενδιαφέρομαι" ή "Θα πάω".',
    eventsInteractionsSource: 'Ιστορικό RSVPs',
    eventsVisitsExplanation: 'Βέλτιστες ώρες για check-ins',
    eventsVisitsDetails: 'Οι ώρες με τα περισσότερα check-ins. Η προβολή έχει ουσιαστικό αποτέλεσμα εδώ.',
    eventsVisitsSource: 'Ιστορικό check-ins events',
  },
  en: {
    title: 'Guidance',
    subtitle: 'When and how to use boost for maximum results',
    featuredProfile: 'Featured Profile',
    boostedOffers: 'Boosted Offers',
    boostedEvents: 'Boosted Events',
    metric: 'Metric',
    views: 'Views',
    interactions: 'Interactions',
    visits: 'Visits',
    bestTimes: 'Best Times',
    tips: 'Tips',
    profileViewsTip: 'Post offers or events just before these windows for maximum exposure.',
    profileInteractionsTip: 'This is when people save and express intent. Make sure content is active.',
    profileVisitsTip: 'These times show when people actually come. Use them as your target.',
    offerViewsTip: 'Boost your offer during these windows for more views.',
    offerInteractionsTip: 'During these hours, people decide whether to visit.',
    offerVisitsTip: 'Boost performs best here. Outside these times, the difference is limited.',
    eventViewsTip: 'Upload and promote your event during these windows.',
    eventInteractionsTip: 'This is when people RSVP.',
    eventVisitsTip: 'Boost has the most impact during these windows.',
    recommendedPlan: 'Recommended Plan',
    publish: 'Publish / Boost',
    targetInteractions: 'Target Interactions',
    targetVisits: 'Target Visits',
    planNote: 'This plan maximizes your boost credits.',
    application: 'Application & Review',
    applied: 'I applied it',
    notApplied: "I didn't apply it",
    report: 'Guidance Report',
    downloadPdf: 'PDF',
    sendEmail: 'Email',
    feedbackSaved: 'Your choice was saved!',
    emailSent: 'Report sent to your email!',
    noData: 'More data needed for reliable guidance.',
    dataSource: 'Data source',
    // Metric explanations
    profileViewsExplanation: 'Best times for profile views',
    profileViewsDetails: 'Hours when most users see featured profiles in feed. Post offers/events just before these times.',
    profileViewsSource: 'Feed views history',
    profileInteractionsExplanation: 'Best times for interactions',
    profileInteractionsDetails: 'Hours when people save, follow and share. Make sure content is active during these times.',
    profileInteractionsSource: 'Interactions history',
    profileVisitsExplanation: 'Best times for visits',
    profileVisitsDetails: 'Hours when people actually come. Target these times for maximum results.',
    profileVisitsSource: 'Check-ins history',
    offersViewsExplanation: 'Best times for offer views',
    offersViewsDetails: 'Hours when offers get the most views. Schedule boosts during these windows.',
    offersViewsSource: 'Offer views history',
    offersInteractionsExplanation: 'Best times for interest',
    offersInteractionsDetails: 'Hours when people decide whether to redeem the offer.',
    offersInteractionsSource: 'Interactions history',
    offersVisitsExplanation: 'Best times for redemptions',
    offersVisitsDetails: 'Hours when most people come to redeem. Boost performs best here.',
    offersVisitsSource: 'Redemptions history',
    eventsViewsExplanation: 'Best times for event views',
    eventsViewsDetails: 'Hours when events get the most views. Upload and promote during these windows.',
    eventsViewsSource: 'Event views history',
    eventsInteractionsExplanation: 'Best times for RSVPs',
    eventsInteractionsDetails: 'Hours when people mark "Interested" or "Going".',
    eventsInteractionsSource: 'RSVPs history',
    eventsVisitsExplanation: 'Best times for check-ins',
    eventsVisitsDetails: 'Hours with the most check-ins. Boost has the most impact here.',
    eventsVisitsSource: 'Event check-ins history',
  },
};

interface GuidanceTabProps {
  businessId: string;
  language: 'el' | 'en';
}

type BlockType = 'profile' | 'offers' | 'events';

interface MetricExplanation {
  explanation: string;
  details: string;
  source: string;
}

const getGuidanceExplanations = (language: 'el' | 'en', blockType: BlockType): { views: MetricExplanation; interactions: MetricExplanation; visits: MetricExplanation } => {
  const t = translations[language];
  const explanations = {
    profile: {
      views: { explanation: t.profileViewsExplanation, details: t.profileViewsDetails, source: t.profileViewsSource },
      interactions: { explanation: t.profileInteractionsExplanation, details: t.profileInteractionsDetails, source: t.profileInteractionsSource },
      visits: { explanation: t.profileVisitsExplanation, details: t.profileVisitsDetails, source: t.profileVisitsSource },
    },
    offers: {
      views: { explanation: t.offersViewsExplanation, details: t.offersViewsDetails, source: t.offersViewsSource },
      interactions: { explanation: t.offersInteractionsExplanation, details: t.offersInteractionsDetails, source: t.offersInteractionsSource },
      visits: { explanation: t.offersVisitsExplanation, details: t.offersVisitsDetails, source: t.offersVisitsSource },
    },
    events: {
      views: { explanation: t.eventsViewsExplanation, details: t.eventsViewsDetails, source: t.eventsViewsSource },
      interactions: { explanation: t.eventsInteractionsExplanation, details: t.eventsInteractionsDetails, source: t.eventsInteractionsSource },
      visits: { explanation: t.eventsVisitsExplanation, details: t.eventsVisitsDetails, source: t.eventsVisitsSource },
    },
  };
  return explanations[blockType];
};

interface GuidanceTableProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data: {
    views: Array<{ day: string; hours: string; count: number }>;
    interactions: Array<{ day: string; hours: string; count: number }>;
    visits: Array<{ day: string; hours: string; count: number }>;
  };
  tips: {
    views: string;
    interactions: string;
    visits: string;
  };
  language: 'el' | 'en';
  blockType: BlockType;
}

interface ClickableGuidanceRowProps {
  label: string;
  icon: React.ElementType;
  windows: Array<{ day: string; hours: string; count: number }>;
  explanation: MetricExplanation;
  tip: string;
  dataSourceLabel: string;
}

const ClickableGuidanceRow: React.FC<ClickableGuidanceRowProps> = ({
  label,
  icon: Icon,
  windows,
  explanation,
  tip,
  dataSourceLabel,
}) => {
  const formatWindows = (wins: Array<{ day: string; hours: string; count: number }>) => {
    if (!wins || wins.length === 0) return '—';
    return wins.map(w => `${w.day} ${w.hours}`).join(' / ');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <tr className="border-b cursor-pointer hover:bg-muted/50 transition-colors group">
          <td className="py-3">
            <span className="flex items-center gap-1">
              {label}
              <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </span>
          </td>
          <td className="text-right py-3 font-medium">{formatWindows(windows)}</td>
        </tr>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{label}</DialogTitle>
              <DialogDescription>{explanation.explanation}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold text-foreground">{formatWindows(windows)}</p>
          </div>
          <p className="text-sm text-muted-foreground">{explanation.details}</p>
          <div className="p-3 bg-yellow-500/10 rounded-lg flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">{tip}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{dataSourceLabel}:</span> {explanation.source}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GuidanceTable: React.FC<GuidanceTableProps> = ({
  title,
  icon: Icon,
  iconColor,
  data,
  tips,
  language,
  blockType,
}) => {
  const t = translations[language];
  const explanations = getGuidanceExplanations(language, blockType);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">{t.metric}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t.bestTimes}</th>
              </tr>
            </thead>
            <tbody>
              <ClickableGuidanceRow
                label={t.views}
                icon={Eye}
                windows={data.views}
                explanation={explanations.views}
                tip={tips.views}
                dataSourceLabel={t.dataSource}
              />
              <ClickableGuidanceRow
                label={t.interactions}
                icon={MousePointer}
                windows={data.interactions}
                explanation={explanations.interactions}
                tip={tips.interactions}
                dataSourceLabel={t.dataSource}
              />
              <ClickableGuidanceRow
                label={t.visits}
                icon={MapPin}
                windows={data.visits}
                explanation={explanations.visits}
                tip={tips.visits}
                dataSourceLabel={t.dataSource}
              />
            </tbody>
          </table>
        </div>

        {/* Tips summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            {t.tips}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground pl-6">
              <span className="font-medium">{t.views}:</span> {tips.views}
            </p>
            <p className="text-sm text-muted-foreground pl-6">
              <span className="font-medium">{t.interactions}:</span> {tips.interactions}
            </p>
            <p className="text-sm text-muted-foreground pl-6">
              <span className="font-medium">{t.visits}:</span> {tips.visits}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const GuidanceTab: React.FC<GuidanceTabProps> = ({
  businessId,
  language,
}) => {
  const t = translations[language];
  const { data, isLoading } = useGuidanceData(businessId);
  const { toast } = useToast();
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleFeedback = async (applied: boolean) => {
    setFeedbackGiven(applied);
    toast({
      title: t.feedbackSaved,
    });
  };

  const handleDownloadPdf = () => {
    toast({
      title: 'PDF',
      description: language === 'el' ? 'Η δυνατότητα PDF έρχεται σύντομα!' : 'PDF feature coming soon!',
    });
  };

  const handleSendEmail = async () => {
    toast({
      title: t.emailSent,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noData}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      <GuidanceTable
        title={t.featuredProfile}
        icon={Crown}
        iconColor="text-yellow-500"
        data={data.profile}
        tips={{
          views: t.profileViewsTip,
          interactions: t.profileInteractionsTip,
          visits: t.profileVisitsTip,
        }}
        language={language}
        blockType="profile"
      />

      <GuidanceTable
        title={t.boostedOffers}
        icon={Gift}
        iconColor="text-orange-500"
        data={data.offers}
        tips={{
          views: t.offerViewsTip,
          interactions: t.offerInteractionsTip,
          visits: t.offerVisitsTip,
        }}
        language={language}
        blockType="offers"
      />

      <GuidanceTable
        title={t.boostedEvents}
        icon={Ticket}
        iconColor="text-purple-500"
        data={data.events}
        tips={{
          views: t.eventViewsTip,
          interactions: t.eventInteractionsTip,
          visits: t.eventVisitsTip,
        }}
        language={language}
        blockType="events"
      />

      {/* Recommended Plan */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {t.recommendedPlan}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.publish}</p>
              <p className="font-medium">{data.recommendedPlan.publish.day} {data.recommendedPlan.publish.hours}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.targetInteractions}</p>
              <p className="font-medium">{data.recommendedPlan.interactions.day} {data.recommendedPlan.interactions.hours}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">{t.targetVisits}</p>
              <p className="font-medium">{data.recommendedPlan.visits.day} {data.recommendedPlan.visits.hours}</p>
            </div>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            🟢 {t.planNote}
          </p>
        </CardContent>
      </Card>

      {/* Application & Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t.application}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant={feedbackGiven === true ? 'default' : 'outline'}
            onClick={() => handleFeedback(true)}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t.applied}
          </Button>
          <Button
            variant={feedbackGiven === false ? 'destructive' : 'outline'}
            onClick={() => handleFeedback(false)}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {t.notApplied}
          </Button>
        </CardContent>
      </Card>

      {/* Report */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t.report}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
            <FileText className="h-4 w-4" />
            {t.downloadPdf}
          </Button>
          <Button variant="outline" onClick={handleSendEmail} className="gap-2">
            <Mail className="h-4 w-4" />
            {t.sendEmail}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
