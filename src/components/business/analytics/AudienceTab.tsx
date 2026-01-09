import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudienceMetrics } from "@/hooks/useAudienceMetrics";
import { Users, Calendar, MapPin, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    tapForDetails: "Πάτα για λεπτομέρειες",
    explanations: {
      gender: "Η κατανομή φύλου βασίζεται στις πληροφορίες προφίλ από πελάτες που έκαναν κρατήσεις ή αγόρασαν εισιτήρια στην επιχείρησή σου.",
      genderDetails: "Μόνο οι πελάτες που έχουν ολοκληρώσει τη ρύθμιση του προφίλ τους περιλαμβάνονται σε αυτά τα στατιστικά.",
      age: "Η ανάλυση ηλικίας υπολογίζεται από τα έτη γέννησης των πελατών στα προφίλ τους.",
      ageDetails: "Περιλαμβάνονται μόνο πελάτες που έχουν καταχωρήσει την ημερομηνία γέννησής τους.",
      region: "Η γεωγραφική κατανομή δείχνει πού βρίσκονται οι πελάτες σου με βάση την πόλη στα προφίλ τους.",
      regionDetails: "Αυτό σε βοηθά να κατανοήσεις την εμβέλεια της επιχείρησής σου και πιθανές ευκαιρίες επέκτασης.",
    },
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
    tapForDetails: "Tap for details",
    explanations: {
      gender: "Gender distribution is based on profile information from customers who made bookings or ticket purchases with your business.",
      genderDetails: "Only customers who have completed their profile setup are included in these statistics.",
      age: "Age breakdown is calculated from customer birth years in their profiles.",
      ageDetails: "Only customers who have entered their date of birth are included.",
      region: "Geographic distribution shows where your customers are located based on the city/town in their profiles.",
      regionDetails: "This helps you understand your business reach and potential expansion opportunities.",
    },
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

interface AudienceCardProps {
  icon: React.ElementType;
  title: string;
  explanation: string;
  details: string;
  children: React.ReactNode;
}

const AudienceCard = ({ icon: Icon, title, explanation, details, children }: AudienceCardProps) => (
  <Dialog>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <DialogTrigger asChild>
            <button className="p-1 hover:bg-muted rounded-full transition-colors">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </DialogTrigger>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
        </div>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">{explanation}</p>
        <p className="text-sm text-muted-foreground">{details}</p>
      </div>
    </DialogContent>
  </Dialog>
);

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
        <AudienceCard
          icon={Users}
          title={t.genderTitle}
          explanation={t.explanations.gender}
          details={t.explanations.genderDetails}
        >
          <MetricItem label={t.male} value={data?.gender.male || 0} total={genderTotal} />
          <MetricItem label={t.female} value={data?.gender.female || 0} total={genderTotal} />
          <MetricItem label={t.other} value={data?.gender.other || 0} total={genderTotal} />
        </AudienceCard>

        {/* Age */}
        <AudienceCard
          icon={Calendar}
          title={t.ageTitle}
          explanation={t.explanations.age}
          details={t.explanations.ageDetails}
        >
          {Object.entries(data?.age || {}).map(([range, count]) => (
            <MetricItem key={range} label={range} value={count} total={ageTotal} />
          ))}
        </AudienceCard>

        {/* Region */}
        <AudienceCard
          icon={MapPin}
          title={t.regionTitle}
          explanation={t.explanations.region}
          details={t.explanations.regionDetails}
        >
          {regionEntries.slice(0, 5).map(([city, count]) => (
            <MetricItem key={city} label={city} value={count} total={regionTotal} />
          ))}
          {regionEntries.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">{t.noData}</p>
          )}
        </AudienceCard>
      </div>
    </div>
  );
};