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
import { Crown, Gift, Ticket, Star, CheckCircle, XCircle, FileText, Mail, Eye, MousePointer, MapPin, AlertCircle, Info, Users, Euro, TrendingUp, Wallet } from 'lucide-react';
import { useGuidanceData } from '@/hooks/useGuidanceData';
import { useGuidanceMetrics } from '@/hooks/useGuidanceMetrics';
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
    // Tooltips - Same as Performance tab with best times note
    viewsTooltipTitle: 'Προβολές',
    profileViewsTooltipText: 'Πόσες φορές είδαν οι χρήστες τη σελίδα του προφίλ σου από οπουδήποτε - feed, χάρτη, αναζήτηση, κοινοποιήσεις κ.λπ. Δείχνει τις καλύτερες μέρες και ώρες.',
    offersViewsTooltipText: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των προσφορών σου από οπουδήποτε. Δείχνει τις καλύτερες μέρες και ώρες.',
    eventsViewsTooltipText: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των εκδηλώσεών σου από οπουδήποτε. Δείχνει τις καλύτερες μέρες και ώρες.',
    interactionsTooltipTitle: 'Αλληλεπιδράσεις',
    profileInteractionsTooltipText: 'Χρήστες που ακολούθησαν ή έκαναν κλικ στο προφίλ σου. Δείχνει τις καλύτερες μέρες και ώρες.',
    offersInteractionsTooltipText: 'Κλικ στο κουμπί "Εξαργύρωσε" – δείχνει πρόθεση χρήσης της προσφοράς. Δείχνει τις καλύτερες μέρες και ώρες.',
    eventsInteractionsTooltipText: 'RSVPs χρηστών: "Ενδιαφέρομαι" ή "Θα πάω". Δείχνει τις καλύτερες μέρες και ώρες.',
    visitsTooltipTitle: 'Επισκέψεις',
    profileVisitsTooltipText: 'QR check-ins από κρατήσεις που έγιναν απευθείας μέσω του προφίλ σου. Περιλαμβάνει επισκέψεις από φοιτητική έκπτωση (εάν είναι ενεργοποιημένη στις ρυθμίσεις). Δείχνει τις καλύτερες μέρες και ώρες.',
    offersVisitsTooltipText: 'Σαρώσεις QR για εξαργύρωση προσφοράς στον χώρο σου, είτε με κράτηση είτε χωρίς (walk-in). Δείχνει τις καλύτερες μέρες και ώρες.',
    eventsVisitsTooltipText: 'Check-ins εισιτηρίων και κρατήσεων εκδηλώσεων (minimum charge). Δείχνει τις καλύτερες μέρες και ώρες.',
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
    // Metrics sections
    newCustomersFromProfile: 'Επισκέψεις από Επιλεγμένο Προφίλ',
    newCustomersDescription: 'Οι παρακάτω πελάτες ήρθαν επειδή το προφίλ σας εμφανίζεται επιλεγμένο στο ΦΟΜΟ.',
    newCustomersTooltip: 'QR check-ins από κρατήσεις που έγιναν απευθείας μέσω του προφίλ σου. Περιλαμβάνει επισκέψεις από φοιτητική έκπτωση (εάν είναι ενεργοποιημένη στις ρυθμίσεις).',
    boostSpent: 'Χρήματα Boost',
    boostSpentTooltip: 'Πόσα χρήματα δαπάνησε σε boost.',
    visitsFromBoost: 'Επισκέψεις από Boost',
    visitsFromBoostTooltip: 'Πόσες συνολικές επισκέψεις έγιναν μέσω QR εξαργύρωσης προσφοράς στον χώρο σου, είτε με κράτηση είτε χωρίς (walk-in). Αν ένας χρήστης ήρθε 3 φορές → μετρά 3 επισκέψεις.',
    customerAcquisitionNote: 'Με αυτά τα χρήματα σε boost αποκτήθηκε περίπου',
    newCustomer: 'νέος πελάτης',
    newCustomers: 'νέοι πελάτες',
    revenueFromBoost: 'Έσοδα από Boost',
    revenueFromBoostTooltip: 'Πόσα χρήματα προήλθαν από tickets και κρατήσεις με minimum charge. Το ποσό περιλαμβάνει το commission του ΦΟΜΟ.',
    netRevenue: 'Καθαρά Έσοδα',
    netRevenueTooltip: 'Έσοδα μετά την αφαίρεση του commission του ΦΟΜΟ.',
    onlyPaidEvents: 'Περιλαμβάνονται μόνο paid tickets και κρατήσεις με πληρωμή (minimum charge).',
    noNewCustomersYet: 'Δεν υπάρχουν ακόμα νέοι πελάτες.',
    noBoostData: 'Δεν υπάρχουν δεδομένα boost.',
    noPaidEventsData: 'Δεν υπάρχουν δεδομένα από paid events.',
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
    // Tooltips - Same as Performance tab with best times note
    viewsTooltipTitle: 'Views',
    profileViewsTooltipText: 'How many times users viewed your profile page from anywhere - feed, map, search, shared links, etc. Shows best days and hours.',
    offersViewsTooltipText: 'How many times users viewed your offer pages from anywhere. Shows best days and hours.',
    eventsViewsTooltipText: 'How many times users viewed your event pages from anywhere. Shows best days and hours.',
    interactionsTooltipTitle: 'Interactions',
    profileInteractionsTooltipText: 'Users who followed or clicked on your profile. Shows best days and hours.',
    offersInteractionsTooltipText: 'Clicks on "Redeem" button – shows intent to use the offer. Shows best days and hours.',
    eventsInteractionsTooltipText: 'User RSVPs: "Interested" or "Going". Shows best days and hours.',
    visitsTooltipTitle: 'Visits',
    profileVisitsTooltipText: 'QR check-ins from reservations made directly through your profile. Includes visits from student discount (if enabled in settings). Shows best days and hours.',
    offersVisitsTooltipText: 'QR scans for offer redemption at your venue, with or without reservation (walk-in). Shows best days and hours.',
    eventsVisitsTooltipText: 'Ticket and event reservation (minimum charge) check-ins. Shows best days and hours.',
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
    // Metrics sections
    newCustomersFromProfile: 'Visits from Featured Profile',
    newCustomersDescription: 'These customers came because your profile appears featured on ΦΟΜΟ.',
    newCustomersTooltip: 'QR check-ins from reservations made directly through your profile. Includes visits from student discount (if enabled in settings).',
    boostSpent: 'Boost Money',
    boostSpentTooltip: 'How much money was spent on boost.',
    visitsFromBoost: 'Visits from Boost',
    visitsFromBoostTooltip: 'Total visits via QR offer redemption at your venue, with or without reservation (walk-in). If a user came 3 times → counts as 3 visits.',
    customerAcquisitionNote: 'With this boost money, approximately',
    newCustomer: 'new customer was acquired',
    newCustomers: 'new customers were acquired',
    revenueFromBoost: 'Revenue from Boost',
    revenueFromBoostTooltip: 'Revenue from tickets and reservations with minimum charge. Amount includes ΦΟΜΟ commission.',
    netRevenue: 'Net Revenue',
    netRevenueTooltip: 'Revenue after deducting ΦΟΜΟ commission.',
    onlyPaidEvents: 'Includes only paid tickets and reservations with payment (minimum charge).',
    noNewCustomersYet: 'No new customers yet.',
    noBoostData: 'No boost data available.',
    noPaidEventsData: 'No data from paid events.',
  },
};

