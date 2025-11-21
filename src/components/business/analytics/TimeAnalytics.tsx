import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface TimeAnalyticsProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    hourlyEngagement: 'Αλληλεπίδραση ανά Ώρα',
    dailyEngagement: 'Αλληλεπίδραση ανά Ημέρα',
    engagement: 'Αλληλεπιδράσεις',
    hour: 'Ώρα',
    day: 'Ημέρα',
    noData: 'Δεν υπάρχουν δεδομένα',
    insights: 'Insights',
    bestTime: 'Καλύτερη ώρα για δημοσίευση',
    bestDay: 'Καλύτερη ημέρα για εκδηλώσεις',
  },
  en: {
    hourlyEngagement: 'Hourly Engagement',
    dailyEngagement: 'Daily Engagement',
    engagement: 'Engagements',
    hour: 'Hour',
    day: 'Day',
    noData: 'No data available',
    insights: 'Insights',
    bestTime: 'Best time to post',
    bestDay: 'Best day for events',
  },
};

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayTranslations: Record<string, Record<string, string>> = {
  el: {
    Mon: 'Δευ',
    Tue: 'Τρί',
    Wed: 'Τετ',
    Thu: 'Πέμ',
    Fri: 'Παρ',
    Sat: 'Σάβ',
    Sun: 'Κυρ',
  },
  en: {
    Mon: 'Mon',
    Tue: 'Tue',
    Wed: 'Wed',
    Thu: 'Thu',
    Fri: 'Fri',
    Sat: 'Sat',
    Sun: 'Sun',
  },
};

export const TimeAnalytics = ({ data, language }: TimeAnalyticsProps) => {
  const t = translations[language];
  const { timeAnalytics } = data;

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString().padStart(2, '0') + ':00',
    engagement: timeAnalytics.hourlyEngagement[i] || 0,
  }));

  const dailyData = dayOrder.map(day => ({
    day: dayTranslations[language][day],
    engagement: timeAnalytics.dailyEngagement[day] || 0,
  }));

  // Find best time and day
  const bestHour = Object.entries(timeAnalytics.hourlyEngagement).reduce(
    (max, [hour, count]) => (count > max.count ? { hour: parseInt(hour), count } : max),
    { hour: 0, count: 0 }
  );

  const bestDay = Object.entries(timeAnalytics.dailyEngagement).reduce(
    (max, [day, count]) => (count > max.count ? { day, count } : max),
    { day: '', count: 0 }
  );

  const hasHourlyData = Object.keys(timeAnalytics.hourlyEngagement).length > 0;
  const hasDailyData = Object.keys(timeAnalytics.dailyEngagement).length > 0;

  return (
    <div className="space-y-6">
      {/* Insights Cards */}
      {(hasHourlyData || hasDailyData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasHourlyData && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.bestTime}</p>
                    <p className="text-2xl font-bold mt-1">
                      {bestHour.hour.toString().padStart(2, '0')}:00 - {(bestHour.hour + 1).toString().padStart(2, '0')}:00
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{bestHour.count}</p>
                    <p className="text-xs text-muted-foreground">{t.engagement}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {hasDailyData && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.bestDay}</p>
                    <p className="text-2xl font-bold mt-1">
                      {dayTranslations[language][bestDay.day] || bestDay.day}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{bestDay.count}</p>
                    <p className="text-xs text-muted-foreground">{t.engagement}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Hourly Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t.hourlyEngagement}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasHourlyData ? (
            <p className="text-center text-muted-foreground py-8">{t.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="engagement" fill="hsl(var(--primary))" name={t.engagement} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t.dailyEngagement}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasDailyData ? (
            <p className="text-center text-muted-foreground py-8">{t.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="engagement" fill="hsl(var(--secondary))" name={t.engagement} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
