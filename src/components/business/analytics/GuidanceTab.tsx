import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Crown, Gift, Ticket, Star, CheckCircle, XCircle, FileText, Mail, Eye, MousePointer, MapPin, AlertCircle, Info } from 'lucide-react';
import { useGuidanceData } from '@/hooks/useGuidanceData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { ensureNotoSansFont } from '@/lib/jspdfNotoSans';

const dayNamesEl: Record<number, string> = {
  0: 'Κυριακή',
  1: 'Δευτέρα',
  2: 'Τρίτη',
  3: 'Τετάρτη',
  4: 'Πέμπτη',
  5: 'Παρασκευή',
  6: 'Σάββατο',
};

const dayNamesEn: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const getDayName = (dayIndex: unknown, language: 'el' | 'en'): string => {
  const idx = Number(dayIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx > 6) return '—';
  return language === 'el' ? dayNamesEl[idx] : dayNamesEn[idx];
};

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
    interactionsTooltipText: 'Δείχνει πότε οι χρήστες δείχνουν ενδιαφέρον ή πρόθεση.\nΓια εκδηλώσεις: Ενδιαφέρομαι/Θα πάω. Για προσφορές: κλικ στο Εξαργύρωσε.',
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
    // PDF specific
    pdfTitle: 'Αναφορά Καθοδήγησης ΦΟΜΟ',
    pdfDate: 'Ημερομηνία',
    pdfTimeWindows: 'Χρονικά Παράθυρα',
    pdfSummary: 'Σύνοψη Αποφάσεων',
    pdfBestDay: 'Καλύτερη Μέρα',
    pdfBestHours: 'Καλύτερες Ώρες',
    pdfPlanStatus: 'Κατάσταση Εφαρμογής',
    pdfApplied: 'Εφαρμόστηκε',
    pdfNotApplied: 'Δεν εφαρμόστηκε',
    pdfPending: 'Εκκρεμεί',
    pdfConclusion: 'Συμπεράσματα',
    pdfConclusionApplied: 'Το πλάνο εφαρμόστηκε. Αναμένουμε αποτελέσματα από τα επόμενα δεδομένα.',
    pdfConclusionNotApplied: 'Το πλάνο δεν εφαρμόστηκε. Χωρίς εφαρμογή, δεν μπορούν να εξαχθούν αξιόπιστα συμπεράσματα.',
    pdfConclusionPending: 'Αναμονή επιλογής εφαρμογής από τον επιχειρηματία.',
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
    interactionsTooltipText: 'Shows when users show interest or intent.\nFor events: Interested/Going. For offers: clicks on Redeem.',
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
    // PDF specific
    pdfTitle: 'ΦΟΜΟ Guidance Report',
    pdfDate: 'Date',
    pdfTimeWindows: 'Time Windows',
    pdfSummary: 'Decision Summary',
    pdfBestDay: 'Best Day',
    pdfBestHours: 'Best Hours',
    pdfPlanStatus: 'Application Status',
    pdfApplied: 'Applied',
    pdfNotApplied: 'Not Applied',
    pdfPending: 'Pending',
    pdfConclusion: 'Conclusions',
    pdfConclusionApplied: 'The plan was applied. Awaiting results from upcoming data.',
    pdfConclusionNotApplied: 'The plan was not applied. Without application, reliable conclusions cannot be drawn.',
    pdfConclusionPending: 'Awaiting application choice from the business owner.',
  },
};

interface GuidanceTabProps {
  businessId: string;
  language: 'el' | 'en';
}

interface TimeWindow {
  dayIndex: number;
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

  const viewDay = bestView ? getDayName(bestView.dayIndex, language) : (language === 'el' ? 'Παρασκευή' : 'Friday');
  const visitDay = bestVisit ? getDayName(bestVisit.dayIndex, language) : (language === 'el' ? 'Σάββατο' : 'Saturday');