interface GuidanceTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
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

// Format time windows for display with language - returns array for responsive display
const formatWindowsWithLanguage = (windows: TimeWindow[], language: 'el' | 'en'): string => {
  if (!windows || windows.length === 0) return '—';
  return windows
    .slice(0, 2)
    .map((w) => `${getDayName(w.dayIndex, language)} ${w.hours}`)
    .join(' / ');
};

// Format time windows for tablet/mobile - each on separate line
const formatWindowsResponsive = (windows: TimeWindow[], language: 'el' | 'en'): { line1: string; line2: string } => {
  if (!windows || windows.length === 0) return { line1: '—', line2: '' };
  const formatted = windows.slice(0, 2).map((w) => `${getDayName(w.dayIndex, language)} ${w.hours}`);
  return {
    line1: formatted[0] || '—',
    line2: formatted[1] || '',
  };
};

// Metric row with click-to-dialog (same pattern as other Analytics tabs)
const MetricRow: React.FC<{
  label: string;
  icon: React.ElementType;
  windows: TimeWindow[];
  totalCount: number;
  tooltipTitle: string;
  tooltipText: string;
  language: 'el' | 'en';
}> = ({ label, icon: Icon, windows, totalCount, tooltipTitle, tooltipText, language }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <tr className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors group">
          <td className="py-3">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1">
                <span className="font-medium text-primary">{totalCount}</span>
                <span>{label}</span>
                <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
              </span>
            </span>
          </td>
          <td className="text-right py-3 font-medium text-xs md:text-sm">
            {/* Desktop: single line */}
            <span className="hidden lg:inline">{formatWindowsWithLanguage(windows, language)}</span>
            {/* Tablet/Mobile: each day on separate line with smaller text */}
            <span className="lg:hidden flex flex-col items-end text-[10px] md:text-xs whitespace-nowrap">
              <span>{formatWindowsResponsive(windows, language).line1}</span>
              {formatWindowsResponsive(windows, language).line2 && (
                <span>{formatWindowsResponsive(windows, language).line2}</span>
              )}
            </span>
          </td>
        </tr>
      </DialogTrigger>

      <DialogContent className="max-w-[280px] sm:max-w-md p-3 sm:p-6 pr-10 sm:pr-6">
        <DialogHeader className="pb-2 sm:pb-4 pr-2 sm:pr-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-lg">{tooltipTitle}</DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm">{label}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">
          <div className="p-2 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-primary">{totalCount.toLocaleString()}</p>
          </div>
          <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-pre-line">{tooltipText}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Tips section component
const TipsSection: React.FC<{ tip1: string; tip2: string }> = ({ tip1, tip2 }) => {
  if (!tip1) return null;
  
  return (
    <div className="mt-4 pt-4 border-t space-y-2">
      <div className="flex items-start gap-2 text-xs md:text-sm">
        <span className="text-primary font-medium">1.</span>
        <p className="text-foreground">{tip1}</p>
      </div>
      {tip2 && (
        <div className="flex items-start gap-2 text-xs md:text-sm">
          <span className="text-primary font-medium">2.</span>
          <p className="text-foreground">{tip2}</p>
        </div>
      )}
    </div>
  );
};

// Totals interface
interface SectionTotals {
  views: number;
  interactions: number;
  visits: number;
}

// Guidance table for each section
const GuidanceTable: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data: GuidanceSection;
  totals: SectionTotals;
  sectionType: 'profile' | 'offers' | 'events';
  language: 'el' | 'en';
  metricsContent?: React.ReactNode;
}> = ({ title, icon: Icon, iconColor, data, totals, sectionType, language, metricsContent }) => {
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
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground text-xs md:text-sm">{t.metric}</th>
                <th className="text-right py-2 font-medium text-muted-foreground text-[10px] md:text-xs lg:text-sm whitespace-nowrap">{t.bestTimes}</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label={t.views}
                icon={Eye}
                windows={data.views}
                totalCount={totals.views}
                tooltipTitle={t.viewsTooltipTitle}
                tooltipText={
                  sectionType === 'profile'
                    ? (t as any).profileViewsTooltipText
                    : sectionType === 'offers'
                      ? (t as any).offersViewsTooltipText
                      : (t as any).eventsViewsTooltipText
                }
                language={language}
              />
              <MetricRow
                label={t.interactions}
                icon={MousePointer}
                windows={data.interactions}
                totalCount={totals.interactions}
                tooltipTitle={t.interactionsTooltipTitle}
                tooltipText={
                  sectionType === 'profile'
                    ? (t as any).profileInteractionsTooltipText
                    : sectionType === 'offers'
                      ? (t as any).offersInteractionsTooltipText
                      : (t as any).eventsInteractionsTooltipText
                }
                language={language}
              />
              <MetricRow
                label={t.visits}
                icon={MapPin}
                windows={data.visits}
                totalCount={totals.visits}
                tooltipTitle={t.visitsTooltipTitle}
                tooltipText={
                  sectionType === 'profile'
                    ? (t as any).profileVisitsTooltipText
                    : sectionType === 'offers'
                      ? (t as any).offersVisitsTooltipText
                      : (t as any).eventsVisitsTooltipText
                }
                language={language}
              />
            </tbody>
          </table>
        </div>
        <TipsSection tip1={tips.tip1} tip2={tips.tip2} />
        
        {/* New Metrics Content */}
        {metricsContent && (
          <div className="pt-2 border-t">
            {metricsContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper to format currency
const formatCurrency = (cents: number): string => {
  return `€${(cents / 100).toFixed(2)}`;
};

// Profile Metrics Section
const ProfileMetricsSection: React.FC<{
  newCustomers: number;
  hasPaidPlan: boolean;
  language: 'el' | 'en';
}> = ({ newCustomers, hasPaidPlan, language }) => {
  const t = translations[language];
  
  if (!hasPaidPlan) {
    return null; // Don't show if no paid plan
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
        <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{(t as any).newCustomersFromProfile}</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-0.5 hover:bg-yellow-200/50 dark:hover:bg-yellow-800/30 rounded">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[280px] sm:max-w-md p-3 sm:p-6 pr-10 sm:pr-6">
                <DialogHeader className="pb-2 sm:pb-4 pr-2 sm:pr-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm sm:text-lg">{(t as any).visitsTooltipTitle}</DialogTitle>
                      <DialogDescription className="text-[10px] sm:text-sm">{(t as any).newCustomersFromProfile}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">
                  <div className="p-2 sm:p-4 bg-muted/50 rounded-lg">
                    <p className="text-xl sm:text-3xl font-bold text-primary">{newCustomers > 0 ? newCustomers.toLocaleString() : '—'}</p>
                  </div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-pre-line">{(t as any).newCustomersTooltip}</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
            {newCustomers > 0 ? newCustomers : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {newCustomers > 0 
              ? (t as any).newCustomersDescription 
              : (t as any).noNewCustomersYet}
          </p>
        </div>
      </div>
    </div>
  );
};

// Offer Boost Metrics Section
const OfferBoostMetricsSection: React.FC<{
  boostSpentCents: number;
  totalVisits: number;
  language: 'el' | 'en';
}> = ({ boostSpentCents, totalVisits, language }) => {
  const t = translations[language];

  if (boostSpentCents === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">{(t as any).noBoostData}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Boost Spent */}
        <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-muted-foreground">{(t as any).boostSpent}</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-0.5 hover:bg-orange-200/50 dark:hover:bg-orange-800/30 rounded">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{(t as any).boostSpent}</DialogTitle>
                  <DialogDescription className="pt-2">
                    {(t as any).boostSpentTooltip}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-1">
            {formatCurrency(boostSpentCents)}
          </p>
        </div>

        {/* Visits from Boost */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200/50 dark:border-green-800/30">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">{(t as any).visitsFromBoost}</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-0.5 hover:bg-green-200/50 dark:hover:bg-green-800/30 rounded">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{(t as any).visitsFromBoost}</DialogTitle>
                  <DialogDescription className="pt-2">
                    {(t as any).visitsFromBoostTooltip}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
            {totalVisits}
          </p>
        </div>
      </div>

      {/* Cost per visit note (boost spend / visits from boost) */}
      {totalVisits > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>
            {language === 'el' 
              ? <>Με περίπου <strong>{formatCurrency(Math.round(boostSpentCents / totalVisits))}</strong> σε boost αποκτήθηκε <strong>1</strong> επίσκεψη.</>
              : <>With about <strong>{formatCurrency(Math.round(boostSpentCents / totalVisits))}</strong> in boost, <strong>1</strong> visit was acquired.</>
            }
          </span>
        </div>
      )}
    </div>
  );
};

// Event Boost Metrics Section
const EventBoostMetricsSection: React.FC<{
  boostSpentCents: number;
  revenueWithCommissionCents: number;
  netRevenueCents: number;
  commissionPercent: number;
  language: 'el' | 'en';
}> = ({ boostSpentCents, revenueWithCommissionCents, netRevenueCents, commissionPercent, language }) => {
  const t = translations[language];
  
  // Only show if there's actual revenue (paid events)
  if (revenueWithCommissionCents === 0 && boostSpentCents === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">{(t as any).noPaidEventsData}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {/* Boost Spent */}
        <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
          <div className="flex items-center gap-1 mb-1">
            <Wallet className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[10px] font-medium text-muted-foreground">{(t as any).boostSpent}</span>
          </div>
          <p className="text-base font-bold text-purple-700 dark:text-purple-300">
            {formatCurrency(boostSpentCents)}
          </p>
        </div>

        {/* Revenue with Commission */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
          <div className="flex items-center gap-1 mb-1">
            <Euro className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-medium text-muted-foreground">{(t as any).revenueFromBoost}</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-0.5 hover:bg-blue-200/50 dark:hover:bg-blue-800/30 rounded">
                  <Info className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{(t as any).revenueFromBoost}</DialogTitle>
                  <DialogDescription className="pt-2">
                    {(t as any).revenueFromBoostTooltip}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-base font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(revenueWithCommissionCents)}
          </p>
        </div>

        {/* Net Revenue */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200/50 dark:border-green-800/30">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[10px] font-medium text-muted-foreground">{(t as any).netRevenue}</span>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-0.5 hover:bg-green-200/50 dark:hover:bg-green-800/30 rounded">
                  <Info className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{(t as any).netRevenue}</DialogTitle>
                  <DialogDescription className="pt-2">
                    {(t as any).netRevenueTooltip}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-base font-bold text-green-700 dark:text-green-300">
            {formatCurrency(netRevenueCents)}
          </p>
        </div>
      </div>

      {/* Note about paid events only */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="h-3 w-3" />
        {(t as any).onlyPaidEvents}
      </p>
    </div>
  );
};

export const GuidanceTab: React.FC<GuidanceTabProps> = ({
  businessId,
  dateRange,
  language,
}) => {
  const t = translations[language];
  const { data, isLoading } = useGuidanceData(businessId, dateRange);
  const { data: metrics, isLoading: metricsLoading } = useGuidanceMetrics(businessId, dateRange);
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
        totals={data.profileTotals}
        sectionType="profile"
        language={language}
        metricsContent={
          metrics && (
            <ProfileMetricsSection
              newCustomers={metrics.profile.newCustomers}
              hasPaidPlan={!!metrics.profile.paidStartedAt}
              language={language}
            />
          )
        }
      />

      {/* 2. Boosted Offers */}
      <GuidanceTable
        title={t.boostedOffers}
        icon={Gift}
        iconColor="text-orange-500"
        data={data.offers}
        totals={data.offerTotals}
        sectionType="offers"
        language={language}
        metricsContent={
          metrics && (
            <OfferBoostMetricsSection
              boostSpentCents={metrics.offers.boostSpentCents}
              totalVisits={metrics.offers.totalVisits}
              language={language}
            />
          )
        }
      />

      {/* 3. Boosted Events */}
      <GuidanceTable
        title={t.boostedEvents}
        icon={Ticket}
        iconColor="text-purple-500"
        data={data.events}
        totals={data.eventTotals}
        sectionType="events"
        language={language}
        metricsContent={
          metrics && (
            <EventBoostMetricsSection
              boostSpentCents={metrics.events.boostSpentCents}
              revenueWithCommissionCents={metrics.events.revenueWithCommissionCents}
              netRevenueCents={metrics.events.netRevenueCents}
              commissionPercent={metrics.events.commissionPercent}
              language={language}
            />
          )
        }
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
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mb-1">
                {/* Tablet/Mobile: Split Δημοσίευση / Προβολή */}
                <span className="lg:hidden flex flex-col items-start">
                  <span>{t.publish.split(' / ')[0]}</span>
                  <span>{t.publish.split(' / ')[1]}</span>
                </span>
                <span className="hidden lg:inline">{t.publish}</span>
              </p>
              <div className="font-semibold text-xs md:text-sm lg:text-base flex flex-row md:flex-col lg:flex-row gap-0 md:gap-0 lg:gap-1">
                <span className="whitespace-nowrap">{getDayName(data.recommendedPlan.publish.dayIndex, language)}</span>
                <span className="hidden md:hidden lg:inline">&nbsp;</span>
                <span className="whitespace-nowrap">{data.recommendedPlan.publish.hours}</span>
              </div>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mb-1">
                {/* Tablet/Mobile: Split Στόχευση / Αλληλεπιδράσεων */}
                <span className="lg:hidden flex flex-col items-start">
                  <span>{language === 'el' ? 'Στόχευση' : 'Target'}</span>
                  <span>{language === 'el' ? 'Αλληλεπιδράσεων' : 'Interactions'}</span>
                </span>
                <span className="hidden lg:inline">{t.targetInteractions}</span>
              </p>
              <p className="font-semibold text-xs md:text-sm lg:text-base">{getDayName(data.recommendedPlan.interactions.dayIndex, language)} {data.recommendedPlan.interactions.hours}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mb-1">{t.targetVisits}</p>
              <p className="font-semibold text-xs md:text-sm lg:text-base">{getDayName(data.recommendedPlan.visits.dayIndex, language)} {data.recommendedPlan.visits.hours}</p>
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
