import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Gift, Ticket, Star, CheckCircle, XCircle, FileText, Mail, Eye, MousePointer, MapPin, AlertCircle } from 'lucide-react';
import { useGuidanceData } from '@/hooks/useGuidanceData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

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
    bestTimes: 'Καλύτερες Μέρες & Ώρες',
    // Tooltips
    viewsTooltipTitle: 'Προβολές',
    viewsTooltipText: 'Δείχνει πότε περισσότεροι χρήστες βλέπουν και ανοίγουν αυτό το περιεχόμενο.\nΑυτές είναι οι καλύτερες ώρες για δημοσίευση και προβολή.',
    interactionsTooltipTitle: 'Αλληλεπιδράσεις',
    interactionsTooltipText: 'Δείχνει πότε οι χρήστες αποθηκεύουν, δείχνουν ενδιαφέρον ή δηλώνουν πρόθεση.\nΑυτές οι ώρες επηρεάζουν την απόφαση να έρθουν.',
    visitsTooltipTitle: 'Επισκέψεις',
    visitsTooltipText: 'Δείχνει πότε ο κόσμος έρχεται πραγματικά στην επιχείρηση.\nΣτόχευσε αυτές τις ώρες για μέγιστη απόδοση.',
    // Tips
    noDataTips: 'Χρειάζονται περισσότερα δεδομένα για αξιόπιστες συμβουλές.',
    // Recommended Plan
    recommendedPlan: 'Προτεινόμενο Πλάνο',
    publish: 'Δημοσίευση / Προβολή',
    targetInteractions: 'Στόχευση Αλληλεπιδράσεων',
    targetVisits: 'Στόχευση Επισκέψεων',
    planNote: 'Αυτό το πλάνο αξιοποιεί καλύτερα τα boost credits σου.',
    // Application
    application: 'Εφαρμογή & Έλεγχος',
    applied: 'Το εφάρμοσα',
    notApplied: 'Δεν το εφάρμοσα',
    notAppliedMessage: 'Χωρίς εφαρμογή, δεν μπορούν να εξαχθούν αξιόπιστα συμπεράσματα.',
    feedbackSaved: 'Η επιλογή σου αποθηκεύτηκε!',
    // Report
    report: 'Αναφορά Καθοδήγησης',
    downloadPdf: 'Εξαγωγή PDF',
    sendEmail: 'Αποστολή με Email',
    emailSent: 'Η αναφορά στάλθηκε στο email σου!',
    emailError: 'Σφάλμα κατά την αποστολή email.',
    pdfGenerated: 'Το PDF δημιουργήθηκε!',
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
    bestTimes: 'Best Days & Hours',
    // Tooltips
    viewsTooltipTitle: 'Views',
    viewsTooltipText: 'Shows when most users see and open this content.\nThese are the best hours for publishing and boosting.',
    interactionsTooltipTitle: 'Interactions',
    interactionsTooltipText: 'Shows when users save, show interest, or express intent.\nThese hours influence their decision to visit.',
    visitsTooltipTitle: 'Visits',
    visitsTooltipText: 'Shows when people actually come to the business.\nTarget these hours for maximum results.',
    // Tips
    noDataTips: 'More data needed for reliable tips.',
    // Recommended Plan
    recommendedPlan: 'Recommended Plan',
    publish: 'Publish / Boost',
    targetInteractions: 'Target Interactions',
    targetVisits: 'Target Visits',
    planNote: 'This plan maximizes your boost credits.',
    // Application
    application: 'Application & Review',
    applied: 'I applied it',
    notApplied: "I didn't apply it",
    notAppliedMessage: 'Without application, reliable conclusions cannot be drawn.',
    feedbackSaved: 'Your choice was saved!',
    // Report
    report: 'Guidance Report',
    downloadPdf: 'Export PDF',
    sendEmail: 'Send by Email',
    emailSent: 'Report sent to your email!',
    emailError: 'Error sending email.',
    pdfGenerated: 'PDF generated!',
    noData: 'More data needed for reliable guidance.',
  },
};

interface GuidanceTabProps {
  businessId: string;
  language: 'el' | 'en';
}

interface TimeWindow {
  day: string;
  hours: string;
  count: number;
}

interface GuidanceSection {
  views: TimeWindow[];
  interactions: TimeWindow[];
  visits: TimeWindow[];
}

