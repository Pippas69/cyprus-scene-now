import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Wallet, MapPin, Calendar, Clock } from 'lucide-react';
import { useCustomerMetrics } from '@/hooks/useCustomerMetrics';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface SimpleCustomerOverviewProps {
  businessId: string;
  language: 'el' | 'en';
  dateRange?: DateRange;
}

const translations = {
  el: {
    title: 'Οι Πελάτες σου',
    customers: 'Πελάτες',
    thisMonth: 'αυτόν τον μήνα',
    repeatCustomers: 'Επαναλαμβανόμενοι',
    cameBack: 'επέστρεψαν',
    averageSpend: 'Μέση Δαπάνη',
    perCustomer: 'ανά πελάτη',
    whereFrom: 'Από πού είναι οι πελάτες σου',
    busiestDay: 'Πιο πολυάσχολη μέρα',
    peakTime: 'Ώρα αιχμής',
    noData: 'Δεν υπάρχουν δεδομένα πελατών ακόμα',
    noDataHint: 'Τα δεδομένα θα εμφανιστούν όταν ξεκινήσουν οι πωλήσεις',
    days: {
      Sunday: 'Κυριακή',
      Monday: 'Δευτέρα',
      Tuesday: 'Τρίτη',
      Wednesday: 'Τετάρτη',
      Thursday: 'Πέμπτη',
      Friday: 'Παρασκευή',
      Saturday: 'Σάββατο',
    },
  },
  en: {
    title: 'Your Customers',
    customers: 'Customers',
    thisMonth: 'this month',
    repeatCustomers: 'Repeat',
    cameBack: 'came back',
    averageSpend: 'Average Spend',
    perCustomer: 'per customer',
    whereFrom: 'Where your customers are from',
    busiestDay: 'Busiest day',
    peakTime: 'Peak time',
    noData: 'No customer data yet',
    noDataHint: 'Data will appear when sales begin',
    days: {
      Sunday: 'Sunday',
      Monday: 'Monday',
      Tuesday: 'Tuesday',
      Wednesday: 'Wednesday',
      Thursday: 'Thursday',
      Friday: 'Friday',
      Saturday: 'Saturday',
    },
  },
};

export const SimpleCustomerOverview = ({ businessId, language, dateRange }: SimpleCustomerOverviewProps) => {
  const t = translations[language];
  const { data, isLoading } = useCustomerMetrics(businessId, dateRange);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasData = data && data.totalCustomers > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">{t.noData}</p>
          <p className="text-sm text-muted-foreground mt-2">{t.noDataHint}</p>
        </CardContent>
      </Card>
    );
  }

  const maxCityCount = Math.max(...(data.cityBreakdown.map(c => c.count) || [1]));
  const translateDay = (day: string | null) => {
    if (!day) return null;
    return t.days[day as keyof typeof t.days] || day;
  };

  return (
    <div className="space-y-6">
      {/* 3 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Customers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{data.totalCustomers}</p>
                <p className="text-sm text-muted-foreground">{t.customers} {t.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repeat Customers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {data.repeatCustomers}
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    ({Math.round(data.repeatRate)}%)
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{t.repeatCustomers} {t.cameBack}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Spend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Wallet className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">€{data.averageSpend.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">{t.averageSpend} {t.perCustomer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City Breakdown */}
      {data.cityBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              {t.whereFrom}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.cityBreakdown.map((city, index) => (
              <div key={city.city} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{city.city}</span>
                  <span className="text-muted-foreground">{city.count}</span>
                </div>
                <Progress 
                  value={(city.count / maxCityCount) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Busiest Day & Peak Time */}
      {(data.busiestDay || data.peakTime) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {data.busiestDay && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t.busiestDay}:</span>
              <span className="font-medium">{translateDay(data.busiestDay)}</span>
            </div>
          )}
          {data.peakTime && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t.peakTime}:</span>
              <span className="font-medium">{data.peakTime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
