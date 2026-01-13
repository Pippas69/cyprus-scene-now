import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { OverviewTab } from '@/components/business/analytics/OverviewTab';
import { PerformanceTab } from '@/components/business/analytics/PerformanceTab';
import { BoostValueTab } from '@/components/business/analytics/BoostValueTab';
import { GuidanceTab } from '@/components/business/analytics/GuidanceTab';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

const translations = {
  el: {
    title: 'Τα Αναλυτικά σου',
    overview: 'Επισκόπηση',
    performance: 'Απόδοση',
    boostValue: 'Αξία Προώθησης',
    guidance: 'Καθοδήγηση',
  },
  en: {
    title: 'Your Analytics',
    overview: 'Overview',
    performance: 'Performance',
    boostValue: 'Boost Value',
    guidance: 'Guidance',
  },
};

interface AnalyticsDashboardProps {
  businessId: string;
}

export default function AnalyticsDashboard({ businessId }: AnalyticsDashboardProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const convertedDateRange = dateRange?.from && dateRange?.to 
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="performance">{t.performance}</TabsTrigger>
          <TabsTrigger value="boostValue">{t.boostValue}</TabsTrigger>
          <TabsTrigger value="guidance">{t.guidance}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="boostValue">
          <BoostValueTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="guidance">
          <GuidanceTab businessId={businessId} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
