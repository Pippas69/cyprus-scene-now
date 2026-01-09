import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudienceMetrics } from "@/hooks/useAudienceMetrics";
import { Users, Calendar, MapPin } from "lucide-react";

const translations = {
  el: {
    title: "Το Κοινό σου",
    subtitle: "Κατανόησε ποιοι είναι οι πελάτες σου.",
    genderTitle: "Φύλο",
    ageTitle: "Ηλικία",
    regionTitle: "Περιοχή",
    male: "Άνδρας",
    female: "Γυναίκα",
    other: "Άλλο",
    noData: "Δεν υπάρχουν αρκετά δεδομένα",
  },
  en: {
    title: "Your Audience",
    subtitle: "Understand who your customers are.",
    genderTitle: "Gender",
    ageTitle: "Age",
    regionTitle: "Region",
    male: "Male",
    female: "Female",
    other: "Other",
    noData: "Not enough data available",
  },
};

interface AudienceTabProps {
  businessId: string;
  dateRange?: { from: Date; to: Date };
  language: "el" | "en";
}

interface MetricItemProps {
  label: string;
  value: number;
  total: number;
}

const MetricItem = ({ label, value, total }: MetricItemProps) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
      </div>
    </div>
  );
};

export const AudienceTab = ({ businessId, dateRange, language }: AudienceTabProps) => {
  const { data, isLoading } = useAudienceMetrics(businessId, dateRange);
  const t = translations[language];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const genderTotal = (data?.gender.male || 0) + (data?.gender.female || 0) + (data?.gender.other || 0);
  const ageTotal = Object.values(data?.age || {}).reduce((sum, val) => sum + val, 0);
  const regionEntries = Object.entries(data?.region || {}).sort(([, a], [, b]) => b - a);
  const regionTotal = regionEntries.reduce((sum, [, val]) => sum + val, 0);

  const hasData = genderTotal > 0 || ageTotal > 0 || regionTotal > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.noData}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Gender */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t.genderTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <MetricItem label={t.male} value={data?.gender.male || 0} total={genderTotal} />
            <MetricItem label={t.female} value={data?.gender.female || 0} total={genderTotal} />
            <MetricItem label={t.other} value={data?.gender.other || 0} total={genderTotal} />
          </CardContent>
        </Card>

        {/* Age */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t.ageTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {Object.entries(data?.age || {}).map(([range, count]) => (
              <MetricItem key={range} label={range} value={count} total={ageTotal} />
            ))}
          </CardContent>
        </Card>

        {/* Region */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t.regionTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {regionEntries.slice(0, 5).map(([city, count]) => (
              <MetricItem key={city} label={city} value={count} total={regionTotal} />
            ))}
            {regionEntries.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">{t.noData}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
