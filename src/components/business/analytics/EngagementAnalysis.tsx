import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Heart, Share2, Eye, Phone, Globe, Star, Users } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';

interface EngagementAnalysisProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Ανάλυση Αλληλεπίδρασης',
    description: 'Πώς οι χρήστες αλληλεπιδρούν με το περιεχόμενό σας',
    engagementTypes: 'Τύποι Αλληλεπίδρασης',
    totalEngagements: 'Συνολικές Αλληλεπιδράσεις',
    uniqueUsers: 'Μοναδικοί Χρήστες',
    avgPerUser: 'Μέσος Όρος ανά Χρήστη',
    type: 'Τύπος',
    count: 'Αριθμός',
    percentage: 'Ποσοστό',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    share: 'Κοινοποιήσεις',
    profile_view: 'Προβολές Προφίλ',
    phone_click: 'Κλικ Τηλεφώνου',
    website_click: 'Κλικ Ιστοσελίδας',
    favorite: 'Αγαπημένα',
    unfavorite: 'Αφαίρεση Αγαπημένων',
  },
  en: {
    title: 'Engagement Analysis',
    description: 'How users interact with your content',
    engagementTypes: 'Engagement Types',
    totalEngagements: 'Total Engagements',
    uniqueUsers: 'Unique Users',
    avgPerUser: 'Average per User',
    type: 'Type',
    count: 'Count',
    percentage: 'Percentage',
    noData: 'No data available',
    share: 'Shares',
    profile_view: 'Profile Views',
    phone_click: 'Phone Clicks',
    website_click: 'Website Clicks',
    favorite: 'Favorites',
    unfavorite: 'Unfavorites',
  },
};

const engagementIcons: Record<string, any> = {
  share: Share2,
  profile_view: Eye,
  phone_click: Phone,
  website_click: Globe,
  favorite: Heart,
  unfavorite: Heart,
};

const engagementLabels: Record<string, { el: string; en: string }> = {
  share: { el: 'Κοινοποιήσεις', en: 'Shares' },
  profile_view: { el: 'Προβολές Προφίλ', en: 'Profile Views' },
  phone_click: { el: 'Κλικ Τηλεφώνου', en: 'Phone Clicks' },
  website_click: { el: 'Κλικ Ιστοσελίδας', en: 'Website Clicks' },
  favorite: { el: 'Αγαπημένα', en: 'Favorites' },
  unfavorite: { el: 'Αφαίρεση Αγαπημένων', en: 'Unfavorites' },
};

export const EngagementAnalysis = ({ data, language }: EngagementAnalysisProps) => {
  const t = translations[language];

  if (!data.engagementAnalysis || Object.keys(data.engagementAnalysis.byType).length === 0) {
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

  const { byType, avgActionsPerUser, totalUniqueUsers } = data.engagementAnalysis;

  const totalEngagements = Object.values(byType).reduce((sum, count) => sum + count, 0);

  const engagementData = Object.entries(byType).map(([type, count]) => ({
    type,
    name: engagementLabels[type]?.[language] || type,
    count,
    percentage: ((count / totalEngagements) * 100).toFixed(1),
    icon: engagementIcons[type] || Star,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.totalEngagements}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalEngagements.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.uniqueUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUniqueUsers.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.avgPerUser}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgActionsPerUser.toFixed(2)}</p>
            <Badge variant="secondary" className="mt-2">
              {avgActionsPerUser > 2 ? '🎉 Excellent!' : avgActionsPerUser > 1 ? '✅ Good' : '📈 Room to grow'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.engagementTypes}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={engagementData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--foreground))" />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" width={150} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--primary))" name={t.count} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.engagementTypes}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {engagementData.map((engagement, index) => {
              const Icon = engagement.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{engagement.name}</p>
                      <p className="text-sm text-muted-foreground">{engagement.count} actions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {engagement.percentage}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.engagementTypes}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">{t.type}</th>
                  <th className="text-right py-3 px-4">{t.count}</th>
                  <th className="text-right py-3 px-4">{t.percentage}</th>
                </tr>
              </thead>
              <tbody>
                {engagementData.map((engagement, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      {React.createElement(engagement.icon, { className: "h-4 w-4" })}
                      {engagement.name}
                    </td>
                    <td className="text-right py-3 px-4">{engagement.count}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant="secondary">{engagement.percentage}%</Badge>
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
