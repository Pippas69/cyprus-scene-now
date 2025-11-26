import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatabaseMonitoring } from "@/hooks/useDatabaseMonitoring";
import { AlertTriangle, Activity, Database, Zap, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AdminDatabaseMonitoring = () => {
  const { data: metrics, isLoading } = useDatabaseMonitoring();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Database Monitoring</h1>
          <p className="text-muted-foreground mt-2">Real-time database performance metrics and alerts</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const connectionPoolUsage = metrics ? (metrics.totalConnections / 100) * 100 : 0;
  const isHighConnectionUsage = connectionPoolUsage > 80;
  const hasSlowQueries = metrics && metrics.slowQueries.length > 0;
  const isHighErrorRate = metrics && metrics.errorRate > 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Monitoring</h1>
        <p className="text-muted-foreground mt-2">Real-time database performance metrics and alerts</p>
      </div>

      {/* Alert Section */}
      {(isHighConnectionUsage || hasSlowQueries || isHighErrorRate) && (
        <div className="space-y-4">
          {isHighConnectionUsage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Connection Pool Usage</AlertTitle>
              <AlertDescription>
                Connection pool is at {connectionPoolUsage.toFixed(1)}% capacity. Consider scaling or optimizing connection usage.
              </AlertDescription>
            </Alert>
          )}
          
          {hasSlowQueries && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertTitle>Slow Queries Detected</AlertTitle>
              <AlertDescription>
                {metrics.slowQueries.length} queries taking longer than 1 second detected in the last hour.
              </AlertDescription>
            </Alert>
          )}

          {isHighErrorRate && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Error Rate</AlertTitle>
              <AlertDescription>
                Database error rate is at {metrics.errorRate.toFixed(2)}%. This is above the normal threshold.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalConnections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pool usage: {connectionPoolUsage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeConnections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Idle: {metrics?.idleConnections || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgQueryTime ? `${metrics.avgQueryTime.toFixed(0)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last hour average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.errorRate ? `${metrics.errorRate.toFixed(2)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Statistics</CardTitle>
          <CardDescription>Breakdown of database connections by state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {metrics?.connectionStats.map((stat) => (
              <Badge key={stat.state} variant="secondary">
                {stat.state}: {stat.count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slow Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Slow Queries (&gt;1s)</CardTitle>
          <CardDescription>Queries that took longer than 1 second to execute</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.slowQueries && metrics.slowQueries.length > 0 ? (
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
                    <p className="text-xs text-muted-foreground">User: {query.user}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No slow queries detected in the last hour.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDatabaseMonitoring;
