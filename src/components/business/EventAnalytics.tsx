import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Calendar, Heart } from 'lucide-react';

interface EventAnalyticsProps {
  businessId: string;
  language: 'el' | 'en';
}

export const EventAnalytics = ({ businessId, language }: EventAnalyticsProps) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch events
    const { data: events } = await supabase
      .from('events')
      .select('id, title')
      .eq('business_id', businessId);

    if (events) {
      const eventIds = events.map(e => e.id);

      // Fetch RSVPs
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('event_id, status')
        .in('event_id', eventIds);

      // Fetch realtime stats
      const { data: realtimeStats } = await supabase
        .from('realtime_stats')
        .select('*')
        .in('event_id', eventIds);

      // Calculate metrics
      const totalRsvps = rsvps?.length || 0;
      const totalInterested = rsvps?.filter(r => r.status === 'interested').length || 0;
      const totalGoing = rsvps?.filter(r => r.status === 'going').length || 0;

      // Event breakdown - with null safety
      const eventBreakdown = events.map(event => ({
        name: event?.title || 'Unknown Event',
        interested: rsvps?.filter(r => r.event_id === event.id && r.status === 'interested').length || 0,
        going: rsvps?.filter(r => r.event_id === event.id && r.status === 'going').length || 0,
      }));

      setStats({
        totalRsvps,
        totalInterested,
        totalGoing,
        conversionRate: totalInterested > 0 ? ((totalGoing / totalInterested) * 100).toFixed(1) : 0,
        eventBreakdown,
      });
    }

    setLoading(false);
  };

  const text = {
    el: {
      title: 'Αναλυτικά Στοιχεία',
      totalRsvps: 'Σύνολο Κρατήσεων',
      interested: 'Ενδιαφερόμενοι',
      going: 'Συμμετέχοντες',
      conversion: 'Ποσοστό Μετατροπής',
      eventPerformance: 'Απόδοση Εκδηλώσεων',
    },
    en: {
      title: 'Analytics',
      totalRsvps: 'Total RSVPs',
      interested: 'Interested',
      going: 'Going',
      conversion: 'Conversion Rate',
      eventPerformance: 'Event Performance',
    },
  };

  const t = text[language];

  if (loading || !stats) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold">{t.title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalRsvps}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRsvps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.interested}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterested}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.going}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGoing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.conversion}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.eventPerformance}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.eventBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="interested" fill="hsl(var(--primary))" name={t.interested} />
              <Bar dataKey="going" fill="hsl(var(--secondary))" name={t.going} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
