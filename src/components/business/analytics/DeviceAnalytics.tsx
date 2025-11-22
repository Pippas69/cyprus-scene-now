import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Smartphone, Monitor, Tablet, AlertCircle } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeviceAnalyticsProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Ανάλυση Συσκευών',
    description: 'Πώς οι χρήστες προβάλλουν το περιεχόμενό σας',
    deviceBreakdown: 'Κατανομή Συσκευών',
    performance: 'Απόδοση ανά Συσκευή',
    device: 'Συσκευή',
    views: 'Προβολές',
    uniqueUsers: 'Μοναδικοί Χρήστες',
    conversions: 'Μετατροπές',
    conversionRate: 'Ποσοστό Μετατροπής',
    bestDevice: 'Καλύτερη Συσκευή',
    noData: 'Δεν υπάρχουν διαθέσιμα δεδομένα',
    mobileWarning: 'Η μετατροπή σε κινητά είναι χαμηλότερη από το επιθυμητό - ελέγξτε την εμπειρία χρήστη σε κινητά',
    mobile: 'Κινητό',
    desktop: 'Υπολογιστής',
    tablet: 'Tablet',
    unknown: 'Άγνωστο',
  },
  en: {
    title: 'Device Analytics',
    description: 'How users view your content',
    deviceBreakdown: 'Device Breakdown',
    performance: 'Performance by Device',
    device: 'Device',
    views: 'Views',
    uniqueUsers: 'Unique Users',
    conversions: 'Conversions',
    conversionRate: 'Conversion Rate',
    bestDevice: 'Best Device',
    noData: 'No data available',
    mobileWarning: 'Mobile conversion is lower than desired - check mobile user experience',
    mobile: 'Mobile',
    desktop: 'Desktop',
    tablet: 'Tablet',
    unknown: 'Unknown',
  },
};

const COLORS = {
  mobile: 'hsl(var(--primary))',
  desktop: 'hsl(var(--secondary))',
  tablet: 'hsl(var(--accent))',
  unknown: 'hsl(var(--muted))',
};

const deviceIcons = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
  unknown: Monitor,
};

const deviceLabels: Record<string, { el: string; en: string }> = {
  mobile: { el: 'Κινητό', en: 'Mobile' },
  desktop: { el: 'Υπολογιστής', en: 'Desktop' },
  tablet: { el: 'Tablet', en: 'Tablet' },
  unknown: { el: 'Άγνωστο', en: 'Unknown' },
};

export const DeviceAnalytics = ({ data, language }: DeviceAnalyticsProps) => {
  const t = translations[language];

  if (!data.deviceAnalytics || data.deviceAnalytics.length === 0) {
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

  const deviceData = data.deviceAnalytics.map(device => ({
    ...device,
    name: deviceLabels[device.device_type]?.[language] || device.device_type,
    conversionRate: device.views > 0 ? ((device.conversions / device.views) * 100).toFixed(1) : '0',
  }));

  const totalViews = deviceData.reduce((sum, d) => sum + d.views, 0);
  const bestDevice = [...deviceData].sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0];
  
  const mobileData = deviceData.find(d => d.device_type === 'mobile');
  const desktopData = deviceData.find(d => d.device_type === 'desktop');
  const showMobileWarning = mobileData && desktopData && 
    parseFloat(mobileData.conversionRate) < parseFloat(desktopData.conversionRate) * 0.7;

  const pieData = deviceData.map(device => ({
    name: device.name,
    value: device.views,
    percentage: ((device.views / totalViews) * 100).toFixed(1),
    color: COLORS[device.device_type as keyof typeof COLORS] || COLORS.unknown,
  }));

  return (
    <div className="space-y-6">
      {showMobileWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t.mobileWarning}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(deviceIcons[bestDevice.device_type as keyof typeof deviceIcons] || Monitor, { 
              className: "h-5 w-5 text-primary" 
            })}
            {t.bestDevice}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{bestDevice.name}</p>
              <p className="text-muted-foreground">
                {bestDevice.views} {t.views} ({((bestDevice.views / totalViews) * 100).toFixed(0)}%)
              </p>
            </div>
            <Badge variant="default" className="text-lg px-4 py-2">
              {bestDevice.conversionRate}% {t.conversionRate}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.deviceBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.performance}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deviceData}>
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
                <Bar dataKey="views" fill="hsl(var(--primary))" name={t.views} />
                <Bar dataKey="conversions" fill="hsl(var(--chart-2))" name={t.conversions} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.performance}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">{t.device}</th>
                  <th className="text-right py-3 px-4">{t.views}</th>
                  <th className="text-right py-3 px-4">{t.uniqueUsers}</th>
                  <th className="text-right py-3 px-4">{t.conversions}</th>
                  <th className="text-right py-3 px-4">{t.conversionRate}</th>
                </tr>
              </thead>
              <tbody>
                {deviceData.map((device, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      {React.createElement(deviceIcons[device.device_type as keyof typeof deviceIcons] || Monitor, { 
                        className: "h-4 w-4" 
                      })}
                      {device.name}
                    </td>
                    <td className="text-right py-3 px-4">{device.views}</td>
                    <td className="text-right py-3 px-4">{device.unique_users}</td>
                    <td className="text-right py-3 px-4">{device.conversions}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={parseFloat(device.conversionRate) > 5 ? 'default' : 'secondary'}>
                        {device.conversionRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
