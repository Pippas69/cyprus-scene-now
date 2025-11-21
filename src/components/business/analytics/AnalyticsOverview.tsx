import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Eye, Users, Heart, Target } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface AnalyticsOverviewProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    totalReach: 'Συνολική Εμβέλεια',
    totalImpressions: 'Συνολικές Προβολές',
    engagementRate: 'Ποσοστό Αλληλεπίδρασης',
    followerGrowth: 'Αύξηση Ακολούθων',
    conversionRate: 'Ποσοστό Μετατροπής',
    uniqueViewers: 'μοναδικοί θεατές',
    totalViews: 'συνολικές προβολές',
    vsLastPeriod: 'σε σχέση με προηγούμενη περίοδο',
  },
  en: {
    totalReach: 'Total Reach',
    totalImpressions: 'Total Impressions',
    engagementRate: 'Engagement Rate',
    followerGrowth: 'Follower Growth',
    conversionRate: 'Conversion Rate',
    uniqueViewers: 'unique viewers',
    totalViews: 'total views',
    vsLastPeriod: 'vs last period',
  },
};

export const AnalyticsOverview = ({ data, language }: AnalyticsOverviewProps) => {
  const t = translations[language];
  const { overview } = data;

  const stats = [
    {
      label: t.totalReach,
      value: overview.totalReach.toLocaleString(),
      subtitle: t.uniqueViewers,
      icon: Eye,
      trend: overview.totalReach > 0 ? 'up' : 'neutral',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t.totalImpressions,
      value: overview.totalImpressions.toLocaleString(),
      subtitle: t.totalViews,
      icon: Target,
      trend: overview.totalImpressions > 0 ? 'up' : 'neutral',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-600/10',
    },
    {
      label: t.engagementRate,
      value: `${overview.engagementRate.toFixed(1)}%`,
      subtitle: t.vsLastPeriod,
      icon: Heart,
      trend: overview.engagementRate > 5 ? 'up' : 'down',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-600/10',
    },
    {
      label: t.followerGrowth,
      value: `${overview.followerGrowth >= 0 ? '+' : ''}${overview.followerGrowth.toFixed(1)}%`,
      subtitle: t.vsLastPeriod,
      icon: Users,
      trend: overview.followerGrowth > 0 ? 'up' : overview.followerGrowth < 0 ? 'down' : 'neutral',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-600/10',
    },
    {
      label: t.conversionRate,
      value: `${overview.conversionRate.toFixed(1)}%`,
      subtitle: 'interested → going',
      icon: TrendingUp,
      trend: overview.conversionRate > 50 ? 'up' : 'down',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-600/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : null;

        return (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {TrendIcon && (
                <TrendIcon
                  className={`h-5 w-5 ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}
                />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {stat.label}
              </p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
