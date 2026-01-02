import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminAnalytics } from '@/hooks/useAdminPlatformAnalytics';
import { subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Users,
  Building2,
  CalendarDays,
  CalendarCheck,
  UserPlus,
  Activity,
  TrendingUp,
  MapPin,
  Eye,
  Heart,
} from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
];

export const AdminAnalytics = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  
  const [dateRangeKey, setDateRangeKey] = useState('30');
  
  const dateRange = {
    from: subDays(new Date(), parseInt(dateRangeKey)),
    to: new Date(),
  };

  const {
    userGrowth,
    userGrowthLoading,
    eventsByCategory,
    eventsByCategoryLoading,
    usersByCity,
    usersByCityLoading,
    businessesByCity,
    businessesByCityLoading,
    topBusinesses,
    topBusinessesLoading,
    summaryStats,
    summaryStatsLoading,
  } = useAdminAnalytics(dateRange);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    loading, 
    color = 'text-primary' 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: number | string; 
    loading: boolean;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-primary/10`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.analytics.title}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'el' ? 'Επισκόπηση απόδοσης πλατφόρμας' : 'Platform performance overview'}
          </p>
        </div>
        <Select value={dateRangeKey} onValueChange={setDateRangeKey}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t.analytics.dateRange.last7days}</SelectItem>
            <SelectItem value="30">{t.analytics.dateRange.last30days}</SelectItem>
            <SelectItem value="90">{t.analytics.dateRange.last90days}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Users}
          label={t.analytics.users.total}
          value={summaryStats?.totalUsers || 0}
          loading={summaryStatsLoading}
        />
        <StatCard
          icon={UserPlus}
          label={language === 'el' ? 'Νέοι Χρήστες' : 'New Users'}
          value={summaryStats?.newUsers || 0}
          loading={summaryStatsLoading}
          color="text-green-500"
        />
        <StatCard
          icon={Building2}
          label={t.analytics.business.verified}
          value={summaryStats?.totalBusinesses || 0}
          loading={summaryStatsLoading}
          color="text-blue-500"
        />
        <StatCard
          icon={CalendarDays}
          label={t.analytics.events.total}
          value={summaryStats?.totalEvents || 0}
          loading={summaryStatsLoading}
          color="text-purple-500"
        />
        <StatCard
          icon={CalendarCheck}
          label={language === 'el' ? 'Ενεργά Events' : 'Active Events'}
          value={summaryStats?.activeEvents || 0}
          loading={summaryStatsLoading}
          color="text-orange-500"
        />
        <StatCard
          icon={Activity}
          label={language === 'el' ? 'Συνολικά RSVPs' : 'Total RSVPs'}
          value={summaryStats?.totalRsvps || 0}
          loading={summaryStatsLoading}
          color="text-pink-500"
        />
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {language === 'el' ? 'Ανάπτυξη Χρηστών' : 'User Growth'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userGrowthLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value as string), 'MMM d, yyyy')}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  name={language === 'el' ? 'Συνολικοί Χρήστες' : 'Total Users'}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  name={language === 'el' ? 'Νέοι Χρήστες' : 'New Users'}
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Events by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {t.analytics.events.byCategory}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsByCategoryLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : eventsByCategory.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t.common.noData}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    width={100}
                    className="text-xs"
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Users by City */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t.analytics.users.geoDistribution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersByCityLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : usersByCity.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t.common.noData}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={usersByCity}
                    dataKey="count"
                    nameKey="city"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ city, percent }) => `${city} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {usersByCity.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Businesses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t.analytics.business.mostActive}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topBusinessesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topBusinesses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t.common.noData}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'el' ? 'Επιχείρηση' : 'Business'}</TableHead>
                    <TableHead>{language === 'el' ? 'Πόλη' : 'City'}</TableHead>
                    <TableHead className="text-right">
                      <CalendarDays className="h-4 w-4 inline mr-1" />
                      Events
                    </TableHead>
                    <TableHead className="text-right">
                      <Eye className="h-4 w-4 inline mr-1" />
                      Views
                    </TableHead>
                    <TableHead className="text-right">
                      <Heart className="h-4 w-4 inline mr-1" />
                      Followers
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topBusinesses.map((business, index) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium">
                        <span className="text-muted-foreground mr-2">#{index + 1}</span>
                        {business.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{business.city}</TableCell>
                      <TableCell className="text-right">{business.events_count}</TableCell>
                      <TableCell className="text-right">{business.views_count}</TableCell>
                      <TableCell className="text-right">{business.followers_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
