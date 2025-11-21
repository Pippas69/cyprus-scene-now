import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { AnalyticsOverview } from '@/components/business/analytics/AnalyticsOverview';
import { EventPerformanceTable } from '@/components/business/analytics/EventPerformanceTable';
import { AudienceInsights } from '@/components/business/analytics/AudienceInsights';
import { TimeAnalytics } from '@/components/business/analytics/TimeAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

const translations = {
  el: {
    title: 'Αναλυτικά Στοιχεία',
    overview: 'Επισκόπηση',
    events: 'Εκδηλώσεις',
    audience: 'Κοινό',
    timing: 'Χρονισμός',
  },
  en: {
    title: 'Analytics',
    overview: 'Overview',
    events: 'Events',
    audience: 'Audience',
    timing: 'Timing',
  },
};

export default function AnalyticsDashboard() {
  const { language } = useLanguage();
  const t = translations[language];
  const { businessId } = useParams();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data, isLoading } = useAdvancedAnalytics(
    businessId || null,
    dateRange
      ? {
          startDate: dateRange.from || subDays(new Date(), 30),
          endDate: dateRange.to || new Date(),
        }
      : undefined
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="events">{t.events}</TabsTrigger>
          <TabsTrigger value="audience">{t.audience}</TabsTrigger>
          <TabsTrigger value="timing">{t.timing}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview data={data} language={language} />
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <EventPerformanceTable data={data} language={language} />
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <AudienceInsights data={data} language={language} />
        </TabsContent>

        <TabsContent value="timing" className="space-y-6">
          <TimeAnalytics data={data} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
