import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useTicketAnalytics } from "@/hooks/useTicketAnalytics";
import { DateRange } from "react-day-picker";
import { Euro, Ticket, CheckCircle2, TrendingUp, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { format } from "date-fns";

interface TicketAnalyticsProps {
  businessId: string;
  dateRange?: DateRange;
  language: "el" | "en";
}

const translations = {
  el: {
    totalRevenue: "Συνολικά Έσοδα",
    ticketsSold: "Εισιτήρια Πωλημένα",
    checkInRate: "Ποσοστό Check-in",
    avgTicketPrice: "Μέση Τιμή Εισιτηρίου",
    netRevenue: "Καθαρά Έσοδα",
    commission: "Προμήθεια",
    revenueOverTime: "Έσοδα ανά Ημέρα",
    revenueByEvent: "Έσοδα ανά Εκδήλωση",
    tierPerformance: "Απόδοση Κατηγοριών",
    noData: "Δεν υπάρχουν δεδομένα εισιτηρίων",
    noDataDesc: "Δημιουργήστε εισιτήρια για να δείτε αναλυτικά στοιχεία",
    sold: "πωλημένα",
    checkedIn: "check-ins",
    revenue: "Έσοδα",
    tickets: "Εισιτήρια",
  },
  en: {
    totalRevenue: "Total Revenue",
    ticketsSold: "Tickets Sold",
    checkInRate: "Check-in Rate",
    avgTicketPrice: "Avg Ticket Price",
    netRevenue: "Net Revenue",
    commission: "Commission",
    revenueOverTime: "Revenue Over Time",
    revenueByEvent: "Revenue by Event",
    tierPerformance: "Tier Performance",
    noData: "No ticket data",
    noDataDesc: "Create tickets to see analytics",
    sold: "sold",
    checkedIn: "check-ins",
    revenue: "Revenue",
    tickets: "Tickets",
  },
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function TicketAnalytics({ businessId, dateRange, language }: TicketAnalyticsProps) {
  const t = translations[language];
  const { data, isLoading } = useTicketAnalytics(businessId, dateRange);

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasData = data && (data.ticketsSold > 0 || data.totalRevenue > 0);

  if (!hasData) {
    return (
      <Card className="p-8 text-center">
        <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">{t.noData}</h3>
        <p className="text-muted-foreground">{t.noDataDesc}</p>
      </Card>
    );
  }

  // Format daily revenue for chart
  const chartData = data.dailyRevenue.map((d) => ({
    date: format(new Date(d.date), "dd/MM"),
    revenue: d.revenue / 100,
    tickets: d.tickets,
  }));

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Euro className="h-4 w-4" />
              {t.totalRevenue}
            </div>
            <p className="text-2xl font-bold mt-1">{formatPrice(data.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Ticket className="h-4 w-4" />
              {t.ticketsSold}
            </div>
            <p className="text-2xl font-bold mt-1">{data.ticketsSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {t.checkInRate}
            </div>
            <p className="text-2xl font-bold mt-1">{data.checkInRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {data.checkedIn} {t.checkedIn}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              {t.avgTicketPrice}
            </div>
            <p className="text-2xl font-bold mt-1">{formatPrice(data.avgTicketPrice)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              {t.netRevenue}
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
              {formatPrice(data.netRevenue)}
            </p>
            {data.totalCommission > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.commission}: {formatPrice(data.totalCommission)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.revenueOverTime}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`€${value.toFixed(2)}`, t.revenue]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by event */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.revenueByEvent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.eventBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.eventBreakdown.slice(0, 5)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `€${(v / 100).toFixed(0)}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="eventTitle"
                      width={120}
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => v.length > 15 ? `${v.slice(0, 15)}...` : v}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), t.revenue]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {data.eventBreakdown.slice(0, 5).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier performance */}
      {data.tierBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.tierPerformance}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tierBreakdown.map((tier, index) => {
              const soldPercent = tier.total > 0 ? (tier.sold / tier.total) * 100 : 0;

              return (
                <div key={tier.tierName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{tier.tierName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tier.sold} {t.sold} • {formatPrice(tier.revenue)}
                    </div>
                  </div>
                  <Progress value={soldPercent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
