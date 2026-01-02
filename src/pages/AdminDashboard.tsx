import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminStats } from '@/hooks/useAdminStats';
import { MetricCard } from '@/components/admin/MetricCard';
import { ActivityFeedItem } from '@/components/admin/ActivityFeedItem';
import { 
  Users, Building2, Calendar, Tag, CheckCircle, Flag, UserPlus, MapPin,
  TrendingUp, AlertCircle, Clock, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export const AdminDashboard = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const { data: stats, isLoading } = useAdminStats();

  // Fetch recent activity
  const { data: recentBusinesses } = useQuery({
    queryKey: ['recent-businesses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, created_at, verified')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentEvents } = useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch user signups for sparkline (last 14 days)
  const { data: userSparkline } = useQuery({
    queryKey: ['user-sparkline'],
    queryFn: async () => {
      const days = 14;
      const counts: number[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const nextDate = subDays(new Date(), i - 1);
        
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', format(date, 'yyyy-MM-dd'))
          .lt('created_at', format(nextDate, 'yyyy-MM-dd'));
        
        counts.push(count || 0);
      }
      
      return counts;
    },
  });

  // Fetch event creation sparkline
  const { data: eventSparkline } = useQuery({
    queryKey: ['event-sparkline'],
    queryFn: async () => {
      const days = 14;
      const counts: number[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const nextDate = subDays(new Date(), i - 1);
        
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', format(date, 'yyyy-MM-dd'))
          .lt('created_at', format(nextDate, 'yyyy-MM-dd'));
        
        counts.push(count || 0);
      }
      
      return counts;
    },
  });

  // Calculate platform health score
  const healthScore = stats ? Math.min(100, Math.round(
    ((stats.totalUsers > 0 ? 25 : 0) +
    (stats.totalBusinesses > 0 ? 25 : 0) +
    (stats.activeEvents > 0 ? 25 : 0) +
    ((stats.pendingVerifications || 0) < 10 ? 25 : 10))
  )) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Platform Health */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.welcome}</p>
        </div>
        <Card className="sm:w-auto">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              healthScore >= 75 ? 'bg-green-500/10' : healthScore >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
            }`}>
              <Activity className={`h-5 w-5 ${
                healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform Health</p>
              <p className={`text-lg font-bold ${
                healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>{healthScore}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid with Sparklines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t.dashboard.metrics.totalUsers}
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={stats?.userGrowth}
          trendLabel={t.dashboard.metrics.growth}
          sparklineData={userSparkline}
          color="blue"
        />
        <MetricCard
          title={t.dashboard.metrics.totalBusinesses}
          value={stats?.totalBusinesses || 0}
          icon={Building2}
          color="purple"
        />
        <MetricCard
          title={t.dashboard.metrics.activeEvents}
          value={stats?.activeEvents || 0}
          icon={Calendar}
          sparklineData={eventSparkline}
          color="green"
        />
        <MetricCard
          title={t.dashboard.metrics.activeOffers}
          value={stats?.activeOffers || 0}
          icon={Tag}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions - Redesigned */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t.dashboard.quickActions.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/verification" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.pendingVerifications}
                  </span>
                </div>
                {(stats?.pendingVerifications || 0) > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {stats?.pendingVerifications}
                  </Badge>
                )}
              </div>
            </Link>
            
            <Link to="/admin/reports" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Flag className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.unreviewedReports}
                  </span>
                </div>
                {(stats?.unreviewedReports || 0) > 0 && (
                  <Badge variant="destructive">{stats?.unreviewedReports}</Badge>
                )}
              </div>
            </Link>
            
            <Link to="/admin/users" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.recentSignups}
                  </span>
                </div>
              </div>
            </Link>
            
            <Link to="/admin/geocoding" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.needsGeocoding}
                  </span>
                </div>
                {(stats?.needsGeocoding || 0) > 0 && (
                  <Badge variant="secondary">{stats?.needsGeocoding}</Badge>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity - Enhanced */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t.dashboard.activity.title}
                </CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </div>
              <Link to="/admin/analytics">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentBusinesses?.slice(0, 3).map((business) => (
                <ActivityFeedItem
                  key={business.id}
                  icon={Building2}
                  message={`${t.dashboard.activity.newBusiness}: ${business.name}`}
                  timestamp={business.created_at}
                  iconColor="purple"
                  badge={business.verified ? undefined : { text: 'Pending', variant: 'secondary' as const }}
                />
              ))}
              {recentEvents?.slice(0, 3).map((event) => (
                <ActivityFeedItem
                  key={event.id}
                  icon={Calendar}
                  message={`${t.dashboard.activity.newEvent}: ${event.title}`}
                  timestamp={event.created_at}
                  iconColor="green"
                />
              ))}
              {(!recentBusinesses?.length && !recentEvents?.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;