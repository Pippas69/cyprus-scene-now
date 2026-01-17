import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, Eye, MousePointer, MapPin, Users, Info } from 'lucide-react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useAudienceMetrics } from '@/hooks/useAudienceMetrics';
import { Progress } from '@/components/ui/progress';

const translations = {
  el: {
    performanceTitle: 'Απόδοση Στοιχείων',
    audienceTitle: 'Κοινό που επισκέφθηκε το μαγαζί',
    profile: 'Προφίλ',
    offers: 'Προσφορές',
    events: 'Εκδηλώσεις',
    views: 'Προβολές',
    interactions: 'Αλληλεπιδράσεις',
    visits: 'Επισκέψεις',
    gender: 'Φύλο',
    age: 'Ηλικία',
    region: 'Περιοχή',
    male: 'Άνδρες',
    female: 'Γυναίκες',
    other: 'Άλλο',
    audienceSubtitle: 'Δημογραφικά από επαληθευμένες επισκέψεις (QR εξαργύρωση / check-in).',
    totalVisitsLabel: 'Σύνολο επισκέψεων',
    profileDesc: 'Συνολικές ενέργειες στο προφίλ',
    offersDesc: 'Συνολικές ενέργειες στις προσφορές',
    eventsDesc: 'Συνολικές ενέργειες στις εκδηλώσεις',
    genderExplanation: 'Φύλο πελατών που ΕΠΑΛΗΘΕΥΜΕΝΑ επισκέφθηκαν το μαγαζί (QR scan / check-in).',
    ageExplanation: 'Ηλικιακές ομάδες πελατών που ΕΠΑΛΗΘΕΥΜΕΝΑ επισκέφθηκαν το μαγαζί (QR scan / check-in).',
    regionExplanation: 'Πόλεις πελατών που ΕΠΑΛΗΘΕΥΜΕΝΑ επισκέφθηκαν το μαγαζί (QR scan / check-in).',
    regionNoData: 'Δεν υπάρχουν δεδομένα πόλης για επισκέψεις. Θα εμφανιστούν όταν οι πελάτες έχουν συμπληρώσει πόλη στο sign up.',
    dataSource: 'Πηγή δεδομένων',
    // Views - πόσες φορές είδαν οι χρήστες το περιεχόμενο από οπουδήποτε
    viewsExplanation: 'Πόσες φορές είδαν οι χρήστες',
    profileViewsDetails: 'Πόσες φορές είδαν οι χρήστες τη σελίδα του προφίλ σου από οπουδήποτε - feed, χάρτη, αναζήτηση, κοινοποιήσεις κ.λπ.',
    offersViewsDetails: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των προσφορών σου από οπουδήποτε.',
    eventsViewsDetails: 'Πόσες φορές είδαν οι χρήστες τις σελίδες των εκδηλώσεών σου από οπουδήποτε.',
    profileViewsSource: 'Όλες οι πηγές',
    offersViewsSource: 'Όλες οι σελίδες προσφορών',
    eventsViewsSource: 'Όλες οι σελίδες εκδηλώσεων',
    // Interactions - ενδιαφέρον χρηστών
    interactionsExplanation: 'Ενδιαφέρον χρηστών',
    profileInteractionsDetails: 'Χρήστες που ακολούθησαν, μοιράστηκαν ή έκαναν κλικ στο προφίλ σου.',
    offersInteractionsDetails: 'Κλικ στο κουμπί "Εξαργύρωσε" – δείχνει πρόθεση χρήσης της προσφοράς.',
    eventsInteractionsDetails: 'RSVPs χρηστών: "Ενδιαφέρομαι" ή "Θα πάω".',
    profileInteractionsSource: 'Ακολουθήσεις, κοινοποιήσεις, κλικ',
    offersInteractionsSource: 'Κλικ στο "Εξαργύρωσε"',
    eventsInteractionsSource: 'RSVPs (Ενδιαφέρομαι/Θα πάω)',
    // Visits - πραγματικές επισκέψεις με QR
    visitsExplanation: 'Επαληθευμένες επισκέψεις',
    profileVisitsDetails: 'QR check-ins από κρατήσεις που έγιναν απευθείας μέσω του προφίλ σου.',
    offersVisitsDetails: 'Σαρώσεις QR για εξαργύρωση προσφοράς στον χώρο σου, είτε με κράτηση είτε χωρίς (walk-in).',
    eventsVisitsDetails: 'Check-ins εισιτηρίων και κρατήσεων εκδηλώσεων (minimum charge).',
    profileVisitsSource: 'QR σαρώσεις κρατήσεων προφίλ',
    offersVisitsSource: 'QR εξαργυρώσεις προσφορών',
    eventsVisitsSource: 'QR check-ins εισιτηρίων/κρατήσεων',
  },
  en: {
    performanceTitle: 'Element Performance',
    audienceTitle: 'Audience',
    profile: 'Profile',
    offers: 'Offers',
    events: 'Events',
    views: 'Views',
    interactions: 'Interactions',
    visits: 'Visits',
    gender: 'Gender',
    age: 'Age',
    region: 'Region',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    audienceSubtitle: 'Demographics from verified visits (QR redemption / check-in).',
    totalVisitsLabel: 'Total visits',
    profileDesc: 'Total actions on profile',
    offersDesc: 'Total actions on offers',
    eventsDesc: 'Total actions on events',
    genderExplanation: 'Distribution of your audience by gender.',
    ageExplanation: 'Distribution of your audience by age group.',
    regionExplanation: 'Top regions where your audience comes from.',
    regionNoData: 'No region data yet. When customers with a city in their profile book or buy tickets, they will appear here.',
    dataSource: 'Data source',
    // Views - from anywhere
    viewsExplanation: 'How many times users saw',
    profileViewsDetails: 'How many times users viewed your profile page from anywhere - feed, map, search, shared links, etc.',
    offersViewsDetails: 'How many times users viewed your offer pages from anywhere.',
    eventsViewsDetails: 'How many times users viewed your event pages from anywhere.',
    profileViewsSource: 'All sources',
    offersViewsSource: 'All offer pages',
    eventsViewsSource: 'All event pages',
    // Interactions
    interactionsExplanation: 'User interest',
    profileInteractionsDetails: 'Users who followed, shared, or clicked on your profile.',
    offersInteractionsDetails: 'Clicks on "Redeem" button – shows intent to use the offer.',
    eventsInteractionsDetails: 'User RSVPs: "Interested" or "Going".',
    profileInteractionsSource: 'Follows, shares, clicks',
    offersInteractionsSource: 'Clicks on "Redeem"',
    eventsInteractionsSource: 'RSVPs (Interested/Going)',
    // Visits - verified with QR
    visitsExplanation: 'Verified visits',
    profileVisitsDetails: 'QR check-ins from reservations made directly through your profile.',
    offersVisitsDetails: 'QR scans for offer redemption at your venue, with or without reservation (walk-in).',
    eventsVisitsDetails: 'Ticket and event reservation (minimum charge) check-ins.',
    profileVisitsSource: 'Profile reservation QR scans',
    offersVisitsSource: 'Offer QR redemptions',
    eventsVisitsSource: 'Ticket/reservation QR check-ins',
  },
};

