import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, TrendingUp, TrendingDown, Minus, Lightbulb, Eye, MousePointer, MapPin, Info } from 'lucide-react';
import { useBoostValueMetrics } from '@/hooks/useBoostValueMetrics';

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
  if (!Number.isFinite(idx) || idx < 0 || idx > 6) return language === 'el' ? 'Παρασκευή' : 'Friday';
  return language === 'el' ? dayNamesEl[idx] : dayNamesEn[idx];
};

const translations = {
  el: {
    title: 'Αξία Προώθησης',
    subtitle: 'Σύγκριση απόδοσης με και χωρίς προβολή',
    profileBlock: 'Απόδοση Προφίλ',
    offersBlock: 'Απόδοση Προσφορών',
    eventsBlock: 'Απόδοση Εκδηλώσεων',
    metric: 'Μετρική',
    without: 'Μη Επιλεγμένο',
    withBoost: 'Επιλεγμένο',
    withoutOffer: 'Χωρίς Προβολή',
    withOffer: 'Με Προβολή',
    change: 'Μεταβολή',
    views: 'Προβολές',
    interactions: 'Αλληλεπιδράσεις',
    visits: 'Επισκέψεις',
    tips: 'Συμβουλές',
    noData: 'Χρειάζονται περισσότερα δεδομένα για αξιόπιστες συμβουλές.',
    profileTip1: 'Το επιλεγμένο προφίλ αυξάνει σταθερά τις επισκέψεις σε σχέση με το βασικό προφίλ. Η μεγαλύτερη διαφορά είναι πιο έντονη την {day}.',
    profileTip2: 'Η αξία του επιλεγμένου προφίλ φαίνεται όταν συνδυάζεται με ενεργές προσφορές ή εκδηλώσεις. Το προφίλ λειτουργεί ως κεντρικό σημείο ανακάλυψης.',
    offerTip1: 'Οι προσφορές με προβολή μετατρέπουν περισσότερο το ενδιαφέρον σε επισκέψεις.',
    offerTip1Suffix: 'Η διαφορά είναι πιο έντονη σε',
    offerTip2: 'Χωρίς προβολή, οι προσφορές παραμένουν κυρίως σε επίπεδο προβολής. Η προβολή βοηθά να έρθει ο κόσμος στο κατάστημα.',
    eventTip1: 'Η προβολή αυξάνει την πρόθεση συμμετοχής στις εκδηλώσεις. Όσο πλησιάζει η ημερομηνία, η διαφορά γίνεται πιο εμφανής.',
    eventTip2: 'Οι εκδηλώσεις με ξεκάθαρη ημέρα και ώρα επωφελούνται περισσότερο από την προβολή.',
    dataSource: 'Πηγή δεδομένων',
    // Profile explanations (same as Performance + comparison note)
    profileViewsExplanation: 'Πόσες φορές είδαν οι χρήστες',
    profileViewsDetails: 'Πόσες φορές είδαν οι χρήστες τη σελίδα του προφίλ σου από οπουδήποτε - feed, χάρτη, αναζήτηση, κοινοποιήσεις κ.λπ. Συγκρίνονται οι προβολές όταν ήταν επιλεγμένο vs μη επιλεγμένο.',
    profileViewsSource: 'Όλες οι πηγές',
    profileInteractionsExplanation: 'Ενδιαφέρον χρηστών',
    profileInteractionsDetails: 'Χρήστες που ακολούθησαν, μοιράστηκαν ή έκαναν κλικ στο προφίλ σου. Συγκρίνονται οι αλληλεπιδράσεις όταν ήταν επιλεγμένο vs μη επιλεγμένο.',
    profileInteractionsSource: 'Ακολουθήσεις, κοινοποιήσεις, κλικ',
    profileVisitsExplanation: 'Επαληθευμένες επισκέψεις',
    profileVisitsDetails: 'QR check-ins από κρατήσεις που έγιναν απευθείας μέσω του προφίλ σου. Συγκρίνονται οι επισκέψεις όταν ήταν επιλεγμένο vs μη επιλεγμένο.',
    profileVisitsSource: 'QR σαρώσεις κρατήσεων προφίλ',
    // Offers explanations (same as Performance + comparison note)
    offersViewsExplanation: 'Πόσες φορές είδαν οι χρήστες',
    offersViewsDetails: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των προσφορών σου από οπουδήποτε. Συγκρίνονται οι προβολές με και χωρίς προβολή.',
    offersViewsSource: 'Όλες οι σελίδες προσφορών',
    offersInteractionsExplanation: 'Ενδιαφέρον χρηστών',
    offersInteractionsDetails: 'Κλικ στο κουμπί "Εξαργύρωσε" – δείχνει πρόθεση χρήσης της προσφοράς. Συγκρίνονται οι αλληλεπιδράσεις με και χωρίς προβολή.',
    offersInteractionsSource: 'Κλικ στο "Εξαργύρωσε"',
    offersVisitsExplanation: 'Επαληθευμένες επισκέψεις',
    offersVisitsDetails: 'Σαρώσεις QR για εξαργύρωση προσφοράς στον χώρο σου, είτε με κράτηση είτε χωρίς (walk-in). Συγκρίνονται οι επισκέψεις με και χωρίς προβολή.',
    offersVisitsSource: 'QR εξαργυρώσεις προσφορών',
    // Events explanations (same as Performance + comparison note)
    eventsViewsExplanation: 'Πόσες φορές είδαν οι χρήστες',
    eventsViewsDetails: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των εκδηλώσεών σου από οπουδήποτε. Συγκρίνονται οι προβολές με και χωρίς προβολή.',
    eventsViewsSource: 'Όλες οι σελίδες εκδηλώσεων',
    eventsInteractionsExplanation: 'Ενδιαφέρον χρηστών',
    eventsInteractionsDetails: 'RSVPs χρηστών: "Ενδιαφέρομαι" ή "Θα πάω". Συγκρίνονται οι αλληλεπιδράσεις με και χωρίς προβολή.',
    eventsInteractionsSource: 'RSVPs (Ενδιαφέρομαι/Θα πάω)',
    eventsVisitsExplanation: 'Επαληθευμένες επισκέψεις',
    eventsVisitsDetails: 'Check-ins εισιτηρίων και κρατήσεων εκδηλώσεων (minimum charge). Συγκρίνονται οι επισκέψεις με και χωρίς προβολή.',
    eventsVisitsSource: 'QR check-ins εισιτηρίων/κρατήσεων',
  },
  en: {
    title: 'Boost Value',
    subtitle: 'Performance comparison with and without boost',
    profileBlock: 'Profile Performance',
    offersBlock: 'Offers Performance',
    eventsBlock: 'Events Performance',
    metric: 'Metric',
    without: 'Non-Featured',
    withBoost: 'Featured',
    withoutOffer: 'Without Boost',
    withOffer: 'With Boost',
    change: 'Change',
    views: 'Views',
    interactions: 'Interactions',
    visits: 'Visits',
    tips: 'Tips',
    noData: 'More data needed for reliable tips.',
    profileTip1: 'The featured profile consistently increases visits compared to the basic profile. The biggest difference is more pronounced on {day}.',
    profileTip2: 'The value of the featured profile is evident when combined with active offers or events. The profile acts as a central discovery point.',
    offerTip1: 'Offers with boost convert more interest into visits.',
    offerTip1Suffix: 'The difference is more pronounced on',
    offerTip2: 'Without boost, offers mostly stay at view level. Boost helps bring people to the store.',
    eventTip1: 'Boost increases participation intent for events. As the date approaches, the difference becomes more evident.',
    eventTip2: 'Events with a clear date and time benefit most from boost.',
    dataSource: 'Data source',
    // Profile explanations (same as Performance + comparison note)
    profileViewsExplanation: 'How many times users saw',
    profileViewsDetails: 'How many times users viewed your profile page from feed, map, or search. Comparing views when featured vs non-featured.',
    profileViewsSource: 'Profile page, feed, map',
    profileInteractionsExplanation: 'User interest',
    profileInteractionsDetails: 'Users who saved, followed, or shared your profile. Comparing interactions when featured vs non-featured.',
    profileInteractionsSource: 'Saves, follows, shares',
    profileVisitsExplanation: 'Verified visits',
    profileVisitsDetails: 'QR check-ins from reservations made directly on your profile. Comparing visits when featured vs non-featured.',
    profileVisitsSource: 'Reservation QR scans',
    // Offers explanations (same as Performance + comparison note)
    offersViewsExplanation: 'How many times users saw',
    offersViewsDetails: 'How many times users viewed your offer pages. Comparing views with and without boost.',
    offersViewsSource: 'Offer pages',
    offersInteractionsExplanation: 'User interest',
    offersInteractionsDetails: 'Clicks on "Redeem" button – shows intent to use the offer. Comparing interactions with and without boost.',
    offersInteractionsSource: 'Clicks on "Redeem"',
    offersVisitsExplanation: 'Verified visits',
    offersVisitsDetails: 'QR scans for offer redemption at your venue. Comparing visits with and without boost.',
    offersVisitsSource: 'Offer QR redemptions',
    // Events explanations (same as Performance + comparison note)
    eventsViewsExplanation: 'How many times users saw',
    eventsViewsDetails: 'How many times users viewed your event pages. Comparing views with and without boost.',
    eventsViewsSource: 'Event pages',
    eventsInteractionsExplanation: 'User interest',
    eventsInteractionsDetails: 'User RSVPs: "Interested" or "Going". Comparing interactions with and without boost.',
    eventsInteractionsSource: 'RSVPs (Interested/Going)',
    eventsVisitsExplanation: 'Verified visits',
    eventsVisitsDetails: 'Ticket and event reservation check-ins. Comparing visits with and without boost.',
    eventsVisitsSource: 'Ticket/reservation QR check-ins',
  },
};

