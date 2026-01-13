import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, TrendingUp, TrendingDown, Minus, Lightbulb, Eye, MousePointer, MapPin, Info } from 'lucide-react';
import { useBoostValueMetrics } from '@/hooks/useBoostValueMetrics';

const translations = {
  el: {
    title: 'Αξία Προώθησης',
    subtitle: 'Σύγκριση απόδοσης με και χωρίς προβολή',
    profileBlock: 'Απόδοση Επιλεγμένου Προφίλ',
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
    profileTip1: 'Το επιλεγμένο προφίλ αυξάνει σταθερά τις επισκέψεις σε σχέση με το βασικό προφίλ. Η μεγαλύτερη διαφορά εμφανίζεται σε μέρες με αυξημένη έξοδο.',
    profileTip2: 'Η αξία του επιλεγμένου προφίλ φαίνεται όταν συνδυάζεται με ενεργές προσφορές ή εκδηλώσεις. Το προφίλ λειτουργεί ως κεντρικό σημείο ανακάλυψης.',
    offerTip1: 'Οι προσφορές με προβολή μετατρέπουν περισσότερο το ενδιαφέρον σε επισκέψεις.',
    offerTip2: 'Χωρίς προβολή, οι προσφορές παραμένουν κυρίως σε επίπεδο προβολής. Η προβολή βοηθά να έρθει ο κόσμος στο κατάστημα.',
    eventTip1: 'Η προβολή αυξάνει την πρόθεση συμμετοχής στις εκδηλώσεις. Όσο πλησιάζει η ημερομηνία, η διαφορά γίνεται πιο εμφανής.',
    eventTip2: 'Οι εκδηλώσεις με ξεκάθαρη ημέρα και ώρα επωφελούνται περισσότερο από την προβολή.',
    dataSource: 'Πηγή δεδομένων',
    // Metric explanations
    profileViewsExplanation: 'Εμφανίσεις του προφίλ με/χωρίς επιλογή',
    profileViewsDetails: 'Σύγκριση προβολών όταν το προφίλ είναι επιλεγμένο (featured) έναντι βασικού. Οι προβολές περιλαμβάνουν feed, χάρτη και αναζητήσεις.',
    profileViewsSource: 'Feed, χάρτης, αναζητήσεις',
    profileInteractionsExplanation: 'Αλληλεπιδράσεις με το επιλεγμένο vs βασικό προφίλ',
    profileInteractionsDetails: 'Follows, saves και shares. Το επιλεγμένο προφίλ προσελκύει περισσότερη προσοχή και ενέργειες.',
    profileInteractionsSource: 'Follows, saves, shares',
    profileVisitsExplanation: 'Επισκέψεις με/χωρίς επιλεγμένο προφίλ',
    profileVisitsDetails: 'QR check-ins και κρατήσεις όταν το προφίλ ήταν επιλεγμένο. Δείχνει την πραγματική επίδραση στην κίνηση.',
    profileVisitsSource: 'QR check-ins, κρατήσεις',
    offersViewsExplanation: 'Εμφανίσεις προσφορών με/χωρίς προβολή',
    offersViewsDetails: 'Πόσες φορές εμφανίστηκαν οι προσφορές όταν ήταν προωθημένες vs απλές.',
    offersViewsSource: 'Feed προσφορών, σελίδα επιχείρησης',
    offersInteractionsExplanation: 'Ενδιαφέρον για προωθημένες vs απλές προσφορές',
    offersInteractionsDetails: 'Αποθηκεύσεις, shares και κλικ. Η προβολή αυξάνει σημαντικά το ενδιαφέρον.',
    offersInteractionsSource: 'Saves, shares, κλικ',
    offersVisitsExplanation: 'Εξαργυρώσεις προωθημένων vs απλών προσφορών',
    offersVisitsDetails: 'QR εξαργυρώσεις και κρατήσεις με προσφορά. Η προβολή μετατρέπει ενδιαφέρον σε επισκέψεις.',
    offersVisitsSource: 'QR εξαργυρώσεις, κρατήσεις',
    eventsViewsExplanation: 'Εμφανίσεις εκδηλώσεων με/χωρίς προβολή',
    eventsViewsDetails: 'Πόσες φορές εμφανίστηκαν οι εκδηλώσεις όταν ήταν προωθημένες vs απλές.',
    eventsViewsSource: 'Feed εκδηλώσεων, χάρτης',
    eventsInteractionsExplanation: 'RSVPs για προωθημένες vs απλές εκδηλώσεις',
    eventsInteractionsDetails: 'Ενδιαφερόμενοι και "Θα πάω". Η προβολή αυξάνει την πρόθεση συμμετοχής.',
    eventsInteractionsSource: 'Ενδιαφερόμενοι, Θα πάω RSVPs',
    eventsVisitsExplanation: 'Check-ins σε προωθημένες vs απλές εκδηλώσεις',
    eventsVisitsDetails: 'QR check-ins από εισιτήρια ή κρατήσεις. Δείχνει την πραγματική συμμετοχή.',
    eventsVisitsSource: 'QR check-ins (εισιτήρια, κρατήσεις)',
  },
  en: {
    title: 'Boost Value',
    subtitle: 'Performance comparison with and without boost',
    profileBlock: 'Featured Profile Performance',
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
    profileTip1: 'The featured profile consistently increases visits compared to the basic profile. The biggest difference appears on days with high activity.',
    profileTip2: 'The value of the featured profile is evident when combined with active offers or events. The profile acts as a central discovery point.',
    offerTip1: 'Offers with boost convert more interest into visits.',
    offerTip2: 'Without boost, offers mostly stay at view level. Boost helps bring people to the store.',
    eventTip1: 'Boost increases participation intent for events. As the date approaches, the difference becomes more evident.',
    eventTip2: 'Events with a clear date and time benefit most from boost.',
    dataSource: 'Data source',
    // Metric explanations
    profileViewsExplanation: 'Profile views with/without featuring',
    profileViewsDetails: 'Comparison of views when profile is featured vs basic. Views include feed, map and searches.',
    profileViewsSource: 'Feed, map, searches',
    profileInteractionsExplanation: 'Interactions with featured vs basic profile',
    profileInteractionsDetails: 'Follows, saves and shares. Featured profile attracts more attention and actions.',
    profileInteractionsSource: 'Follows, saves, shares',
    profileVisitsExplanation: 'Visits with/without featured profile',
    profileVisitsDetails: 'QR check-ins and reservations when profile was featured. Shows real impact on traffic.',
    profileVisitsSource: 'QR check-ins, reservations',
    offersViewsExplanation: 'Offer views with/without boost',
    offersViewsDetails: 'How many times offers appeared when boosted vs regular.',
    offersViewsSource: 'Offers feed, business page',
    offersInteractionsExplanation: 'Interest in boosted vs regular offers',
    offersInteractionsDetails: 'Saves, shares and clicks. Boost significantly increases interest.',
    offersInteractionsSource: 'Saves, shares, clicks',
    offersVisitsExplanation: 'Redemptions of boosted vs regular offers',
    offersVisitsDetails: 'QR redemptions and offer reservations. Boost converts interest into visits.',
    offersVisitsSource: 'QR redemptions, reservations',
    eventsViewsExplanation: 'Event views with/without boost',
    eventsViewsDetails: 'How many times events appeared when boosted vs regular.',
    eventsViewsSource: 'Events feed, map',
    eventsInteractionsExplanation: 'RSVPs for boosted vs regular events',
    eventsInteractionsDetails: 'Interested and Going. Boost increases participation intent.',
    eventsInteractionsSource: 'Interested, Going RSVPs',
    eventsVisitsExplanation: 'Check-ins at boosted vs regular events',
    eventsVisitsDetails: 'QR check-ins from tickets or reservations. Shows actual attendance.',
    eventsVisitsSource: 'QR check-ins (tickets, reservations)',
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
      <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
        <TrendingUp className="h-4 w-4 mr-1" />
        +{change}%
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
        <TrendingDown className="h-4 w-4 mr-1" />
        {change}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground">
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
          <td className="py-3">
            <span className="flex items-center gap-1">
              {label}
              <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </span>
          </td>
          <td className="text-right py-3">{without.toLocaleString()}</td>
          <td className="text-right py-3 font-semibold">{withBoost.toLocaleString()}</td>
          <td className="text-right py-3"><ChangeIndicator change={change} /></td>
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
                <th className="text-left py-2 font-medium text-muted-foreground">{t.metric}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{withoutLabel}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{withLabel}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t.change}</th>
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
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            {t.tips}
          </div>
          {hasData ? (
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <p key={index} className="text-sm text-muted-foreground pl-6">
                  {index + 1}. {tip}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic pl-6">{t.noData}</p>
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

  // Generate dynamic tips based on best days
  const getProfileTips = () => {
    const tip1 = t.profileTip1.replace('μέρες με αυξημένη έξοδο', data.bestDays.profile);
    return [tip1, t.profileTip2];
  };

  const getOfferTips = () => {
    const tip1 = `${t.offerTip1} Η διαφορά είναι πιο έντονη σε ${data.bestDays.offers}.`;
    return [tip1, t.offerTip2];
  };

  const getEventTips = () => {
    return [t.eventTip1, t.eventTip2];
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
