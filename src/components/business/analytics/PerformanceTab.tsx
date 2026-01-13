import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, Eye, MousePointer, MapPin, Users } from 'lucide-react';
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
    viewsExplanation: 'Αριθμός φορών που χρήστες είδαν το στοιχείο.',
    interactionsExplanation: 'Αποθηκεύσεις, ενδιαφέρον, follows και shares.',
    visitsExplanation: 'Check-ins, κρατήσεις και σκαναρισμένα εισιτήρια.',
    genderExplanation: 'Κατανομή του κοινού σας ανά φύλο.',
    ageExplanation: 'Κατανομή του κοινού σας ανά ηλικιακή ομάδα.',
    regionExplanation: 'Οι κορυφαίες περιοχές από όπου προέρχεται το κοινό σας.',
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
    viewsExplanation: 'Number of times users viewed the element.',
    interactionsExplanation: 'Saves, interests, follows and shares.',
    visitsExplanation: 'Check-ins, reservations and scanned tickets.',
    genderExplanation: 'Distribution of your audience by gender.',
    ageExplanation: 'Distribution of your audience by age group.',
    regionExplanation: 'Top regions where your audience comes from.',
  },
};

interface PerformanceTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: 'el' | 'en';
}

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  views: number;
  interactions: number;
  visits: number;
  language: 'el' | 'en';
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  title,
  description,
  views,
  interactions,
  visits,
  language,
}) => {
  const t = translations[language];

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
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.views}</span>
              <span className="font-semibold">{views.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.interactions}</span>
              <span className="font-semibold">{interactions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.visits}</span>
              <span className="font-semibold">{visits.toLocaleString()}</span>
            </div>
          </CardContent>
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
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span>{t.views}</span>
              </div>
              <span className="text-xl font-bold">{views.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-2">{t.viewsExplanation}</p>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-primary" />
                <span>{t.interactions}</span>
              </div>
              <span className="text-xl font-bold">{interactions.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-2">{t.interactionsExplanation}</p>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{t.visits}</span>
              </div>
              <span className="text-xl font-bold">{visits.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-2">{t.visitsExplanation}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const regionTotal = (audience?.region || []).reduce((sum, r) => sum + r.count, 0);

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
          />
          <MetricCard
            icon={Tag}
            title={t.offers}
            description={t.offersDesc}
            views={metrics?.offers.views || 0}
            interactions={metrics?.offers.interactions || 0}
            visits={metrics?.offers.visits || 0}
            language={language}
          />
          <MetricCard
            icon={Calendar}
            title={t.events}
            description={t.eventsDesc}
            views={metrics?.events.views || 0}
            interactions={metrics?.events.interactions || 0}
            visits={metrics?.events.visits || 0}
            language={language}
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
              {(audience?.region || []).slice(0, 5).map(r => (
                <MetricBar key={r.name} label={r.name} value={r.count} total={regionTotal} />
              ))}
            </div>
          </AudienceCard>
        </div>
      </div>
    </div>
  );
};
