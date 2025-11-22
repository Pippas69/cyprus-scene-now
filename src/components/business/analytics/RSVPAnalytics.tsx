import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserCheck, Calendar, Users, Clock } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';

interface RSVPAnalyticsProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Ανάλυση RSVP & Κρατήσεων',
    description: 'Πώς οι χρήστες δεσμεύονται στις εκδηλώσεις σας',
    rsvpStatus: 'Κατάσταση RSVP',
    reservations: 'Κρατήσεις',
    totalReservations: 'Σύνολο Κρατήσεων',
    avgPartySize: 'Μέσο Μέγεθος Ομάδας',
    bookingTimeline: 'Χρονοδιάγραμμα Κρατήσεων',
    daysBeforeEvent: 'Ημέρες Πριν την Εκδήλωση',
    bookings: 'Κρατήσεις',
    interested: 'Ενδιαφέρομαι',
    going: 'Θα Πάω',
    status: 'Κατάσταση',
    count: 'Αριθμός',
    percentage: 'Ποσοστό',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    reservationStatus: 'Κατάσταση Κρατήσεων',
    pending: 'Σε εκκρεμότητα',
    confirmed: 'Επιβεβαιωμένες',
    cancelled: 'Ακυρωμένες',
  },
  en: {
    title: 'RSVP & Reservation Analytics',
    description: 'How users commit to your events',
    rsvpStatus: 'RSVP Status',
    reservations: 'Reservations',
    totalReservations: 'Total Reservations',
    avgPartySize: 'Average Party Size',
    bookingTimeline: 'Booking Timeline',
    daysBeforeEvent: 'Days Before Event',
    bookings: 'Bookings',
    interested: 'Interested',
    going: 'Going',
    status: 'Status',
    count: 'Count',
    percentage: 'Percentage',
    noData: 'No data available',
    reservationStatus: 'Reservation Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  },
};

const COLORS = {
  interested: 'hsl(var(--chart-2))',
  going: 'hsl(var(--primary))',
  pending: 'hsl(var(--chart-3))',
  confirmed: 'hsl(var(--chart-4))',
  cancelled: 'hsl(var(--destructive))',
};

export const RSVPAnalytics = ({ data, language }: RSVPAnalyticsProps) => {
  const t = translations[language];

  if (!data.rsvpAnalytics) {
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

  const { statusBreakdown, reservationStats, bookingTimeline } = data.rsvpAnalytics;

  const totalRSVPs = Object.values(statusBreakdown).reduce((sum: number, count) => sum + (count as number), 0);

  const rsvpData = Object.entries(statusBreakdown).map(([status, count]) => ({
    status,
    name: t[status as keyof typeof t] || status,
    count: count as number,
    percentage: totalRSVPs > 0 ? (((count as number) / totalRSVPs) * 100).toFixed(1) : '0',
  }));

  const reservationStatusData = reservationStats.byStatus
    ? Object.entries(reservationStats.byStatus).map(([status, count]) => ({
        status,
        name: t[status as keyof typeof t] || status,
        count: count as number,
      }))
    : [];

  const timelineData = bookingTimeline
    .filter(item => item.daysBeforeEvent >= 0)
    .sort((a, b) => a.daysBeforeEvent - b.daysBeforeEvent);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t.interested}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(statusBreakdown.interested as number) || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t.going}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(statusBreakdown.going as number) || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.totalReservations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reservationStats.total}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t.avgPartySize}: {reservationStats.avgPartySize.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.rsvpStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            {totalRSVPs > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rsvpData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    dataKey="count"
                  >
                    {rsvpData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.status as keyof typeof COLORS] || 'hsl(var(--primary))'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t.noData}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reservationStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            {reservationStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reservationStatusData}>
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" name={t.count} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t.noData}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t.bookingTimeline}
          </CardTitle>
          <CardDescription>
            {t.daysBeforeEvent}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="daysBeforeEvent" 
                  stroke="hsl(var(--foreground))"
                  label={{ value: t.daysBeforeEvent, position: 'insideBottom', offset: -5 }}
                />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" name={t.bookings} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t.noData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
