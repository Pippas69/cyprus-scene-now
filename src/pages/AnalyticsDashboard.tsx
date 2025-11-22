import { useState, useEffect } from 'react';
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

interface AnalyticsDashboardProps {
  businessId: string;
}

export default function AnalyticsDashboard({ businessId }: AnalyticsDashboardProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [isSeeding, setIsSeeding] = useState(false);
  const [showDetailedData, setShowDetailedData] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data, isLoading, refetch, isRefetching } = useAdvancedAnalytics(
    businessId,
    dateRange
      ? {
          startDate: dateRange.from || subDays(new Date(), 30),
          endDate: dateRange.to || new Date(),
        }
      : undefined
  );

  // Progressive loading: show overview first, then detailed data
  useEffect(() => {
    if (data && !showDetailedData && !isLoading) {
      // Slight delay to show overview before detailed tabs
      const timer = setTimeout(() => setShowDetailedData(true), 300);
      return () => clearTimeout(timer);
    }
  }, [data, showDetailedData, isLoading]);

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
    } catch (error: any) {
      console.error('Error generating test data:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(
        language === 'el' 
          ? `Σφάλμα κατά τη δημιουργία δεδομένων δοκιμής: ${errorMessage}` 
          : `Error generating test data: ${errorMessage}`
      );
    } finally {
      setIsSeeding(false);
    }
  };

  // Show loading skeleton on initial load only
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

  // Check if we have any data at all
  const hasData = data && (
    data.overview.totalImpressions > 0 ||
    data.eventPerformance.length > 0 ||
    data.discountPerformance.length > 0
  );

  const hasEvents = data?.eventPerformance && data.eventPerformance.length > 0;
  const hasViews = data?.overview.totalImpressions > 0;

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
          <TabsTrigger value="events" disabled={!showDetailedData}>{t.events}</TabsTrigger>
          <TabsTrigger value="audience" disabled={!showDetailedData}>{t.audience}</TabsTrigger>
          <TabsTrigger value="timing" disabled={!showDetailedData}>{t.timing}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview data={data} language={language} />
        </TabsContent>

        {showDetailedData && (
          <>
            <TabsContent value="events" className="space-y-6">
              <EventPerformanceTable data={data} language={language} />
            </TabsContent>

            <TabsContent value="audience" className="space-y-6">
              <AudienceInsights data={data} language={language} />
            </TabsContent>

            <TabsContent value="timing" className="space-y-6">
              <TimeAnalytics data={data} language={language} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