interface BoostValueTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: 'el' | 'en';
}

interface ChangeIndicatorProps {
  change: number;
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({ change }) => {
  if (change > 0) {
    return (
      <span className="inline-flex items-center justify-end text-green-600 dark:text-green-400 font-medium">
        <TrendingUp className="h-4 w-4 mr-1" />
        +{change}%
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="inline-flex items-center justify-end text-red-600 dark:text-red-400 font-medium">
        <TrendingDown className="h-4 w-4 mr-1" />
        {change}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-end text-muted-foreground">
      <Minus className="h-4 w-4 mr-1" />
      0%
    </span>
  );
};

type BlockType = 'profile' | 'offers' | 'events';

interface MetricExplanation {
  explanation: string;
  details: string;
  source: string;
}

const getBoostExplanations = (language: 'el' | 'en', blockType: BlockType): { views: MetricExplanation; interactions: MetricExplanation; visits: MetricExplanation } => {
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

interface ClickableMetricRowProps {
  label: string;
  icon: React.ElementType;
  without: number;
  withBoost: number;
  change: number;
  explanation: MetricExplanation;
  dataSourceLabel: string;
}

const ClickableMetricRow: React.FC<ClickableMetricRowProps> = ({
  label,
  icon: Icon,
  without,
  withBoost,
  change,
  explanation,
  dataSourceLabel,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <tr className="border-b cursor-pointer hover:bg-muted/50 transition-colors group">
          <td className="py-3 text-xs md:text-sm">
            <span className="flex items-center gap-1">
              {label}
              <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </span>
          </td>
          <td className="text-center py-3 text-xs md:text-sm">{without.toLocaleString()}</td>
          <td className="text-center py-3 font-semibold text-xs md:text-sm">{withBoost.toLocaleString()}</td>
          <td className="text-right py-3 text-xs md:text-sm"><ChangeIndicator change={change} /></td>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Χωρίς</p>
              <p className="text-2xl font-bold text-foreground">{without.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Με Boost</p>
              <p className="text-2xl font-bold text-primary">{withBoost.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ChangeIndicator change={change} />
          </div>
          <p className="text-sm text-muted-foreground">{explanation.details}</p>
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

interface ComparisonTableProps {
  title: string;
  icon: React.ElementType;
  data: {
    views: { without: number; with: number; change: number };
    interactions: { without: number; with: number; change: number };
    visits: { without: number; with: number; change: number };
  };
  withoutLabel: string;
  withLabel: string;
  tips: string[];
  language: 'el' | 'en';
  blockType: BlockType;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  title,
  icon: Icon,
  data,
  withoutLabel,
  withLabel,
  tips,
  language,
  blockType,
}) => {
  const t = translations[language];
  const hasData = data.views.without > 0 || data.views.with > 0;
  const explanations = getBoostExplanations(language, blockType);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground text-xs md:text-sm">{t.metric}</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-[10px] md:text-xs lg:text-sm px-1">
                  {/* Mobile/Tablet: Stack "Μη/Χωρίς" on top */}
                  {withoutLabel.includes('Μη') || withoutLabel.includes('Non') ? (
                    <span className="flex flex-col items-center lg:block">
                      <span className="lg:hidden">{withoutLabel.split(' ')[0]}</span>
                      <span className="lg:hidden">{withoutLabel.split(' ').slice(1).join(' ')}</span>
                      <span className="hidden lg:inline">{withoutLabel}</span>
                    </span>
                  ) : withoutLabel.includes('Χωρίς') || withoutLabel.includes('Without') ? (
                    <span className="flex flex-col items-center lg:block">
                      <span className="lg:hidden">{withoutLabel.split(' ')[0]}</span>
                      <span className="lg:hidden">{withoutLabel.split(' ').slice(1).join(' ')}</span>
                      <span className="hidden lg:inline">{withoutLabel}</span>
                    </span>
                  ) : (
                    withoutLabel
                  )}
                </th>
                <th className="text-center py-2 font-medium text-muted-foreground text-[10px] md:text-xs lg:text-sm px-1">
                  {/* Mobile/Tablet: Stack "Με" on top for consistency */}
                  {withLabel.includes('Με ') || withLabel.includes('With ') ? (
                    <span className="flex flex-col items-center lg:block">
                      <span className="lg:hidden">{withLabel.split(' ')[0]}</span>
                      <span className="lg:hidden">{withLabel.split(' ').slice(1).join(' ')}</span>
                      <span className="hidden lg:inline">{withLabel}</span>
                    </span>
                  ) : (
                    withLabel
                  )}
                </th>
                <th className="text-right py-2 font-medium text-muted-foreground text-[10px] md:text-xs lg:text-sm">{t.change}</th>
              </tr>
            </thead>
            <tbody>
              <ClickableMetricRow
                label={t.views}
                icon={Eye}
                without={data.views.without}
                withBoost={data.views.with}
                change={data.views.change}
                explanation={explanations.views}
                dataSourceLabel={t.dataSource}
              />
              <ClickableMetricRow
                label={t.interactions}
                icon={MousePointer}
                without={data.interactions.without}
                withBoost={data.interactions.with}
                change={data.interactions.change}
                explanation={explanations.interactions}
                dataSourceLabel={t.dataSource}
              />
              <ClickableMetricRow
                label={t.visits}
                icon={MapPin}
                without={data.visits.without}
                withBoost={data.visits.with}
                change={data.visits.change}
                explanation={explanations.visits}
                dataSourceLabel={t.dataSource}
              />
            </tbody>
          </table>
        </div>

        {/* Tips */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            {t.tips}
          </div>
          {hasData ? (
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <p key={index} className="text-xs md:text-sm text-muted-foreground pl-6">
                  {index + 1}. {tip}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground italic pl-6">{t.noData}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const BoostValueTab: React.FC<BoostValueTabProps> = ({
  businessId,
  dateRange,
  language,
}) => {
  const t = translations[language];
  const { data, isLoading } = useBoostValueMetrics(businessId, dateRange);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  // Generate dynamic tips based on actual data
  const getProfileTips = () => {
    const totalViews = data.profile.views.without + data.profile.views.with;
    const totalInteractions = data.profile.interactions.without + data.profile.interactions.with;
    const totalVisits = data.profile.visits.without + data.profile.visits.with;
    const change = data.profile.visits.change;
    
    if (totalViews === 0 && totalInteractions === 0 && totalVisits === 0) {
      return [t.noData];
    }
    
    const day = getDayName(data.bestDays.profile, language);
    
    // Dynamic tip based on actual change
    if (change > 20) {
      const tip1 = t.profileTip1.replace('{day}', day);
      return [tip1, t.profileTip2];
    } else if (change > 0) {
      const tip1 = language === 'el' 
        ? `Το επιλεγμένο προφίλ φέρνει +${change}% περισσότερες επισκέψεις. Η διαφορά είναι πιο έντονη την ${day}.`
        : `The featured profile brings +${change}% more visits. The difference is more pronounced on ${day}.`;
      return [tip1, t.profileTip2];
    } else {
      const tip1 = language === 'el'
        ? 'Συνέχισε να χρησιμοποιείς το επιλεγμένο προφίλ - τα δεδομένα χρειάζονται χρόνο για να συγκεντρωθούν.'
        : 'Keep using the featured profile - data needs time to accumulate.';
      return [tip1, t.profileTip2];
    }
  };

  const getOfferTips = () => {
    const totalViews = data.offers.views.without + data.offers.views.with;
    const totalVisits = data.offers.visits.without + data.offers.visits.with;
    const visitsChange = data.offers.visits.change;
    
    if (totalViews === 0 && totalVisits === 0) {
      return [t.noData];
    }
    
    const day = getDayName(data.bestDays.offers, language);
    
    // Dynamic tips based on actual conversion
    if (visitsChange > 50) {
      const tip1 = language === 'el'
        ? `Οι προσφορές με προβολή φέρνουν +${visitsChange}% περισσότερες επισκέψεις! Η διαφορά είναι πιο έντονη την ${day}.`
        : `Offers with boost bring +${visitsChange}% more visits! The difference is more pronounced on ${day}.`;
      return [tip1, t.offerTip2];
    } else if (visitsChange > 0) {
      const tip1 = `${t.offerTip1} ${t.offerTip1Suffix} ${day}.`;
      return [tip1, t.offerTip2];
    } else if (data.offers.views.with > data.offers.views.without) {
      const tip1 = language === 'el'
        ? 'Η προβολή αυξάνει τις προβολές προσφορών. Δοκίμασε πιο ελκυστικές προσφορές για καλύτερη μετατροπή σε επισκέψεις.'
        : 'Boost increases offer views. Try more attractive offers for better conversion to visits.';
      return [tip1, t.offerTip2];
    } else {
      return [t.offerTip1, t.offerTip2];
    }
  };

  const getEventTips = () => {
    const totalViews = data.events.views.without + data.events.views.with;
    const totalInteractions = data.events.interactions.without + data.events.interactions.with;
    const interactionsChange = data.events.interactions.change;
    const visitsChange = data.events.visits.change;
    
    if (totalViews === 0 && totalInteractions === 0) {
      return [t.noData];
    }
    
    // Dynamic tips based on actual RSVP and visit changes
    if (interactionsChange > 30) {
      const tip1 = language === 'el'
        ? `Η προβολή αυξάνει τα RSVPs κατά +${interactionsChange}%. Όσο πλησιάζει η ημερομηνία, η διαφορά γίνεται πιο εμφανής.`
        : `Boost increases RSVPs by +${interactionsChange}%. As the date approaches, the difference becomes more evident.`;
      return [tip1, t.eventTip2];
    } else if (visitsChange > 0) {
      const tip1 = language === 'el'
        ? `Οι εκδηλώσεις με προβολή έχουν +${visitsChange}% περισσότερα check-ins.`
        : `Events with boost have +${visitsChange}% more check-ins.`;
      return [tip1, t.eventTip2];
    } else {
      return [t.eventTip1, t.eventTip2];
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      <ComparisonTable
        title={t.profileBlock}
        icon={User}
        data={data.profile}
        withoutLabel={t.without}
        withLabel={t.withBoost}
        tips={getProfileTips()}
        language={language}
        blockType="profile"
      />

      <ComparisonTable
        title={t.offersBlock}
        icon={Tag}
        data={data.offers}
        withoutLabel={t.withoutOffer}
        withLabel={t.withOffer}
        tips={getOfferTips()}
        language={language}
        blockType="offers"
      />

      <ComparisonTable
        title={t.eventsBlock}
        icon={Calendar}
        data={data.events}
        withoutLabel={t.withoutOffer}
        withLabel={t.withOffer}
        tips={getEventTips()}
        language={language}
        blockType="events"
      />
    </div>
  );
};
