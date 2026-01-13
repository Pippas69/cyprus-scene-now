import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Gift, Ticket, Star, CheckCircle, XCircle, FileText, Mail, Lightbulb } from 'lucide-react';
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
  },
};

interface GuidanceTabProps {
  businessId: string;
  language: 'el' | 'en';
}

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
}

const GuidanceTable: React.FC<GuidanceTableProps> = ({
  title,
  icon: Icon,
  iconColor,
  data,
  tips,
  language,
}) => {
  const t = translations[language];

  const formatWindows = (windows: Array<{ day: string; hours: string; count: number }>) => {
    if (!windows || windows.length === 0) return '—';
    return windows.map(w => `${w.day} ${w.hours}`).join(' / ');
  };

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
              <tr className="border-b">
                <td className="py-3">{t.views}</td>
                <td className="text-right py-3 font-medium">{formatWindows(data.views)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">{t.interactions}</td>
                <td className="text-right py-3 font-medium">{formatWindows(data.interactions)}</td>
              </tr>
              <tr>
                <td className="py-3">{t.visits}</td>
                <td className="text-right py-3 font-medium">{formatWindows(data.visits)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tips */}
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