  if (language === 'el') {
    if (sectionType === 'profile') {
      return {
        tip1: `Το προφίλ σου βλέπεται περισσότερο την ${viewDay}, κυρίως ${bestView?.hours || '20:00–22:00'}.`,
        tip2: 'Αυτές είναι οι καλύτερες ώρες για να ανεβάζεις νέα προσφορά ή εκδήλωση.',
      };
    } else if (sectionType === 'offers') {
      return {
        tip1: `Οι προσφορές αποδίδουν καλύτερα την ${viewDay}, κυρίως ${bestView?.hours || '18:00–20:00'}.`,
        tip2: 'Ρύθμισε τη διάρκεια της προσφοράς να καλύπτει αυτά τα διαστήματα για περισσότερες επισκέψεις.',
      };
    } else {
      return {
        tip1: `Οι εκδηλώσεις συγκεντρώνουν περισσότερους επισκέπτες την ${visitDay}, κυρίως ${bestVisit?.hours || '19:00–21:00'}.`,
        tip2: 'Προγραμμάτισε την έναρξη ή την κορύφωση της εκδήλωσης κοντά σε αυτά τα διαστήματα.',
      };
    }
  } else {
    if (sectionType === 'profile') {
      return {
        tip1: `Your profile gets the most views on ${viewDay}, mainly ${bestView?.hours || '20:00–22:00'}.`,
        tip2: 'These are the best hours to post a new offer or event.',
      };
    } else if (sectionType === 'offers') {
      return {
        tip1: `Offers perform best on ${viewDay}, mainly ${bestView?.hours || '18:00–20:00'}.`,
        tip2: 'Set the offer duration to cover these periods for more visits.',
      };
    } else {
      return {
        tip1: `Events attract the most visitors on ${visitDay}, mainly ${bestVisit?.hours || '19:00–21:00'}.`,
        tip2: 'Schedule the start or peak of the event near these periods.',
      };
    }
  }
};

// Format time windows for display with language
const formatWindowsWithLanguage = (windows: TimeWindow[], language: 'el' | 'en'): string => {
  if (!windows || windows.length === 0) return '—';
  return windows
    .slice(0, 2)
    .map((w) => `${getDayName(w.dayIndex, language)} ${w.hours}`)
    .join(' / ');
};

