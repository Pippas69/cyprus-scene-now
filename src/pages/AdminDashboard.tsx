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

  // Fetch user signups for sparkline (last 14 days) - optimized single query
  const { data: userSparkline } = useQuery({
    queryKey: ['user-sparkline'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 14);
      const { data } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', format(startDate, 'yyyy-MM-dd'));
      
      const counts = new Array(14).fill(0);
      data?.forEach(profile => {
        const daysAgo = Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 14) {
          counts[13 - daysAgo]++;
        }
      });
      return counts;
    },
  });

  // Fetch event creation sparkline - optimized single query
  const { data: eventSparkline } = useQuery({
    queryKey: ['event-sparkline'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 14);
      const { data } = await supabase
        .from('events')
        .select('created_at')
        .gte('created_at', format(startDate, 'yyyy-MM-dd'));
      
      const counts = new Array(14).fill(0);
      data?.forEach(event => {
        const daysAgo = Math.floor((new Date().getTime() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 14) {
          counts[13 - daysAgo]++;
        }
      });
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
      {/* Header with Platform Health and Wave Animation */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0D3B66] via-[#3D6B99] to-[#4ECDC4] p-6 text-white">
        {/* Animated wave layers */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute bottom-0 left-0 w-[200%] h-12 opacity-20" viewBox="0 0 1200 30" preserveAspectRatio="none">
            <path 
              className="animate-wave-flow" 
              fill="currentColor" 
              d="M0,15 Q150,5 300,15 T600,15 T900,15 T1200,15 V30 H0 Z"
            />
          </svg>
          <svg className="absolute bottom-0 left-0 w-[200%] h-10 opacity-15" viewBox="0 0 1200 30" preserveAspectRatio="none" style={{ animationDelay: '-2s' }}>
            <path 
              className="animate-wave-flow" 
              fill="currentColor" 
              d="M0,20 Q150,10 300,20 T600,20 T900,20 T1200,20 V30 H0 Z"
              style={{ animationDuration: '10s' }}
            />
          </svg>
          <svg className="absolute bottom-0 left-0 w-[200%] h-8 opacity-10" viewBox="0 0 1200 30" preserveAspectRatio="none" style={{ animationDelay: '-4s' }}>
            <path 
              className="animate-wave-flow" 
              fill="currentColor" 
              d="M0,22 Q150,12 300,22 T600,22 T900,22 T1200,22 V30 H0 Z"
              style={{ animationDuration: '12s' }}
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
            <p className="text-white/80 mt-1">{t.dashboard.welcome}</p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg py-3 px-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              healthScore >= 75 ? 'bg-[#4ECDC4]/30' : healthScore >= 50 ? 'bg-[#7BAAB8]/30' : 'bg-white/20'
            }`}>
              <Activity className={`h-5 w-5 ${
                healthScore >= 75 ? 'text-[#4ECDC4]' : healthScore >= 50 ? 'text-[#7BAAB8]' : 'text-white'
              }`} />
            </div>
            <div>
              <p className="text-xs text-white/70">Platform Health</p>
              <p className={`text-lg font-bold ${
                healthScore >= 75 ? 'text-[#4ECDC4]' : healthScore >= 50 ? 'text-[#7BAAB8]' : 'text-white'
              }`}>{healthScore}%</p>
            </div>
          </div>
        </div>
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
          color="aegean"
        />
        <MetricCard
          title={t.dashboard.metrics.totalBusinesses}
          value={stats?.totalBusinesses || 0}
          icon={Building2}
          color="ocean"
        />
        <MetricCard
          title={t.dashboard.metrics.activeEvents}
          value={stats?.activeEvents || 0}
          icon={Calendar}
          sparklineData={eventSparkline}
          color="seafoam"
        />
        <MetricCard
          title={t.dashboard.metrics.activeOffers}
          value={stats?.activeOffers || 0}
          icon={Tag}
          color="softAegean"
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
                  <div className="h-9 w-9 rounded-lg bg-[#7BAAB8]/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-[#7BAAB8]" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.pendingVerifications}
                  </span>
                </div>
                {(stats?.pendingVerifications || 0) > 0 && (
                  <Badge variant="secondary" className="bg-[#7BAAB8]/10 text-[#0D3B66] dark:text-[#7BAAB8]">
                    {stats?.pendingVerifications}
                  </Badge>
                )}
              </div>
            </Link>
            
            <Link to="/admin/reports" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#1a5f7a]/10 flex items-center justify-center">
                    <Flag className="h-4 w-4 text-[#1a5f7a] dark:text-[#4ECDC4]" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.unreviewedReports}
                  </span>
                </div>
                {(stats?.unreviewedReports || 0) > 0 && (
                  <Badge className="bg-[#1a5f7a] text-white">{stats?.unreviewedReports}</Badge>
                )}
              </div>
            </Link>
            
            <Link to="/admin/users" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#0D3B66]/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-[#0D3B66] dark:text-[#7BAAB8]" />
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
                  <div className="h-9 w-9 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#4ECDC4]" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {t.dashboard.quickActions.needsGeocoding}
                  </span>
                </div>
                {(stats?.needsGeocoding || 0) > 0 && (
                  <Badge variant="secondary" className="bg-[#4ECDC4]/10 text-[#0D3B66] dark:text-[#4ECDC4]">{stats?.needsGeocoding}</Badge>
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
                  iconColor="ocean"
                  badge={business.verified ? undefined : { text: 'Pending', variant: 'secondary' as const }}
                />
              ))}
              {recentEvents?.slice(0, 3).map((event) => (
                <ActivityFeedItem
                  key={event.id}
                  icon={Calendar}
                  message={`${t.dashboard.activity.newEvent}: ${event.title}`}
                  timestamp={event.created_at}
                  iconColor="seafoam"
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