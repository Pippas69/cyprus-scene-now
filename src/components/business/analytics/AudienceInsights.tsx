import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface AudienceInsightsProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    ageDistribution: 'Κατανομή Ηλικίας',
    cityDistribution: 'Κατανομή ανά Πόλη',
    followerTrend: 'Τάση Ακολούθων',
    followers: 'Ακόλουθοι',
    date: 'Ημερομηνία',
    noData: 'Δεν υπάρχουν δεδομένα',
  },
  en: {
    ageDistribution: 'Age Distribution',
    cityDistribution: 'City Distribution',
    followerTrend: 'Follower Trend',
    followers: 'Followers',
    date: 'Date',
    noData: 'No data available',
  },
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088FE',
];

export const AudienceInsights = ({ data, language }: AudienceInsightsProps) => {
  const t = translations[language];
  
  if (!data?.audienceInsights) {
    return <div className="text-center text-muted-foreground py-8">No audience data available</div>;
  }
  
  const { audienceInsights } = data;

  const ageData = Object.entries(audienceInsights.ageDistribution).map(([age, count]) => ({
    name: age,
    value: count,
  }));

  const cityData = Object.entries(audienceInsights.cityDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({
      name: city,
      value: count,
    }));

  const followerData = audienceInsights.followerTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }),
    followers: item.followers,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Age Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t.ageDistribution}</CardTitle>
        </CardHeader>
        <CardContent>
          {ageData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* City Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t.cityDistribution}</CardTitle>
        </CardHeader>
        <CardContent>
          {cityData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="value"
                >
                  {cityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Follower Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t.followerTrend}</CardTitle>
        </CardHeader>
        <CardContent>
          {followerData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name={t.followers}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
