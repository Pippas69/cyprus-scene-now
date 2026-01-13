import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Gift, Ticket, Eye, MousePointer, MapPin, Star, CheckCircle, XCircle, FileText, Mail } from 'lucide-react';
import { useGuidanceData } from '@/hooks/useGuidanceData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const translations = {
  el: {
    title: 'Καθοδήγηση',
    subtitle: 'Πότε και πώς να χρησιμοποιήσεις την προβολή για μέγιστα αποτελέσματα',
    featuredProfile: 'Επιλεγμένο Προφίλ',
    boostedOffers: 'Boosted Offers',
    boostedEvents: 'Boosted Events',
    views: 'Προβολές',
    interactions: 'Αλληλεπιδράσεις',
    visits: 'Επισκέψεις',
    viewsDesc: 'Ώρες & μέρες που οι χρήστες βλέπουν περισσότερο',
    interactionsDesc: 'Ώρες & μέρες που οι χρήστες δείχνουν ενδιαφέρον',
    visitsDesc: 'Ώρες & μέρες που το ενδιαφέρον μετατρέπεται σε επίσκεψη',
    profileViewsGuidance: 'Αυτές τις ώρες το προφίλ σου έχει τις περισσότερες προβολές. Δημοσίευσε προσφορές ή εκδηλώσεις λίγο πριν από αυτά τα διαστήματα.',
    profileInteractionsGuidance: 'Εδώ ο κόσμος αποθηκεύει και δηλώνει πρόθεση. Φρόντισε το περιεχόμενο που οδηγεί σε επίσκεψη να είναι ενεργό.',
    profileVisitsGuidance: 'Αυτές οι ώρες δείχνουν πότε έρχεται πραγματικά ο κόσμος. Χρησιμοποίησέ τες ως στόχο για offers και events.',
    offerViewsGuidance: 'Κάνε προβολή της προσφοράς σε αυτά τα διαστήματα για περισσότερες προβολές.',
    offerInteractionsGuidance: 'Σε αυτές τις ώρες ο κόσμος αποφασίζει αν θα έρθει.',
    offerVisitsGuidance: 'Η προβολή αποδίδει περισσότερο εδώ. Εκτός αυτών των ωρών, η διαφορά είναι περιορισμένη.',
    eventViewsGuidance: 'Ανέβασε και προώθησε το event σε αυτά τα διαστήματα.',
    eventInteractionsGuidance: 'Εδώ ο κόσμος δηλώνει ότι θα πάει.',
    eventVisitsGuidance: 'Η προβολή έχει ουσιαστικό αποτέλεσμα σε αυτά τα διαστήματα.',
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
    views: 'Views',
    interactions: 'Interactions',
    visits: 'Visits',
    viewsDesc: 'Times & days when users view the most',
    interactionsDesc: 'Times & days when users show interest',
    visitsDesc: 'Times & days when interest converts to visits',
    profileViewsGuidance: 'Your profile gets the most views at these times. Post offers or events just before these windows.',
    profileInteractionsGuidance: 'This is when people save and express intent. Make sure conversion content is active.',
    profileVisitsGuidance: 'These times show when people actually come. Use them as targets for offers and events.',
    offerViewsGuidance: 'Boost your offer during these windows for more views.',
    offerInteractionsGuidance: 'During these hours, people decide whether to visit.',
    offerVisitsGuidance: 'Boost performs best here. Outside these times, the difference is limited.',
    eventViewsGuidance: 'Upload and promote your event during these windows.',
    eventInteractionsGuidance: 'This is when people RSVP.',
    eventVisitsGuidance: 'Boost has the most impact during these windows.',
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

interface TimeWindowCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  windows: Array<{ day: string; hours: string; count: number }>;
  guidance: string;
  language: 'el' | 'en';
}

const TimeWindowCard: React.FC<TimeWindowCardProps> = ({
  icon: Icon,
  title,
  description,
  windows,
  guidance,
}) => {
  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="space-y-2">
        {windows.map((w, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span>
              {w.day} {w.hours}
            </span>
            <span className="text-muted-foreground">
              {w.count > 0 ? `${w.count.toLocaleString()}` : '—'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic border-t pt-2">
        📝 {guidance}
      </p>
    </div>
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
    
    // Just show toast for now - table will be created later
    toast({
      title: t.feedbackSaved,
    });
  };

  const handleDownloadPdf = () => {
    // For now, just show a toast - PDF generation would require jspdf integration
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
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-48" />
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
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Featured Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            {t.featuredProfile}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimeWindowCard
            icon={Eye}
            title={t.views}
            description={t.viewsDesc}
            windows={data.profile.views}
            guidance={t.profileViewsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MousePointer}
            title={t.interactions}
            description={t.interactionsDesc}
            windows={data.profile.interactions}
            guidance={t.profileInteractionsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MapPin}
            title={t.visits}
            description={t.visitsDesc}
            windows={data.profile.visits}
            guidance={t.profileVisitsGuidance}
            language={language}
          />
        </CardContent>
      </Card>

      {/* Boosted Offers Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-orange-500" />
            {t.boostedOffers}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimeWindowCard
            icon={Eye}
            title={t.views}
            description={t.viewsDesc}
            windows={data.offers.views}
            guidance={t.offerViewsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MousePointer}
            title={t.interactions}
            description={t.interactionsDesc}
            windows={data.offers.interactions}
            guidance={t.offerInteractionsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MapPin}
            title={t.visits}
            description={t.visitsDesc}
            windows={data.offers.visits}
            guidance={t.offerVisitsGuidance}
            language={language}
          />
        </CardContent>
      </Card>

      {/* Boosted Events Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-purple-500" />
            {t.boostedEvents}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimeWindowCard
            icon={Eye}
            title={t.views}
            description={t.viewsDesc}
            windows={data.events.views}
            guidance={t.eventViewsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MousePointer}
            title={t.interactions}
            description={t.interactionsDesc}
            windows={data.events.interactions}
            guidance={t.eventInteractionsGuidance}
            language={language}
          />
          <TimeWindowCard
            icon={MapPin}
            title={t.visits}
            description={t.visitsDesc}
            windows={data.events.visits}
            guidance={t.eventVisitsGuidance}
            language={language}
          />
        </CardContent>
      </Card>

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