interface PerformanceTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: 'el' | 'en';
}

type MetricType = 'profile' | 'offers' | 'events';

interface MetricExplanation {
  explanation: string;
  details: string;
  source: string;
}

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  views: number;
  interactions: number;
  visits: number;
  language: 'el' | 'en';
  metricType: MetricType;
}

const getMetricExplanations = (language: 'el' | 'en', metricType: MetricType): { views: MetricExplanation; interactions: MetricExplanation; visits: MetricExplanation } => {
  const t = translations[language];
  const explanations = {
    profile: {
      views: { explanation: t.viewsExplanation, details: t.profileViewsDetails, source: t.profileViewsSource },
      interactions: { explanation: t.interactionsExplanation, details: t.profileInteractionsDetails, source: t.profileInteractionsSource },
      visits: { explanation: t.visitsExplanation, details: t.profileVisitsDetails, source: t.profileVisitsSource },
    },
    offers: {
      views: { explanation: t.viewsExplanation, details: t.offersViewsDetails, source: t.offersViewsSource },
      interactions: { explanation: t.interactionsExplanation, details: t.offersInteractionsDetails, source: t.offersInteractionsSource },
      visits: { explanation: t.visitsExplanation, details: t.offersVisitsDetails, source: t.offersVisitsSource },
    },
    events: {
      views: { explanation: t.viewsExplanation, details: t.eventsViewsDetails, source: t.eventsViewsSource },
      interactions: { explanation: t.interactionsExplanation, details: t.eventsInteractionsDetails, source: t.eventsInteractionsSource },
      visits: { explanation: t.visitsExplanation, details: t.eventsVisitsDetails, source: t.eventsVisitsSource },
    },
  };
  return explanations[metricType];
};

interface ClickableMetricProps {
  label: string;
  value: number;
  icon: React.ElementType;
  explanation: MetricExplanation;
  dataSourceLabel: string;
}

