import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminStats } from '@/hooks/useAdminStats';
import { MetricCard } from '@/components/admin/MetricCard';
import { ActivityFeedItem } from '@/components/admin/ActivityFeedItem';
import { Users, Building2, Calendar, Tag, CheckCircle, Flag, UserPlus, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        .select('id, name, created_at')
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.dashboard.welcome}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t.dashboard.metrics.totalUsers}
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={stats?.userGrowth}
          trendLabel={t.dashboard.metrics.growth}
        />
        <MetricCard
          title={t.dashboard.metrics.totalBusinesses}
          value={stats?.totalBusinesses || 0}
          icon={Building2}
        />
        <MetricCard
          title={t.dashboard.metrics.activeEvents}
          value={stats?.activeEvents || 0}
          icon={Calendar}
        />
        <MetricCard
          title={t.dashboard.metrics.activeOffers}
          value={stats?.activeOffers || 0}
          icon={Tag}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.quickActions.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/verification">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.dashboard.quickActions.pendingVerifications}
                </span>
                <Badge variant="secondary">{stats?.pendingVerifications || 0}</Badge>
              </Button>
            </Link>
            <Link to="/admin/reports">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  {t.dashboard.quickActions.unreviewedReports}
                </span>
                <Badge variant="destructive">{stats?.unreviewedReports || 0}</Badge>
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t.dashboard.quickActions.recentSignups}
                </span>
              </Button>
            </Link>
            <Link to="/admin/geocoding">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t.dashboard.quickActions.needsGeocoding}
                </span>
                <Badge variant="secondary">{stats?.needsGeocoding || 0}</Badge>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.activity.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBusinesses?.map((business) => (
              <ActivityFeedItem
                key={business.id}
                icon={Building2}
                message={`${t.dashboard.activity.newBusiness}: ${business.name}`}
                timestamp={business.created_at}
              />
            ))}
            {recentEvents?.map((event) => (
              <ActivityFeedItem
                key={event.id}
                icon={Calendar}
                message={`${t.dashboard.activity.newEvent}: ${event.title}`}
                timestamp={event.created_at}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
