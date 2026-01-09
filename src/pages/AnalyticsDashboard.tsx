import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { OverviewTab } from '@/components/business/analytics/OverviewTab';
import { BoostBenefitsTab } from '@/components/business/analytics/BoostBenefitsTab';
import { AudienceTab } from '@/components/business/analytics/AudienceTab';
import { TimingInsights } from '@/components/business/analytics/TimingInsights';
import { InsightsEngine } from '@/components/business/analytics/InsightsEngine';
import { ExportTools } from '@/components/business/analytics/ExportTools';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

const translations = {
  el: {
    title: 'Τα Αναλυτικά σου',
    overview: 'Επισκόπηση',
    boostBenefits: 'Boost Benefits',
    audience: 'Κοινό',
    tips: 'Συμβουλές',
  },
  en: {
    title: 'Your Analytics',
    overview: 'Overview',
    boostBenefits: 'Boost Benefits',
    audience: 'Audience',
    tips: 'Tips',
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

  // Fetch for InsightsEngine and ExportTools (existing functionality)
  const { data: advancedData } = useAdvancedAnalytics(
    businessId,
    dateRange ? { startDate: dateRange.from || subDays(new Date(), 30), endDate: dateRange.to || new Date() } : undefined
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="boost">{t.boostBenefits}</TabsTrigger>
          <TabsTrigger value="audience">{t.audience}</TabsTrigger>
          <TabsTrigger value="tips">{t.tips}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="boost">
          <BoostBenefitsTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="audience">
          <AudienceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
        </TabsContent>

        <TabsContent value="tips" className="space-y-6">
          <TimingInsights businessId={businessId} language={language} />
          {advancedData && <InsightsEngine data={advancedData} language={language} />}
          {advancedData && <ExportTools data={advancedData} language={language} businessId={businessId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