const ClickableMetric: React.FC<ClickableMetricProps> = ({ label, value, icon: Icon, explanation, dataSourceLabel }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors group">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            {label}
            <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="font-semibold">{value.toLocaleString()}</span>
        </div>
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
            <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
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

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  title,
  description,
  views,
  interactions,
  visits,
  language,
  metricType,
}) => {
  const t = translations[language];
  const explanations = getMetricExplanations(language, metricType);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-1">
        <ClickableMetric
          label={t.views}
          value={views}
          icon={Eye}
          explanation={explanations.views}
          dataSourceLabel={t.dataSource}
        />
        <ClickableMetric
          label={t.interactions}
          value={interactions}
          icon={MousePointer}
          explanation={explanations.interactions}
          dataSourceLabel={t.dataSource}
        />
        <ClickableMetric
          label={t.visits}
          value={visits}
          icon={MapPin}
          explanation={explanations.visits}
          dataSourceLabel={t.dataSource}
        />
      </CardContent>
    </Card>
  );
};

interface AudienceCardProps {
  icon: React.ElementType;
  title: string;
  explanation: string;
  children: React.ReactNode;
}

const AudienceCard: React.FC<AudienceCardProps> = ({
  icon: Icon,
  title,
  explanation,
  children,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{explanation}</p>
          <div className="p-4 bg-muted/50 rounded-lg">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
  total: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, total }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
  businessId,
  dateRange,
  language,
}) => {
  const t = translations[language];
  const { data: metrics, isLoading: metricsLoading } = usePerformanceMetrics(businessId, dateRange);
  const { data: audience, isLoading: audienceLoading } = useAudienceMetrics(businessId, dateRange);

  if (metricsLoading || audienceLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const genderTotal = (audience?.gender?.male || 0) + (audience?.gender?.female || 0) + (audience?.gender?.other || 0);
  const ageValues = Object.values(audience?.age || {}) as number[];
  const ageTotal = ageValues.reduce((a, b) => a + b, 0);
  
  // Convert region object to array and sort by count
  const regionArray = Object.entries(audience?.region || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const regionTotal = regionArray.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-8">
      {/* Performance Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t.performanceTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={User}
            title={t.profile}
            description={t.profileDesc}
            views={metrics?.profile.views || 0}
            interactions={metrics?.profile.interactions || 0}
            visits={metrics?.profile.visits || 0}
            language={language}
            metricType="profile"
          />
          <MetricCard
            icon={Tag}
            title={t.offers}
            description={t.offersDesc}
            views={metrics?.offers.views || 0}
            interactions={metrics?.offers.interactions || 0}
            visits={metrics?.offers.visits || 0}
            language={language}
            metricType="offers"
          />
          <MetricCard
            icon={Calendar}
            title={t.events}
            description={t.eventsDesc}
            views={metrics?.events.views || 0}
            interactions={metrics?.events.interactions || 0}
            visits={metrics?.events.visits || 0}
            language={language}
            metricType="events"
          />
        </div>
      </div>

      {/* Audience Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t.audienceTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.audienceSubtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t.totalVisitsLabel}:</span>
            <span className="text-sm font-semibold text-foreground">{genderTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AudienceCard icon={Users} title={t.gender} explanation={t.genderExplanation}>
            <div className="space-y-3">
              <MetricBar label={t.male} value={audience?.gender?.male || 0} total={genderTotal} />
              <MetricBar label={t.female} value={audience?.gender?.female || 0} total={genderTotal} />
              <MetricBar label={t.other} value={audience?.gender?.other || 0} total={genderTotal} />
            </div>
          </AudienceCard>

          <AudienceCard icon={Calendar} title={t.age} explanation={t.ageExplanation}>
            <div className="space-y-3">
              {(['18-24', '25-34', '35-44', '45-54', '55+', 'Άγνωστο'] as const)
                .filter((key) => (audience?.age?.[key] ?? 0) > 0 || key === 'Άγνωστο')
                .map((key) => (
                  <MetricBar key={key} label={key} value={(audience?.age?.[key] as number) || 0} total={ageTotal} />
                ))}
            </div>
          </AudienceCard>

          <AudienceCard icon={MapPin} title={t.region} explanation={t.regionExplanation}>
            <div className="space-y-3">
              {regionArray.length > 0 ? (
                regionArray.slice(0, 6).map((r) => (
                  <MetricBar key={r.name} label={r.name} value={r.count} total={regionTotal} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">{t.regionNoData}</p>
              )}
            </div>
          </AudienceCard>
        </div>
      </div>
    </div>
  );
};
