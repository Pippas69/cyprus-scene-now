import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { OverviewTab } from '@/components/business/analytics/OverviewTab';
import { PerformanceCards } from '@/components/business/analytics/PerformanceCards';
import { AudienceTab } from '@/components/business/analytics/AudienceTab';
import { LockedSection } from '@/components/business/analytics/LockedSection';
import { CrmDashboard } from '@/components/business/crm/CrmDashboard';
import { useSubscriptionPlan, hasAccessToSection, getSectionRequiredPlan } from '@/hooks/useSubscriptionPlan';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Lock, BarChart3, UserSearch } from 'lucide-react';
import { useOverviewMetrics } from '@/hooks/useOverviewMetrics';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useAudienceMetrics } from '@/hooks/useAudienceMetrics';
import { useBoostValueMetrics } from '@/hooks/useBoostValueMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { shouldHideOffers } from '@/lib/shouldHideOffers';

const translations = {
  el: {
    title: 'Insights & CRM',
    overview: 'Επισκόπηση',
    crm: 'CRM',
  },
  en: {
    title: 'Insights & CRM',
    overview: 'Overview',
    crm: 'CRM',
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

  const { data: subscriptionData } = useSubscriptionPlan(businessId);
  const currentPlan = subscriptionData?.plan || 'free';

  const { data: hideOffers } = useQuery({
    queryKey: ['business-hide-offers', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('category')
        .eq('id', businessId)
        .single();
      return shouldHideOffers(data?.category || []);
    },
    staleTime: Infinity,
  });

  const { data: floorPlanData } = useQuery({
    queryKey: ['business-floor-plan', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('floor_plan_enabled')
        .eq('id', businessId)
        .single();
      return data?.floor_plan_enabled || false;
    },
    staleTime: Infinity,
  });

  const convertedDateRange = dateRange?.from && dateRange?.to 
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  // Prefetch data
  useOverviewMetrics(businessId, convertedDateRange);
  usePerformanceMetrics(businessId, convertedDateRange);
  useAudienceMetrics(businessId, convertedDateRange);
  useBoostValueMetrics(businessId, convertedDateRange);

  const hasOverviewAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('overview'));
  const hasPerformanceAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('performance'));
  const hasCrmAccess = currentPlan === 'elite';

  return (
    <div className="px-3 sm:px-4 lg:container lg:mx-auto py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <TabsList className="grid grid-cols-2 w-auto min-w-[200px]">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              {t.overview}
            </TabsTrigger>
            <TabsTrigger
              value="crm"
              className={`gap-1.5 text-xs sm:text-sm ${!hasCrmAccess ? 'text-muted-foreground/60' : ''}`}
              disabled={!hasCrmAccess}
            >
              {!hasCrmAccess && <Lock className="h-3 w-3 opacity-60" />}
              {t.crm}
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto">
            <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
          </div>
        </div>

        {/* Tab 1: Overview (KPIs + Performance Cards + Audience) */}
        <TabsContent value="overview" className="space-y-6 sm:space-y-8">
          {/* KPI Cards */}
          {hasOverviewAccess ? (
            <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('overview')} language={language}>
              <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
            </LockedSection>
          )}

          {/* Performance Cards with Boost Modal */}
          {hasPerformanceAccess ? (
            <PerformanceCards
              businessId={businessId}
              dateRange={convertedDateRange}
              language={language}
              hideOffers={!!hideOffers}
            />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('performance')} language={language}>
              <PerformanceCards
                businessId={businessId}
                dateRange={convertedDateRange}
                language={language}
                hideOffers={!!hideOffers}
              />
            </LockedSection>
          )}

          {/* Audience (Age, Gender, City) */}
          {hasPerformanceAccess ? (
            <AudienceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('performance')} language={language}>
              <AudienceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
            </LockedSection>
          )}
        </TabsContent>

        {/* Tab 2: CRM */}
        <TabsContent value="crm" className="min-h-[500px]">
          {hasCrmAccess ? (
            <CrmDashboard businessId={businessId} floorPlanEnabled={!!floorPlanData} />
          ) : (
            <LockedSection requiredPlan="elite" language={language}>
              <CrmDashboard businessId={businessId} floorPlanEnabled={!!floorPlanData} />
            </LockedSection>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
