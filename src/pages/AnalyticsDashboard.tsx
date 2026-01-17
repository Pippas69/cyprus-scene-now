import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { DateRangePicker } from '@/components/business/analytics/DateRangePicker';
import { OverviewTab } from '@/components/business/analytics/OverviewTab';
import { PerformanceTab } from '@/components/business/analytics/PerformanceTab';
import { BoostValueTab } from '@/components/business/analytics/BoostValueTab';
import { GuidanceTab } from '@/components/business/analytics/GuidanceTab';
import { LockedSection } from '@/components/business/analytics/LockedSection';
import { useSubscriptionPlan, hasAccessToSection, getSectionRequiredPlan } from '@/hooks/useSubscriptionPlan';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Lock, Zap, Star, Crown } from 'lucide-react';

const translations = {
  el: {
    title: 'Τα Αναλυτικά σου',
    overview: 'Επισκόπηση',
    performance: 'Απόδοση',
    boostValue: 'Αξία Προώθησης',
    guidance: 'Καθοδήγηση',
    basicPlan: 'Basic',
    proPlan: 'Pro',
    elitePlan: 'Elite',
  },
  en: {
    title: 'Your Analytics',
    overview: 'Overview',
    performance: 'Performance',
    boostValue: 'Boost Value',
    guidance: 'Guidance',
    basicPlan: 'Basic',
    proPlan: 'Pro',
    elitePlan: 'Elite',
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

  // Get current subscription plan
  const { data: subscriptionData } = useSubscriptionPlan(businessId);
  const currentPlan = subscriptionData?.plan || 'free';

  const convertedDateRange = dateRange?.from && dateRange?.to 
    ? { from: dateRange.from, to: dateRange.to }
    : undefined;

  // Check access for each tab
  const hasOverviewAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('overview'));
  const hasPerformanceAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('performance'));
  const hasBoostValueAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('boostValue'));
  const hasGuidanceAccess = hasAccessToSection(currentPlan, getSectionRequiredPlan('guidance'));

  // Render tab trigger with lock icon if not accessible
  const renderTabTrigger = (value: string, label: string, hasAccess: boolean) => (
    <TabsTrigger 
      value={value} 
      className={`relative ${!hasAccess ? 'text-muted-foreground/60' : ''}`}
      disabled={!hasAccess}
    >
      {!hasAccess && (
        <Lock className="w-3 h-3 mr-1.5 opacity-60" />
      )}
      {label}
    </TabsTrigger>
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
      </div>

      {/* Plan Badges Row - Above Tabs */}
      <div className="grid w-full grid-cols-4 gap-1 text-center">
        {/* Overview - no badge */}
        <div />
        {/* Performance = Basic */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <Zap className="h-3 w-3" />
            {t.basicPlan}
          </span>
        </div>
        {/* Boost Value = Pro */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-gradient-to-r from-primary/10 to-sunset-coral/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Star className="h-3 w-3" />
            {t.proPlan}
          </span>
        </div>
        {/* Guidance = Elite */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-600 dark:text-purple-400">
            <Crown className="h-3 w-3" />
            {t.elitePlan}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {renderTabTrigger('overview', t.overview, hasOverviewAccess)}
          {renderTabTrigger('performance', t.performance, hasPerformanceAccess)}
          {renderTabTrigger('boostValue', t.boostValue, hasBoostValueAccess)}
          {renderTabTrigger('guidance', t.guidance, hasGuidanceAccess)}
        </TabsList>

        <TabsContent value="overview">
          {hasOverviewAccess ? (
            <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('overview')} language={language}>
              <OverviewTab businessId={businessId} dateRange={convertedDateRange} language={language} />
            </LockedSection>
          )}
        </TabsContent>

        <TabsContent value="performance">
          {hasPerformanceAccess ? (
            <PerformanceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('performance')} language={language}>
              <PerformanceTab businessId={businessId} dateRange={convertedDateRange} language={language} />
            </LockedSection>
          )}
        </TabsContent>

        <TabsContent value="boostValue">
          {hasBoostValueAccess ? (
            <BoostValueTab businessId={businessId} dateRange={convertedDateRange} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('boostValue')} language={language}>
              <BoostValueTab businessId={businessId} dateRange={convertedDateRange} language={language} />
            </LockedSection>
          )}
        </TabsContent>

        <TabsContent value="guidance">
          {hasGuidanceAccess ? (
            <GuidanceTab businessId={businessId} language={language} />
          ) : (
            <LockedSection requiredPlan={getSectionRequiredPlan('guidance')} language={language}>
              <GuidanceTab businessId={businessId} language={language} />
            </LockedSection>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
