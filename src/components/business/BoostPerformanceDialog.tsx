import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBoostAnalytics } from '@/hooks/useBoostAnalytics';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Eye,
  MousePointer,
  Users,
  TrendingUp,
  Target,
  Euro,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface BoostPerformanceDialogProps {
  boostId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const translations = {
  el: {
    title: 'Απόδοση Boost',
    noData: 'Δεν υπάρχουν δεδομένα ακόμα',
    noDataDesc: 'Τα στατιστικά θα εμφανιστούν όταν το boost γίνει ενεργό',
    impressions: 'Εμφανίσεις',
    clicks: 'Κλικ',
    conversions: 'Μετατροπές',
    interested: 'Ενδιαφέρονται',
    going: 'Θα πάνε',
    ctr: 'CTR',
    conversionRate: 'Ποσοστό Μετατροπής',
    costPerClick: 'Κόστος ανά Κλικ',
    costPerConversion: 'Κόστος ανά Μετατροπή',
    uniqueViewers: 'Μοναδικοί Θεατές',
    dailyPerformance: 'Ημερήσια Απόδοση',
    totalCost: 'Συνολικό Κόστος',
    period: 'Περίοδος',
    status: 'Κατάσταση',
    active: 'Ενεργό',
    scheduled: 'Προγραμματισμένο',
    completed: 'Ολοκληρωμένο',
    paused: 'Σε παύση',
  },
  en: {
    title: 'Boost Performance',
    noData: 'No data yet',
    noDataDesc: 'Stats will appear once your boost is active',
    impressions: 'Impressions',
    clicks: 'Clicks',
    conversions: 'Conversions',
    interested: 'Interested',
    going: 'Going',
    ctr: 'CTR',
    conversionRate: 'Conversion Rate',
    costPerClick: 'Cost per Click',
    costPerConversion: 'Cost per Conversion',
    uniqueViewers: 'Unique Viewers',
    dailyPerformance: 'Daily Performance',
    totalCost: 'Total Cost',
    period: 'Period',
    status: 'Status',
    active: 'Active',
    scheduled: 'Scheduled',
    completed: 'Completed',
    paused: 'Paused',
  },
};

export function BoostPerformanceDialog({
  boostId,
  open,
  onOpenChange,
}: BoostPerformanceDialogProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { loading, summary, boost } = useBoostAnalytics(boostId);
  const dateLocale = language === 'el' ? el : enUS;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      active: { label: t.active, variant: 'default' },
      scheduled: { label: t.scheduled, variant: 'secondary' },
      completed: { label: t.completed, variant: 'outline' },
      paused: { label: t.paused, variant: 'destructive' },
    };
    const config = statusMap[status] || statusMap.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatChartData = () => {
    if (!summary?.dailyData) return [];
    return summary.dailyData.map((d) => ({
      date: format(parseISO(d.date), 'dd/MM', { locale: dateLocale }),
      [t.impressions]: d.impressions,
      [t.clicks]: d.clicks,
      [t.conversions]: d.rsvps_interested + d.rsvps_going,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !summary || summary.totalImpressions === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t.noData}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.noDataDesc}</p>
            {boost && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(parseISO(boost.start_date), 'dd MMM', { locale: dateLocale })} -{' '}
                {format(parseISO(boost.end_date), 'dd MMM yyyy', { locale: dateLocale })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Boost Info Header */}
            {boost && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-medium">{boost.events?.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(parseISO(boost.start_date), 'dd MMM', { locale: dateLocale })} -{' '}
                    {format(parseISO(boost.end_date), 'dd MMM yyyy', { locale: dateLocale })}
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(boost.status || 'scheduled')}
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.totalCost}: €{((boost.total_cost_cents || 0) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">{t.impressions}</span>
                  </div>
                  <div className="text-2xl font-bold">{summary.totalImpressions.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MousePointer className="h-4 w-4" />
                    <span className="text-xs">{t.clicks}</span>
                  </div>
                  <div className="text-2xl font-bold">{summary.totalClicks.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.ctr}: {summary.ctr.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">{t.conversions}</span>
                  </div>
                  <div className="text-2xl font-bold">{summary.totalConversions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {summary.totalRsvpsInterested} {t.interested} · {summary.totalRsvpsGoing} {t.going}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">{t.conversionRate}</span>
                  </div>
                  <div className="text-2xl font-bold">{summary.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Euro className="h-4 w-4" />
                    <span className="text-xs">{t.costPerClick}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {summary.costPerClick > 0 ? `€${summary.costPerClick.toFixed(2)}` : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">{t.costPerConversion}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {summary.costPerConversion > 0 ? `€${summary.costPerConversion.toFixed(2)}` : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Chart */}
            {summary.dailyData.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-4">{t.dailyPerformance}</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatChartData()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey={t.impressions} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={t.clicks} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={t.conversions} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
