import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoostComparison } from "@/hooks/useBoostComparison";
import { Eye, Heart, MapPin, QrCode, Ticket, TrendingUp, TrendingDown, Minus } from "lucide-react";

const translations = {
  el: {
    profileTitle: "Απόδοση Προφίλ: Χωρίς Boost vs Με Boost",
    profileSubtitle: "Σύγκρινε την απόδοση του προφίλ σου όταν δεν είναι boosted και όταν είναι.",
    offersTitle: "Απόδοση Προσφορών: Χωρίς Boost vs Με Boost",
    offersSubtitle: "Σύγκρινε την απόδοση των προσφορών σου με και χωρίς boost.",
    eventsTitle: "Απόδοση Events: Χωρίς Boost vs Με Boost",
    eventsSubtitle: "Σύγκρινε την απόδοση των events σου με και χωρίς boost.",
    withoutBoost: "Χωρίς Boost",
    withBoost: "Με Boost",
    views: "Προβολές",
    interested: "Ενδιαφερόμενοι",
    toGo: "Θα πάνε",
    visits: "Επισκέψεις",
    ticketsCheckIn: "Εισιτήρια & Check-In",
  },
  en: {
    profileTitle: "Profile Performance: Without Boost vs With Boost",
    profileSubtitle: "Compare your profile's performance when not boosted and when boosted.",
    offersTitle: "Offer Performance: Without Boost vs With Boost",
    offersSubtitle: "Compare the performance of your offers with and without boost.",
    eventsTitle: "Event Performance: Without Boost vs With Boost",
    eventsSubtitle: "Compare the performance of your events with and without boost.",
    withoutBoost: "Without Boost",
    withBoost: "With Boost",
    views: "Views",
    interested: "Interested",
    toGo: "Will Go",
    visits: "Visits",
    ticketsCheckIn: "Tickets & Check-In",
  },
};

interface BoostBenefitsTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: "el" | "en";
}

interface MetricRowProps {
  icon: React.ElementType;
  label: string;
  withoutBoost: number;
  withBoost: number;
}

const MetricRow = ({ icon: Icon, label, withoutBoost, withBoost }: MetricRowProps) => {
  const diff = withBoost - withoutBoost;
  const percentChange = withoutBoost > 0 ? ((diff / withoutBoost) * 100).toFixed(0) : withBoost > 0 ? "+∞" : "0";
  
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="p-2 bg-muted rounded-lg">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-6">
        <span className="text-sm text-muted-foreground w-16 text-right">{withoutBoost}</span>
        <span className="text-sm font-semibold text-primary w-16 text-right">{withBoost}</span>
        <div className="flex items-center gap-1 w-20 justify-end">
          {diff > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">+{percentChange}%</span>
            </>
          ) : diff < 0 ? (
            <>
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span className="text-xs text-destructive">{percentChange}%</span>
            </>
          ) : (
            <>
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">0%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ComparisonSectionProps {
  title: string;
  subtitle: string;
  withoutBoostLabel: string;
  withBoostLabel: string;
  metrics: Array<{
    icon: React.ElementType;
    label: string;
    withoutBoost: number;
    withBoost: number;
  }>;
}

const ComparisonSection = ({ title, subtitle, withoutBoostLabel, withBoostLabel, metrics }: ComparisonSectionProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-4 py-2 mb-2 border-b border-border">
        <div className="w-10" />
        <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Metric</span>
        <span className="text-xs font-medium text-muted-foreground w-16 text-right">{withoutBoostLabel}</span>
        <span className="text-xs font-medium text-primary w-16 text-right">{withBoostLabel}</span>
        <span className="text-xs font-medium text-muted-foreground w-20 text-right">Change</span>
      </div>
      {metrics.map((metric, i) => (
        <MetricRow key={i} {...metric} />
      ))}
    </CardContent>
  </Card>
);

export const BoostBenefitsTab = ({ businessId, dateRange, language }: BoostBenefitsTabProps) => {
  const { data, isLoading } = useBoostComparison(businessId, dateRange);
  const t = translations[language];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const profileMetrics = [
    { icon: Eye, label: t.views, withoutBoost: data.profile.withoutBoost.views, withBoost: data.profile.withBoost.views },
    { icon: Heart, label: t.interested, withoutBoost: data.profile.withoutBoost.interested, withBoost: data.profile.withBoost.interested },
    { icon: MapPin, label: t.toGo, withoutBoost: data.profile.withoutBoost.toGo, withBoost: data.profile.withBoost.toGo },
    { icon: QrCode, label: t.visits, withoutBoost: data.profile.withoutBoost.visits, withBoost: data.profile.withBoost.visits },
  ];

  const offerMetrics = [
    { icon: Eye, label: t.views, withoutBoost: data.offers.withoutBoost.views, withBoost: data.offers.withBoost.views },
    { icon: Heart, label: t.interested, withoutBoost: data.offers.withoutBoost.interested, withBoost: data.offers.withBoost.interested },
    { icon: MapPin, label: t.toGo, withoutBoost: data.offers.withoutBoost.toGo, withBoost: data.offers.withBoost.toGo },
    { icon: QrCode, label: t.visits, withoutBoost: data.offers.withoutBoost.visits, withBoost: data.offers.withBoost.visits },
  ];

  const eventMetrics = [
    { icon: Eye, label: t.views, withoutBoost: data.events.withoutBoost.views, withBoost: data.events.withBoost.views },
    { icon: Heart, label: t.interested, withoutBoost: data.events.withoutBoost.interested, withBoost: data.events.withBoost.interested },
    { icon: MapPin, label: t.toGo, withoutBoost: data.events.withoutBoost.toGo, withBoost: data.events.withBoost.toGo },
    { icon: QrCode, label: t.visits, withoutBoost: data.events.withoutBoost.visits, withBoost: data.events.withBoost.visits },
    { icon: Ticket, label: t.ticketsCheckIn, withoutBoost: data.events.withoutBoost.ticketsAndCheckIn, withBoost: data.events.withBoost.ticketsAndCheckIn },
  ];

  return (
    <div className="space-y-6">
      <ComparisonSection
        title={t.profileTitle}
        subtitle={t.profileSubtitle}
        withoutBoostLabel={t.withoutBoost}
        withBoostLabel={t.withBoost}
        metrics={profileMetrics}
      />
      <ComparisonSection
        title={t.offersTitle}
        subtitle={t.offersSubtitle}
        withoutBoostLabel={t.withoutBoost}
        withBoostLabel={t.withBoost}
        metrics={offerMetrics}
      />
      <ComparisonSection
        title={t.eventsTitle}
        subtitle={t.eventsSubtitle}
        withoutBoostLabel={t.withoutBoost}
        withBoostLabel={t.withBoost}
        metrics={eventMetrics}
      />
    </div>
  );
};
