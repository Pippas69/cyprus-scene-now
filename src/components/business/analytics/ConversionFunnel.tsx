import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Heart, UserCheck, CalendarCheck, TrendingDown } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';

interface ConversionFunnelProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Χωνί Μετατροπών',
    description: 'Πώς οι χρήστες κινούνται μέσα από το περιεχόμενό σας',
    views: 'Προβολές',
    engagements: 'Αλληλεπιδράσεις',
    interested: 'Ενδιαφέρον',
    committed: 'Δεσμεύσεις',
    dropOff: 'Απώλεια',
    conversion: 'Μετατροπή',
    viewsDesc: 'Συνολικές προβολές εκδηλώσεων',
    engagementsDesc: 'Χρήστες που αλληλεπίδρασαν',
    interestedDesc: 'RSVPs με ενδιαφέρον',
    committedDesc: 'Θα πάνε + Κρατήσεις',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    biggestBottleneck: 'Μεγαλύτερο Εμπόδιο',
    overallConversion: 'Συνολική Μετατροπή',
  },
  en: {
    title: 'Conversion Funnel',
    description: 'How users move through your content',
    views: 'Views',
    engagements: 'Engagements',
    interested: 'Interested',
    committed: 'Committed',
    dropOff: 'Drop-off',
    conversion: 'Conversion',
    viewsDesc: 'Total event views',
    engagementsDesc: 'Users who engaged',
    interestedDesc: 'RSVPs interested',
    committedDesc: 'Going + Reservations',
    noData: 'No data available',
    biggestBottleneck: 'Biggest Bottleneck',
    overallConversion: 'Overall Conversion',
  },
};

export const ConversionFunnel = ({ data, language }: ConversionFunnelProps) => {
  const t = translations[language];

  if (!data.conversionFunnel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const { views, engagements, interested, committed } = data.conversionFunnel;

  const stages = [
    {
      label: t.views,
      description: t.viewsDesc,
      value: views,
      icon: Eye,
      color: 'hsl(var(--primary))',
    },
    {
      label: t.engagements,
      description: t.engagementsDesc,
      value: engagements,
      icon: Heart,
      color: 'hsl(var(--chart-2))',
    },
    {
      label: t.interested,
      description: t.interestedDesc,
      value: interested,
      icon: UserCheck,
      color: 'hsl(var(--chart-3))',
    },
    {
      label: t.committed,
      description: t.committedDesc,
      value: committed,
      icon: CalendarCheck,
      color: 'hsl(var(--chart-4))',
    },
  ];

  const dropoffs = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const current = stages[i].value;
    const next = stages[i + 1].value;
    const dropoffRate = current > 0 ? (((current - next) / current) * 100).toFixed(1) : '0';
    dropoffs.push({
      from: stages[i].label,
      to: stages[i + 1].label,
      rate: dropoffRate,
    });
  }

  const biggestDropoff = [...dropoffs].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))[0];
  const overallConversion = views > 0 ? ((committed / views) * 100).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              {t.biggestBottleneck}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {biggestDropoff?.from} → {biggestDropoff?.to}
            </p>
            <Badge variant="destructive" className="mt-2">
              {biggestDropoff?.rate}% {t.dropOff}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.overallConversion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{overallConversion}%</p>
            <p className="text-muted-foreground text-sm mt-2">
              {committed} {t.committed} / {views} {t.views}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stages.map((stage, index) => {
              const percentage = views > 0 ? ((stage.value / views) * 100).toFixed(1) : '0';
              const width = `${percentage}%`;
              const prevStage = index > 0 ? stages[index - 1] : null;
              const dropoffRate = prevStage && prevStage.value > 0
                ? (((prevStage.value - stage.value) / prevStage.value) * 100).toFixed(1)
                : '0';

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {React.createElement(stage.icon, { 
                        className: "h-5 w-5",
                        style: { color: stage.color }
                      })}
                      <div>
                        <p className="font-semibold">{stage.label}</p>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stage.value.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{percentage}%</p>
                    </div>
                  </div>
                  
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>

                  {index < stages.length - 1 && (
                    <div className="flex items-center justify-center py-2">
                      <Badge variant="outline" className="text-xs">
                        -{dropoffRate}% {t.dropOff}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.conversion} {t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Stage</th>
                  <th className="text-right py-3 px-4">Count</th>
                  <th className="text-right py-3 px-4">% of Views</th>
                  <th className="text-right py-3 px-4">% of Previous</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage, index) => {
                  const percentOfViews = views > 0 ? ((stage.value / views) * 100).toFixed(1) : '0';
                  const prevStage = index > 0 ? stages[index - 1] : null;
                  const percentOfPrev = prevStage && prevStage.value > 0
                    ? ((stage.value / prevStage.value) * 100).toFixed(1)
                    : '100';

                  return (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        {React.createElement(stage.icon, { className: "h-4 w-4" })}
                        {stage.label}
                      </td>
                      <td className="text-right py-3 px-4">{stage.value.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{percentOfViews}%</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={parseFloat(percentOfPrev) < 50 ? 'destructive' : 'secondary'}>
                          {percentOfPrev}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
