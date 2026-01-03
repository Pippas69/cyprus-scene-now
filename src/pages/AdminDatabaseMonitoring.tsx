import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatabaseMonitoring } from "@/hooks/useDatabaseMonitoring";
import { useLanguage } from "@/hooks/useLanguage";
import { adminTranslations } from "@/translations/adminTranslations";
import { AdminOceanHeader } from "@/components/admin/AdminOceanHeader";
import { AlertTriangle, Activity, Database, Zap, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AdminDatabaseMonitoring = () => {
  const { data: metrics, isLoading } = useDatabaseMonitoring();
  const { language } = useLanguage();
  const t = adminTranslations[language];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const connectionPoolUsage = metrics ? (metrics.totalConnections / 100) * 100 : 0;
  const isHighConnectionUsage = connectionPoolUsage > 80;
  const hasSlowQueries = metrics && metrics.slowQueries.length > 0;
  const isHighErrorRate = metrics && metrics.errorRate > 5;

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={t.database.title}
        subtitle={t.database.subtitle}
      />

      <div className="max-w-7xl mx-auto px-4 pb-8 space-y-6">
        {/* Alert Section */}
        {(isHighConnectionUsage || hasSlowQueries || isHighErrorRate) && (
          <div className="space-y-4">
            {isHighConnectionUsage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.database.alerts.highConnectionUsage}</AlertTitle>
                <AlertDescription>
                  {t.database.alerts.highConnectionDesc.replace('{percent}', connectionPoolUsage.toFixed(1))}
                </AlertDescription>
              </Alert>
            )}
            
            {hasSlowQueries && (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertTitle>{t.database.alerts.slowQueries}</AlertTitle>
                <AlertDescription>
                  {t.database.alerts.slowQueriesDesc.replace('{count}', String(metrics.slowQueries.length))}
                </AlertDescription>
              </Alert>
            )}

            {isHighErrorRate && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.database.alerts.highErrorRate}</AlertTitle>
                <AlertDescription>
                  {t.database.alerts.highErrorDesc.replace('{percent}', metrics.errorRate.toFixed(2))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-t-2 border-[hsl(var(--aegean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.database.metrics.totalConnections}</CardTitle>
              <Database className="h-4 w-4 text-[hsl(var(--aegean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalConnections || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.database.metrics.poolUsage}: {connectionPoolUsage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-[hsl(var(--ocean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.database.metrics.activeConnections}</CardTitle>
              <Activity className="h-4 w-4 text-[hsl(var(--ocean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeConnections || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.database.metrics.idle}: {metrics?.idleConnections || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-[hsl(var(--seafoam))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.database.metrics.avgQueryTime}</CardTitle>
              <Zap className="h-4 w-4 text-[hsl(var(--seafoam))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.avgQueryTime ? `${metrics.avgQueryTime.toFixed(0)}ms` : t.common.na}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.database.metrics.lastHourAvg}
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-2 border-[hsl(var(--soft-aegean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.database.metrics.errorRate}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--soft-aegean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.errorRate ? `${metrics.errorRate.toFixed(2)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.database.metrics.lastHour}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t.database.sections.connectionStats}</CardTitle>
            <CardDescription>{t.database.sections.connectionStatsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics?.connectionStats.map((stat) => (
                <Badge key={stat.state} variant="secondary" className="bg-[hsl(var(--ocean))]/10 text-[hsl(var(--ocean))]">
                  {stat.state}: {stat.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>{t.database.sections.recentAlerts}</CardTitle>
            <CardDescription>{t.database.sections.recentAlertsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.recentAlerts && metrics.recentAlerts.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {metrics.recentAlerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={alert.severity === 'error' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'default'}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="font-medium">{alert.message}</p>
                      {alert.details && (
                        <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                          {JSON.stringify(alert.details, null, 2)}
                        </code>
                      )}
                      <p className="text-xs text-muted-foreground">{t.database.sections.type}: {alert.alert_type}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">{t.database.sections.noAlerts}</p>
            )}
          </CardContent>
        </Card>

        {/* Slow Queries */}
        {metrics?.slowQueries && metrics.slowQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.database.sections.slowQueries}</CardTitle>
              <CardDescription>{t.database.sections.slowQueriesDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {metrics.slowQueries.map((query, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={query.duration_ms > 5000 ? "destructive" : "secondary"}>
                          {query.duration_ms.toFixed(0)}ms
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(query.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {query.query}
                      </code>
                      <p className="text-xs text-muted-foreground">{t.database.sections.user}: {query.user}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDatabaseMonitoring;
