import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
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
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  title,
  icon: Icon,
  data,
  withoutLabel,
  withLabel,
  tips,
  language,
}) => {
  const t = translations[language];
  const hasData = data.views.without > 0 || data.views.with > 0;

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
              <tr className="border-b">
                <td className="py-3">{t.views}</td>
                <td className="text-right py-3">{data.views.without.toLocaleString()}</td>
                <td className="text-right py-3 font-semibold">{data.views.with.toLocaleString()}</td>
                <td className="text-right py-3"><ChangeIndicator change={data.views.change} /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3">{t.interactions}</td>
                <td className="text-right py-3">{data.interactions.without.toLocaleString()}</td>
                <td className="text-right py-3 font-semibold">{data.interactions.with.toLocaleString()}</td>
                <td className="text-right py-3"><ChangeIndicator change={data.interactions.change} /></td>
              </tr>
              <tr>
                <td className="py-3">{t.visits}</td>
                <td className="text-right py-3">{data.visits.without.toLocaleString()}</td>
                <td className="text-right py-3 font-semibold">{data.visits.with.toLocaleString()}</td>
                <td className="text-right py-3"><ChangeIndicator change={data.visits.change} /></td>
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
      />

      <ComparisonTable
        title={t.offersBlock}
        icon={Tag}
        data={data.offers}
        withoutLabel={t.withoutOffer}
        withLabel={t.withOffer}
        tips={getOfferTips()}
        language={language}
      />

      <ComparisonTable
        title={t.eventsBlock}
        icon={Calendar}
        data={data.events}
        withoutLabel={t.withoutOffer}
        withLabel={t.withOffer}
        tips={getEventTips()}
        language={language}
      />
    </div>
  );
};
