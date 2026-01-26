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

  const badgeByTab: Record<
    string,
    { label: string; Icon: React.ElementType; className: string } | undefined
  > = {
    performance: {
      label: t.basicPlan,
      Icon: Zap,
      className:
        "border-blue-400/40 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400",
    },
    boostValue: {
      label: t.proPlan,
      Icon: Star,
      className:
        "border-primary/40 bg-gradient-to-r from-primary/10 to-sunset-coral/10 text-primary",
    },
    guidance: {
      label: t.elitePlan,
      Icon: Crown,
      className:
        "border-purple-400/40 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400",
    },
  };

  // Render tab trigger with lock icon if not accessible
  const renderTabTrigger = (value: string, label: string, hasAccess: boolean) => {
    const badge = badgeByTab[value];
    const BadgeIcon = badge?.Icon;

    return (
    <TabsTrigger 
      value={value} 
      className={`relative pt-1 ${!hasAccess ? 'text-muted-foreground/60' : ''}`}
      disabled={!hasAccess}
    >
      {badge && BadgeIcon && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 sm:px-2 py-px text-[6px] sm:text-[8px] font-semibold shadow-sm ${badge.className}`}
          >
            <BadgeIcon className="h-1.5 w-1.5 sm:h-2 sm:w-2" />
            {badge.label}
          </span>
        </span>
      )}
      <span className="flex items-center gap-1">
        {!hasAccess && (
          <Lock className="w-3 h-3 opacity-60" />
        )}
        {label}
      </span>
    </TabsTrigger>
    );
  };

  return (
    <div className="px-3 sm:px-4 lg:container lg:mx-auto py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
      {/* Header - stacked on mobile, row on tablet+ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t.title}</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} language={language} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible pt-2">
          <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-4 min-w-max sm:min-w-0 gap-1 sm:gap-0 overflow-visible">
            {renderTabTrigger('overview', t.overview, hasOverviewAccess)}
            {renderTabTrigger('performance', t.performance, hasPerformanceAccess)}
            {renderTabTrigger('boostValue', t.boostValue, hasBoostValueAccess)}
            {renderTabTrigger('guidance', t.guidance, hasGuidanceAccess)}
          </TabsList>
        </div>

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