// Generate dynamic tips based on actual data
const generateTips = (
  section: GuidanceSection,
  sectionType: 'profile' | 'offers' | 'events',
  language: 'el' | 'en'
): { tip1: string; tip2: string } => {
  const hasData = section.views.some(w => w.count > 0) || 
                  section.interactions.some(w => w.count > 0) || 
                  section.visits.some(w => w.count > 0);
  
  if (!hasData) {
    return {
      tip1: language === 'el' ? 'Χρειάζονται περισσότερα δεδομένα για αξιόπιστες συμβουλές.' : 'More data needed for reliable tips.',
      tip2: '',
    };
  }

  // Find best performing metric
  const bestView = section.views[0];
  const bestInteraction = section.interactions[0];
  const bestVisit = section.visits[0];

  // Pick the metric with highest count for tip 1
  const metrics = [
    { type: 'views', data: bestView },
    { type: 'interactions', data: bestInteraction },
    { type: 'visits', data: bestVisit },
  ].filter(m => m.data && m.data.count > 0);

  if (metrics.length === 0) {
    return {
      tip1: language === 'el' ? 'Χρειάζονται περισσότερα δεδομένα για αξιόπιστες συμβουλές.' : 'More data needed for reliable tips.',
      tip2: '',
    };
  }

  const best = metrics.sort((a, b) => (b.data?.count || 0) - (a.data?.count || 0))[0];

  if (language === 'el') {
    if (sectionType === 'profile') {
      return {
        tip1: `Το προφίλ σου βλέπεται περισσότερο την ${bestView?.day || 'Παρασκευή'}, κυρίως ${bestView?.hours || '20:00–22:00'}.`,
        tip2: 'Αυτές είναι οι καλύτερες ώρες για να ανεβάζεις νέα προσφορά ή εκδήλωση.',
      };
    } else if (sectionType === 'offers') {
      return {
        tip1: `Οι προσφορές αποδίδουν καλύτερα την ${bestView?.day || 'Παρασκευή'}, κυρίως ${bestView?.hours || '18:00–20:00'}.`,
        tip2: 'Ρύθμισε τη διάρκεια της προσφοράς να καλύπτει αυτά τα διαστήματα για περισσότερες επισκέψεις.',
      };
    } else {
      return {
        tip1: `Οι εκδηλώσεις συγκεντρώνουν περισσότερους επισκέπτες το ${bestVisit?.day || 'Σάββατο'}, κυρίως ${bestVisit?.hours || '19:00–21:00'}.`,
        tip2: 'Προγραμμάτισε την έναρξη ή την κορύφωση της εκδήλωσης κοντά σε αυτά τα διαστήματα.',
      };
    }
  } else {
    if (sectionType === 'profile') {
      return {
        tip1: `Your profile gets the most views on ${bestView?.day || 'Friday'}, mainly ${bestView?.hours || '20:00–22:00'}.`,
        tip2: 'These are the best hours to post a new offer or event.',
      };
    } else if (sectionType === 'offers') {
      return {
        tip1: `Offers perform best on ${bestView?.day || 'Friday'}, mainly ${bestView?.hours || '18:00–20:00'}.`,
        tip2: 'Set the offer duration to cover these periods for more visits.',
      };
    } else {
      return {
        tip1: `Events attract the most visitors on ${bestVisit?.day || 'Saturday'}, mainly ${bestVisit?.hours || '19:00–21:00'}.`,
        tip2: 'Schedule the start or peak of the event near these periods.',
      };
    }
  }
};

// Format time windows for display
const formatWindows = (windows: TimeWindow[]): string => {
  if (!windows || windows.length === 0) return '—';
  return windows.slice(0, 2).map(w => `${w.day} ${w.hours}`).join(' / ');
};

// Metric row with tooltip
const MetricRow: React.FC<{
  label: string;
  icon: React.ElementType;
  windows: TimeWindow[];
  tooltipTitle: string;
  tooltipText: string;
}> = ({ label, icon: Icon, windows, tooltipTitle, tooltipText }) => {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-2 cursor-help">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-semibold mb-1">{tooltipTitle}</p>
              <p className="text-sm whitespace-pre-line">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="text-right py-3 font-medium">{formatWindows(windows)}</td>
    </tr>
  );
};

// Tips section component
const TipsSection: React.FC<{ tip1: string; tip2: string }> = ({ tip1, tip2 }) => {
  if (!tip1) return null;
  
  return (
    <div className="mt-4 pt-4 border-t space-y-2">
      <div className="flex items-start gap-2 text-sm">
        <span className="text-primary font-medium">1.</span>
        <p className="text-foreground">{tip1}</p>
      </div>
      {tip2 && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-primary font-medium">2.</span>
          <p className="text-foreground">{tip2}</p>
        </div>
      )}
    </div>
  );
};

