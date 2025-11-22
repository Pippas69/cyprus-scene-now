import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, UserPlus, UserMinus, Users } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface FollowerGrowthProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Ανάλυση Ανάπτυξης Ακολούθων',
    description: 'Πώς αναπτύσσεται το κοινό σας',
    timeline: 'Χρονοδιάγραμμα Ανάπτυξης',
    sourceAttribution: 'Πηγή Ακολούθων',
    newFollowers: 'Νέοι Ακόλουθοι',
    unfollows: 'Διακοπές Παρακολούθησης',
    netGrowth: 'Καθαρή Ανάπτυξη',
    churnRate: 'Ποσοστό Εγκατάλειψης',
    totalFollowers: 'Σύνολο Ακολούθων',
    source: 'Πηγή',
    followers: 'Ακόλουθοι',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    date: 'Ημερομηνία',
    growthTrend: 'Τάση Ανάπτυξης',
    feed: 'Ροή',
    map: 'Χάρτης',
    search: 'Αναζήτηση',
    direct: 'Άμεσα',
    profile: 'Προφίλ',
    event: 'Εκδήλωση',
  },
  en: {
    title: 'Follower Growth Analytics',
    description: 'How your audience is growing',
    timeline: 'Growth Timeline',
    sourceAttribution: 'Follower Sources',
    newFollowers: 'New Followers',
    unfollows: 'Unfollows',
    netGrowth: 'Net Growth',
    churnRate: 'Churn Rate',
    totalFollowers: 'Total Followers',
    source: 'Source',
    followers: 'Followers',
    noData: 'No data available',
    date: 'Date',
    growthTrend: 'Growth Trend',
    feed: 'Feed',
    map: 'Map',
    search: 'Search',
    direct: 'Direct',
    profile: 'Profile',
    event: 'Event',
  },
};

const sourceLabels: Record<string, { el: string; en: string }> = {
  feed: { el: 'Ροή', en: 'Feed' },
  map: { el: 'Χάρτης', en: 'Map' },
  search: { el: 'Αναζήτηση', en: 'Search' },
  direct: { el: 'Άμεσα', en: 'Direct' },
  profile: { el: 'Προφίλ', en: 'Profile' },
  event: { el: 'Εκδήλωση', en: 'Event' },
};

export const FollowerGrowth = ({ data, language }: FollowerGrowthProps) => {
  const t = translations[language];

  if (!data.followerGrowthDetailed || data.followerGrowthDetailed.timeline.length === 0) {
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

  const { timeline, churnRate, bySource, netGrowth } = data.followerGrowthDetailed;

  let cumulativeFollowers = 0;
  const timelineData = timeline.map(item => {
    cumulativeFollowers += item.new_followers - item.unfollows;
    return {
      date: format(new Date(item.date), 'MMM dd'),
      new_followers: item.new_followers,
      unfollows: item.unfollows,
      net: item.new_followers - item.unfollows,
      cumulative: cumulativeFollowers,
    };
  });

  const sourceData = Object.entries(bySource).map(([source, count]) => ({
    source,
    name: sourceLabels[source]?.[language] || source,
    count: count as number,
  })).sort((a, b) => b.count - a.count);

  const totalNewFollowers = timeline.reduce((sum, item) => sum + item.new_followers, 0);
  const totalUnfollows = timeline.reduce((sum, item) => sum + item.unfollows, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              {t.newFollowers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalNewFollowers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-destructive" />
              {t.unfollows}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUnfollows}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              {t.netGrowth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{netGrowth >= 0 ? '+' : ''}{netGrowth}</p>
            <Badge variant={netGrowth > 0 ? 'default' : 'destructive'} className="mt-2">
              {netGrowth > 0 ? '📈 Growing' : '📉 Declining'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.churnRate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{churnRate.toFixed(1)}%</p>
            <Badge variant={churnRate < 10 ? 'default' : churnRate < 20 ? 'secondary' : 'destructive'} className="mt-2">
              {churnRate < 10 ? '✅ Excellent' : churnRate < 20 ? '⚠️ Moderate' : '🚨 High'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.growthTrend}</CardTitle>
          <CardDescription>{t.timeline}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name={t.totalFollowers}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="new_followers" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name={t.newFollowers}
              />
              <Line 
                type="monotone" 
                dataKey="unfollows" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name={t.unfollows}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.sourceAttribution}</CardTitle>
          <CardDescription>{t.source}</CardDescription>
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
              <Bar dataKey="count" fill="hsl(var(--primary))" name={t.followers} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