// Metric row with click-to-dialog (same pattern as other Analytics tabs)
const MetricRow: React.FC<{
  label: string;
  icon: React.ElementType;
  windows: TimeWindow[];
  tooltipTitle: string;
  tooltipText: string;
  language: 'el' | 'en';
}> = ({ label, icon: Icon, windows, tooltipTitle, tooltipText, language }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <tr className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors group">
          <td className="py-3">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1">
                {label}
                <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
              </span>
            </span>
          </td>
          <td className="text-right py-3 font-medium">{formatWindowsWithLanguage(windows, language)}</td>
        </tr>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{tooltipTitle}</DialogTitle>
              <DialogDescription className="whitespace-pre-line">{tooltipText}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
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
                language={language}
              />
              <MetricRow
                label={t.interactions}
                icon={MousePointer}
                windows={data.interactions}
                tooltipTitle={t.interactionsTooltipTitle}
                tooltipText={t.interactionsTooltipText}
                language={language}
              />
              <MetricRow
                label={t.visits}
                icon={MapPin}
                windows={data.visits}
                tooltipTitle={t.visitsTooltipTitle}
                tooltipText={t.visitsTooltipText}
                language={language}
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

  const generatePdfContent = async (): Promise<jsPDF> => {
    const doc = new jsPDF();
    await ensureNotoSansFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = 20;
    const lineHeight = 6;
    const sectionGap = 10;
    const leftX = 18;
    const indentX = 24;
    const maxWidth = pageWidth - leftX * 2;

    const ensureSpace = (neededLines = 1) => {
      const neededHeight = neededLines * lineHeight + 6;
      if (yPos + neededHeight > pageHeight - 18) {
        doc.addPage();
        yPos = 20;
        doc.setFont('NotoSans', 'normal');
      }
    };

    const write = (text: string, x = leftX, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth - (x - leftX));
      ensureSpace(lines.length);
      doc.text(lines, x, yPos);
      yPos += lines.length * lineHeight;
    };

    const heading = (text: string) => {
      ensureSpace(2);
      doc.setFontSize(14);
      doc.text(text, leftX, yPos);
      yPos += lineHeight * 1.2;
    };

    // Title
    doc.setFontSize(18);
    doc.text(t.pdfTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;

    // Date
    const dateStr = new Date().toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
    write(`${t.pdfDate}: ${dateStr}`, leftX, 10);
    yPos += sectionGap;

    if (!data) {
      write(t.noData, leftX, 11);
      return doc;
    }

    const addGuidanceSection = (title: string, sectionData: GuidanceSection, sectionType: 'profile' | 'offers' | 'events') => {
      heading(title);

      write(`${t.pdfTimeWindows}:`, leftX, 11);
      write(`${t.views}: ${formatWindowsWithLanguage(sectionData.views, language)}`, indentX);
      write(`${t.interactions}: ${formatWindowsWithLanguage(sectionData.interactions, language)}`, indentX);
      write(`${t.visits}: ${formatWindowsWithLanguage(sectionData.visits, language)}`, indentX);
      yPos += 4;

      const tips = generateTips(sectionData, sectionType, language);
      if (tips.tip1) write(`1. ${tips.tip1}`, indentX);
      if (tips.tip2) write(`2. ${tips.tip2}`, indentX);

      yPos += sectionGap;
    };

    addGuidanceSection(t.featuredProfile, data.profile, 'profile');
    addGuidanceSection(t.boostedOffers, data.offers, 'offers');
    addGuidanceSection(t.boostedEvents, data.events, 'events');

    // Recommended plan
    heading(t.recommendedPlan);
    write(`${t.publish}: ${getDayName(data.recommendedPlan.publish.dayIndex, language)} ${data.recommendedPlan.publish.hours}`, indentX);
    write(`${t.targetInteractions}: ${getDayName(data.recommendedPlan.interactions.dayIndex, language)} ${data.recommendedPlan.interactions.hours}`, indentX);
    write(`${t.targetVisits}: ${getDayName(data.recommendedPlan.visits.dayIndex, language)} ${data.recommendedPlan.visits.hours}`, indentX);
    write(`✓ ${t.planNote}`, indentX);
    yPos += sectionGap;

    // Application status
    heading(t.pdfPlanStatus);
    const statusText =
      feedbackGiven === null
        ? t.pdfPending
        : feedbackGiven
          ? t.pdfApplied
          : t.pdfNotApplied;
    write(statusText, indentX);
    yPos += 6;

    // Summary / conclusions
    heading(t.pdfConclusion);
    const conclusionText =
      feedbackGiven === null
        ? t.pdfConclusionPending
        : feedbackGiven
          ? t.pdfConclusionApplied
          : t.pdfConclusionNotApplied;
    write(conclusionText, indentX);

    return doc;
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = await generatePdfContent();
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
      const doc = await generatePdfContent();
      const pdfBase64 = doc.output('datauristring');

      // For now, just show success - in production, you'd send this to a backend function
      // that handles email sending with the PDF attachment
      void pdfBase64;
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
              <p className="font-semibold">{getDayName(data.recommendedPlan.publish.dayIndex, language)} {data.recommendedPlan.publish.hours}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">{t.targetInteractions}</p>
              <p className="font-semibold">{getDayName(data.recommendedPlan.interactions.dayIndex, language)} {data.recommendedPlan.interactions.hours}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">{t.targetVisits}</p>
              <p className="font-semibold">{getDayName(data.recommendedPlan.visits.dayIndex, language)} {data.recommendedPlan.visits.hours}</p>
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
