import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Tag, Calendar, Eye, MousePointer, MapPin, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useBoostValueMetrics } from '@/hooks/useBoostValueMetrics';

const translations = {
  el: {
    title: 'Απόδοση στοιχείων',
    profile: 'Απόδοση προφίλ',
    offers: 'Απόδοση προσφορών',
    events: 'Απόδοση εκδηλώσεων',
    views: 'Προβολές',
    interactions: 'Αλληλεπιδράσεις',
    visits: 'Επισκέψεις',
    profileDesc: 'Συνολικές ενέργειες στο προφίλ',
    offersDesc: 'Συνολικές ενέργειες στις προσφορές',
    eventsDesc: 'Συνολικές ενέργειες στις εκδηλώσεις',
    tapForComparison: 'Πάτα για σύγκριση με/χωρίς προώθηση',
    withoutBoost: 'Χωρίς προώθηση',
    withBoost: 'Με προώθηση',
    change: 'Μεταβολή',
    metric: 'Μετρική',
    noBoostData: 'Δεν υπάρχουν δεδομένα σύγκρισης ακόμα',
  },
  en: {
    title: 'Performance',
    profile: 'Profile performance',
    offers: 'Offers performance',
    events: 'Events performance',
    views: 'Views',
    interactions: 'Interactions',
    visits: 'Visits',
    profileDesc: 'Total actions on profile',
    offersDesc: 'Total actions on offers',
    eventsDesc: 'Total actions on events',
    tapForComparison: 'Tap for boost comparison',
    withoutBoost: 'Without boost',
    withBoost: 'With boost',
    change: 'Change',
    metric: 'Metric',
    noBoostData: 'No comparison data yet',
  },
};

interface PerformanceCardsProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: 'el' | 'en';
  hideOffers?: boolean;
}

const ChangeIndicator: React.FC<{ change: number }> = ({ change }) => {
  if (change > 0) {
    return (
      <span className="inline-flex items-center text-green-600 dark:text-green-400 font-medium text-xs">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        +{change}%
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="inline-flex items-center text-red-600 dark:text-red-400 font-medium text-xs">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {change}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-muted-foreground text-xs">
      <Minus className="h-3 w-3 mr-0.5" />
      0%
    </span>
  );
};

interface PerformanceCardItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  views: number;
  interactions: number;
  visits: number;
  boostData?: {
    views: { without: number; with: number; change: number };
    interactions: { without: number; with: number; change: number };
    visits: { without: number; with: number; change: number };
  };
  language: 'el' | 'en';
}

const PerformanceCardItem: React.FC<PerformanceCardItemProps> = ({
  icon: Icon,
  title,
  description,
  views,
  interactions,
  visits,
  boostData,
  language,
}) => {
  const t = translations[language];
  const hasBoostData = boostData && (boostData.views.without > 0 || boostData.views.with > 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="hover:shadow-md transition-shadow cursor-pointer group relative">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
              </div>
              <Info className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3 w-3" />{t.views}
              </span>
              <span className="text-sm font-semibold">{views.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <MousePointer className="h-3 w-3" />{t.interactions}
              </span>
              <span className="text-sm font-semibold">{interactions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />{t.visits}
              </span>
              <span className="text-sm font-semibold">{visits.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-[320px] sm:max-w-lg p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {hasBoostData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground text-xs">{t.metric}</th>
                  <th className="text-center py-2 font-medium text-muted-foreground text-xs">{t.withoutBoost}</th>
                  <th className="text-center py-2 font-medium text-muted-foreground text-xs">{t.withBoost}</th>
                  <th className="text-right py-2 font-medium text-muted-foreground text-xs">{t.change}</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label: t.views, icon: Eye, data: boostData!.views },
                  { label: t.interactions, icon: MousePointer, data: boostData!.interactions },
                  { label: t.visits, icon: MapPin, data: boostData!.visits },
                ] as const).map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                      <row.icon className="h-3 w-3 text-muted-foreground" />
                      {row.label}
                    </td>
                    <td className="text-center py-2.5 text-xs sm:text-sm">{row.data.without.toLocaleString()}</td>
                    <td className="text-center py-2.5 font-semibold text-xs sm:text-sm text-primary">{row.data.with.toLocaleString()}</td>
                    <td className="text-right py-2.5"><ChangeIndicator change={row.data.change} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: t.views, value: views, icon: Eye },
              { label: t.interactions, value: interactions, icon: MousePointer },
              { label: t.visits, value: visits, icon: MapPin },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <row.icon className="h-4 w-4" />{row.label}
                </span>
                <span className="text-lg font-bold">{row.value.toLocaleString()}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">{t.noBoostData}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const PerformanceCards: React.FC<PerformanceCardsProps> = ({
  businessId,
  dateRange,
  language,
  hideOffers = false,
}) => {
  const t = translations[language];
  const { data: metrics, isLoading: metricsLoading } = usePerformanceMetrics(businessId, dateRange);
  const { data: boostData, isLoading: boostLoading } = useBoostValueMetrics(businessId, dateRange);

  if (metricsLoading) {
    return (
      <div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hideOffers ? '' : 'lg:grid-cols-3'} gap-3`}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hideOffers ? '' : 'lg:grid-cols-3'} gap-3`}>
        <PerformanceCardItem
          icon={User}
          title={t.profile}
          description={t.profileDesc}
          views={metrics?.profile.views || 0}
          interactions={metrics?.profile.interactions || 0}
          visits={metrics?.profile.visits || 0}
          boostData={boostData?.profile}
          language={language}
        />
        {!hideOffers && (
          <PerformanceCardItem
            icon={Tag}
            title={t.offers}
            description={t.offersDesc}
            views={metrics?.offers.views || 0}
            interactions={metrics?.offers.interactions || 0}
            visits={metrics?.offers.visits || 0}
            boostData={boostData?.offers}
            language={language}
          />
        )}
        <PerformanceCardItem
          icon={Calendar}
          title={t.events}
          description={t.eventsDesc}
          views={metrics?.events.views || 0}
          interactions={metrics?.events.interactions || 0}
          visits={metrics?.events.visits || 0}
          boostData={boostData?.events}
          language={language}
        />
      </div>
    </div>
  );
};