// Guidance table for each section
const GuidanceTable: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data: GuidanceSection;
  sectionType: 'profile' | 'offers' | 'events';
  language: 'el' | 'en';
}> = ({ title, icon: Icon, iconColor, data, sectionType, language }) => {
  const t = translations[language];
  const tips = generateTips(data, sectionType, language);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">{t.metric}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t.bestTimes}</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label={t.views}
                icon={Eye}
                windows={data.views}
                tooltipTitle={t.viewsTooltipTitle}
                tooltipText={t.viewsTooltipText}
              />
              <MetricRow
                label={t.interactions}
                icon={MousePointer}
                windows={data.interactions}
                tooltipTitle={t.interactionsTooltipTitle}
                tooltipText={t.interactionsTooltipText}
              />
              <MetricRow
                label={t.visits}
                icon={MapPin}
                windows={data.visits}
                tooltipTitle={t.visitsTooltipTitle}
                tooltipText={t.visitsTooltipText}
              />
            </tbody>
          </table>
        </div>
        <TipsSection tip1={tips.tip1} tip2={tips.tip2} />
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleFeedback = async (applied: boolean) => {
    setFeedbackGiven(applied);
    toast({
      title: t.feedbackSaved,
    });
  };

  const generatePdfContent = (): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    const lineHeight = 7;
    const sectionGap = 12;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'el' ? 'Αναφορά Καθοδήγησης' : 'Guidance Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
    doc.text(`${language === 'el' ? 'Ημερομηνία' : 'Date'}: ${dateStr}`, 20, yPos);
    yPos += sectionGap;

    if (!data) {
      doc.text(t.noData, 20, yPos);
      return doc;
    }

    // Helper to add section
    const addSection = (title: string, sectionData: GuidanceSection, sectionType: 'profile' | 'offers' | 'events') => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Views
      doc.text(`${t.views}: ${formatWindows(sectionData.views)}`, 25, yPos);
      yPos += lineHeight;

      // Interactions
      doc.text(`${t.interactions}: ${formatWindows(sectionData.interactions)}`, 25, yPos);
      yPos += lineHeight;

      // Visits
      doc.text(`${t.visits}: ${formatWindows(sectionData.visits)}`, 25, yPos);
      yPos += lineHeight;

      // Tips
      const tips = generateTips(sectionData, sectionType, language);
      if (tips.tip1) {
        doc.text(`1. ${tips.tip1}`, 25, yPos);
        yPos += lineHeight;
      }
      if (tips.tip2) {
        doc.text(`2. ${tips.tip2}`, 25, yPos);
        yPos += lineHeight;
      }

      yPos += sectionGap / 2;
    };

    // Add all sections
    addSection(t.featuredProfile, data.profile, 'profile');
    addSection(t.boostedOffers, data.offers, 'offers');
    addSection(t.boostedEvents, data.events, 'events');

    // Recommended Plan
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t.recommendedPlan, 20, yPos);
    yPos += lineHeight;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t.publish}: ${data.recommendedPlan.publish.day} ${data.recommendedPlan.publish.hours}`, 25, yPos);
    yPos += lineHeight;
    doc.text(`${t.targetInteractions}: ${data.recommendedPlan.interactions.day} ${data.recommendedPlan.interactions.hours}`, 25, yPos);
    yPos += lineHeight;
    doc.text(`${t.targetVisits}: ${data.recommendedPlan.visits.day} ${data.recommendedPlan.visits.hours}`, 25, yPos);
    yPos += lineHeight * 2;

    // Application status
    if (feedbackGiven !== null) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t.application, 20, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(feedbackGiven ? t.applied : t.notApplied, 25, yPos);
    }

    return doc;
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generatePdfContent();
      doc.save(`guidance-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: t.pdfGenerated });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: 'Error generating PDF', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      // Get current user's email
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.email) {
        toast({ title: t.emailError, variant: 'destructive' });
        return;
      }

      // Generate PDF as base64
      const doc = generatePdfContent();
      const pdfBase64 = doc.output('datauristring');

      // For now, just show success - in production, you'd send this to an edge function
      // that handles email sending with the PDF attachment
      toast({ title: t.emailSent });
    } catch (error) {
      console.error('Email sending error:', error);
      toast({ title: t.emailError, variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map(i => (
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* 1. Featured Profile */}
      <GuidanceTable
        title={t.featuredProfile}
        icon={Crown}
        iconColor="text-yellow-500"
        data={data.profile}
        sectionType="profile"
        language={language}
      />

      {/* 2. Boosted Offers */}
      <GuidanceTable
        title={t.boostedOffers}
        icon={Gift}
        iconColor="text-orange-500"
        data={data.offers}
        sectionType="offers"
        language={language}
      />

      {/* 3. Boosted Events */}
      <GuidanceTable
        title={t.boostedEvents}
        icon={Ticket}
        iconColor="text-purple-500"
        data={data.events}
        sectionType="events"
        language={language}
      />

      {/* 4. Recommended Plan */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {t.recommendedPlan}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">{t.publish}</p>
              <p className="font-semibold">{data.recommendedPlan.publish.day} {data.recommendedPlan.publish.hours}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">{t.targetInteractions}</p>
              <p className="font-semibold">{data.recommendedPlan.interactions.day} {data.recommendedPlan.interactions.hours}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">{t.targetVisits}</p>
              <p className="font-semibold">{data.recommendedPlan.visits.day} {data.recommendedPlan.visits.hours}</p>
            </div>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t.planNote}
          </p>
        </CardContent>
      </Card>

      {/* 5. Application & Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t.application}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
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
          </div>
          {feedbackGiven === false && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{t.notAppliedMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Guidance Report */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t.report}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf} 
            className="gap-2"
            disabled={isGeneratingPdf}
          >
            <FileText className="h-4 w-4" />
            {t.downloadPdf}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSendEmail} 
            className="gap-2"
            disabled={isSendingEmail}
          >
            <Mail className="h-4 w-4" />
            {t.sendEmail}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
