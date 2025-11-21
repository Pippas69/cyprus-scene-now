import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { AnalyticsOverview } from '@/components/business/analytics/AnalyticsOverview';
import { EventPerformanceTable } from '@/components/business/analytics/EventPerformanceTable';
import { AudienceInsights } from '@/components/business/analytics/AudienceInsights';
import { TimeAnalytics } from '@/components/business/analytics/TimeAnalytics';
import { AnalyticsEmptyState } from '@/components/business/analytics/AnalyticsEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  const [isSeeding, setIsSeeding] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data, isLoading, refetch } = useAdvancedAnalytics(
    businessId || null,
    dateRange
      ? {
          startDate: dateRange.from || subDays(new Date(), 30),
          endDate: dateRange.to || new Date(),
        }
      : undefined
  );

  const handleGenerateTestData = async () => {
    setIsSeeding(true);
    try {
      const { error } = await supabase.functions.invoke('seed-analytics');
      
      if (error) throw error;

      toast.success(
        language === 'el' 
          ? 'Τα δεδομένα δοκιμής δημιουργήθηκαν επιτυχώς!' 
          : 'Test data generated successfully!'
      );
      
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error('Error generating test data:', error);
      toast.error(
        language === 'el' 
          ? 'Σφάλμα κατά τη δημιουργία δεδομένων δοκιμής' 
          : 'Error generating test data'
      );
    } finally {
      setIsSeeding(false);
    }
  };

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

  const hasData = data && (
    data.overview.totalReach > 0 ||
    data.overview.totalImpressions > 0 ||
    data.eventPerformance.length > 0 ||
    data.discountPerformance.length > 0
  );

  const hasEvents = data?.eventPerformance && data.eventPerformance.length > 0;
  const hasViews = data?.overview.totalReach > 0;

  if (!data || !hasData) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <Button 
            onClick={handleGenerateTestData} 
            disabled={isSeeding}
            variant="outline"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'el' ? 'Δημιουργία...' : 'Generating...'}
              </>
            ) : (
              language === 'el' ? 'Δημιουργία Δεδομένων Δοκιμής' : 'Generate Test Data'
            )}
          </Button>
        </div>
        <AnalyticsEmptyState 
          language={language} 
          hasEvents={hasEvents}
          hasViews={hasViews}
        />
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
