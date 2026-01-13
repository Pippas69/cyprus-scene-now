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
    audienceTitle: 'Κοινό',
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
    profileDesc: 'Συνολικές προβολές, αλληλεπιδράσεις και επισκέψεις στο προφίλ της επιχείρησης.',
    offersDesc: 'Απόδοση όλων των προσφορών (free + προωθημένες μαζί).',
    eventsDesc: 'Απόδοση εκδηλώσεων. Οι επισκέψεις περιλαμβάνουν check-ins, κρατήσεις και εισιτήρια.',
    genderExplanation: 'Κατανομή του κοινού σας ανά φύλο.',
    ageExplanation: 'Κατανομή του κοινού σας ανά ηλικιακή ομάδα.',
    regionExplanation: 'Οι κορυφαίες περιοχές από όπου προέρχεται το κοινό σας.',
    dataSource: 'Πηγή δεδομένων',
    // Profile explanations
    profileViewsExplanation: 'Πόσο συχνά εμφανίστηκε το προφίλ σας',
    profileViewsDetails: 'Οι προβολές προφίλ περιλαμβάνουν εμφανίσεις στο feed, στον χάρτη, και σε αναζητήσεις. Δείχνει πόσοι χρήστες είδαν την επιχείρησή σας.',
    profileViewsSource: 'Feed, χάρτης, αναζητήσεις',
    profileInteractionsExplanation: 'Ενέργειες που δείχνουν ενδιαφέρον για την επιχείρησή σας',
    profileInteractionsDetails: 'Περιλαμβάνει αποθηκεύσεις, follows, shares και κλικ στο προφίλ σας. Δείχνει πόσοι χρήστες έδειξαν ενδιαφέρον.',
    profileInteractionsSource: 'Αποθηκεύσεις, follows, shares',
    profileVisitsExplanation: 'Επαληθευμένες επισκέψεις στον χώρο σας',
    profileVisitsDetails: 'Check-ins μέσω QR code και ολοκληρωμένες κρατήσεις. Δείχνει πόσοι ήρθαν πραγματικά στην επιχείρησή σας μέσω ΦΟΜΟ.',
    profileVisitsSource: 'QR check-ins, κρατήσεις',
    // Offers explanations
    offersViewsExplanation: 'Εμφανίσεις των προσφορών σας',
    offersViewsDetails: 'Πόσες φορές εμφανίστηκαν οι προσφορές σας στο feed, στις αναζητήσεις και στη σελίδα της επιχείρησής σας.',
    offersViewsSource: 'Feed προσφορών, αναζητήσεις, σελίδα επιχείρησης',
    offersInteractionsExplanation: 'Ενδιαφέρον για τις προσφορές σας',
    offersInteractionsDetails: 'Αποθηκεύσεις, shares και κλικ για λεπτομέρειες στις προσφορές σας. Δείχνει πόσοι σκέφτονται να επωφεληθούν.',
    offersInteractionsSource: 'Αποθηκεύσεις, shares, κλικ',
    offersVisitsExplanation: 'Εξαργυρώσεις προσφορών',
    offersVisitsDetails: 'Επισκέψεις που προήλθαν από εξαργύρωση προσφοράς μέσω QR code ή κράτηση με προσφορά.',
    offersVisitsSource: 'QR εξαργυρώσεις, κρατήσεις με προσφορά',
    // Events explanations
    eventsViewsExplanation: 'Εμφανίσεις των εκδηλώσεών σας',
    eventsViewsDetails: 'Πόσες φορές εμφανίστηκαν οι εκδηλώσεις σας στο feed, στον χάρτη και στις αναζητήσεις.',
    eventsViewsSource: 'Feed εκδηλώσεων, χάρτης, αναζητήσεις',
    eventsInteractionsExplanation: 'RSVPs για τις εκδηλώσεις σας',
    eventsInteractionsDetails: 'Πόσοι δήλωσαν "Ενδιαφέρομαι" ή "Θα πάω" στις εκδηλώσεις σας. Δείχνει την πρόθεση συμμετοχής.',
    eventsInteractionsSource: 'Ενδιαφερόμενοι, Θα πάω RSVPs',
    eventsVisitsExplanation: 'Check-ins στις εκδηλώσεις σας',
    eventsVisitsDetails: 'Επαληθευμένα check-ins μέσω QR code από εισιτήρια ή κρατήσεις. Δείχνει πόσοι παρευρέθηκαν πραγματικά.',
    eventsVisitsSource: 'QR check-ins (εισιτήρια, κρατήσεις)',
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
    profileDesc: 'Total views, interactions and visits to your business profile.',
    offersDesc: 'Performance of all offers (free + boosted combined).',
    eventsDesc: 'Event performance. Visits include check-ins, reservations and tickets.',
    genderExplanation: 'Distribution of your audience by gender.',
    ageExplanation: 'Distribution of your audience by age group.',
    regionExplanation: 'Top regions where your audience comes from.',
    dataSource: 'Data source',
    // Profile explanations
    profileViewsExplanation: 'How often your profile was displayed',
    profileViewsDetails: 'Profile views include appearances in feed, map, and search results. Shows how many users saw your business.',
    profileViewsSource: 'Feed, map, searches',
    profileInteractionsExplanation: 'Actions showing interest in your business',
    profileInteractionsDetails: 'Includes saves, follows, shares and clicks on your profile. Shows how many users showed interest.',
    profileInteractionsSource: 'Saves, follows, shares',
    profileVisitsExplanation: 'Verified visits to your venue',
    profileVisitsDetails: 'Check-ins via QR code and completed reservations. Shows how many actually came to your business via FOMO.',
    profileVisitsSource: 'QR check-ins, reservations',
    // Offers explanations
    offersViewsExplanation: 'How often your offers were displayed',
    offersViewsDetails: 'How many times your offers appeared in feed, searches and on your business page.',
    offersViewsSource: 'Offers feed, searches, business page',
    offersInteractionsExplanation: 'Interest in your offers',
    offersInteractionsDetails: 'Saves, shares and detail clicks on your offers. Shows how many are considering claiming them.',
    offersInteractionsSource: 'Saves, shares, clicks',
    offersVisitsExplanation: 'Offer redemptions',
    offersVisitsDetails: 'Visits from offer redemption via QR code or reservation with offer.',
    offersVisitsSource: 'QR redemptions, offer reservations',
    // Events explanations
    eventsViewsExplanation: 'How often your events were displayed',
    eventsViewsDetails: 'How many times your events appeared in feed, map and searches.',
    eventsViewsSource: 'Events feed, map, searches',
    eventsInteractionsExplanation: 'RSVPs for your events',
    eventsInteractionsDetails: 'How many marked "Interested" or "Going" on your events. Shows participation intent.',
    eventsInteractionsSource: 'Interested, Going RSVPs',
    eventsVisitsExplanation: 'Check-ins at your events',
    eventsVisitsDetails: 'Verified check-ins via QR code from tickets or reservations. Shows actual attendance.',
    eventsVisitsSource: 'QR check-ins (tickets, reservations)',
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
        <h3 className="text-lg font-semibold mb-4">{t.audienceTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AudienceCard icon={Users} title={t.gender} explanation={t.genderExplanation}>
            <div className="space-y-3">
              <MetricBar label={t.male} value={audience?.gender?.male || 0} total={genderTotal} />
              <MetricBar label={t.female} value={audience?.gender?.female || 0} total={genderTotal} />
              <MetricBar label={t.other} value={audience?.gender?.other || 0} total={genderTotal} />
            </div>
          </AudienceCard>

          <AudienceCard icon={Users} title={t.age} explanation={t.ageExplanation}>
            <div className="space-y-3">
              {Object.entries(audience?.age || {}).map(([range, count]) => (
                <MetricBar key={range} label={range} value={count as number} total={ageTotal} />
              ))}
            </div>
          </AudienceCard>

          <AudienceCard icon={MapPin} title={t.region} explanation={t.regionExplanation}>
            <div className="space-y-3">
              {regionArray.slice(0, 5).map(r => (
                <MetricBar key={r.name} label={r.name} value={r.count} total={regionTotal} />
              ))}
            </div>
          </AudienceCard>
        </div>
      </div>
    </div>
  );
};
