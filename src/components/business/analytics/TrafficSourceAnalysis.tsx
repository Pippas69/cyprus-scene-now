import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';

interface TrafficSourceAnalysisProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Ανάλυση Πηγών Επισκεπτών',
    description: 'Πού προέρχονται οι προβολές σας',
    source: 'Πηγή',
    views: 'Προβολές',
    uniqueUsers: 'Μοναδικοί Χρήστες',
    conversions: 'Μετατροπές',
    conversionRate: 'Ποσοστό Μετατροπής',
    topSource: 'Κορυφαία Πηγή',
    sourceBreakdown: 'Κατανομή Πηγών',
    performance: 'Απόδοση ανά Πηγή',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    feed: 'Ροή',
    map: 'Χάρτης',
    search: 'Αναζήτηση',
    direct: 'Άμεσα',
    profile: 'Προφίλ',
  },
  en: {
    title: 'Traffic Source Analysis',
    description: 'Where your views are coming from',
    source: 'Source',
    views: 'Views',
    uniqueUsers: 'Unique Users',
    conversions: 'Conversions',
    conversionRate: 'Conversion Rate',
    topSource: 'Top Source',
    sourceBreakdown: 'Source Breakdown',
    performance: 'Performance by Source',
    noData: 'No data available',
    feed: 'Feed',
    map: 'Map',
    search: 'Search',
    direct: 'Direct',
    profile: 'Profile',
  },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const sourceLabels: Record<string, { el: string; en: string }> = {
  feed: { el: 'Ροή', en: 'Feed' },
  map: { el: 'Χάρτης', en: 'Map' },
  search: { el: 'Αναζήτηση', en: 'Search' },
  direct: { el: 'Άμεσα', en: 'Direct' },
  profile: { el: 'Προφίλ', en: 'Profile' },
};

export const TrafficSourceAnalysis = ({ data, language }: TrafficSourceAnalysisProps) => {
  const t = translations[language];

  if (!data.trafficSources || data.trafficSources.length === 0) {
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

  const sourceData = data.trafficSources.map(source => ({
    ...source,
    name: sourceLabels[source.source]?.[language] || source.source,
    conversionRate: source.views > 0 ? ((source.conversions / source.views) * 100).toFixed(1) : '0',
  }));

  const topSource = [...sourceData].sort((a, b) => b.views - a.views)[0];
  const totalViews = sourceData.reduce((sum, s) => sum + s.views, 0);

  const pieData = sourceData.map(source => ({
    name: source.name,
    value: source.views,
    percentage: ((source.views / totalViews) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t.topSource}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{topSource.name}</p>
              <p className="text-muted-foreground">
                {topSource.views} {t.views} ({((topSource.views / totalViews) * 100).toFixed(0)}%)
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {topSource.conversionRate}% {t.conversionRate}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.sourceBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.performance}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Legend />
                <Bar dataKey="views" fill="hsl(var(--primary))" name={t.views} />
                <Bar dataKey="conversions" fill="hsl(var(--chart-2))" name={t.conversions} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.performance}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">{t.source}</th>
                  <th className="text-right py-3 px-4">{t.views}</th>
                  <th className="text-right py-3 px-4">{t.uniqueUsers}</th>
                  <th className="text-right py-3 px-4">{t.conversions}</th>
                  <th className="text-right py-3 px-4">{t.conversionRate}</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((source, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{source.name}</td>
                    <td className="text-right py-3 px-4">{source.views}</td>
                    <td className="text-right py-3 px-4">{source.unique_users}</td>
                    <td className="text-right py-3 px-4">{source.conversions}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={parseFloat(source.conversionRate) > 5 ? 'default' : 'secondary'}>
                        {source.conversionRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
