import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, ArrowUpDown } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useState } from 'react';

interface EventPerformanceTableProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: 'Απόδοση Εκδηλώσεων',
    eventName: 'Όνομα Εκδήλωσης',
    reach: 'Εμβέλεια',
    impressions: 'Προβολές',
    interested: 'Ενδιαφέρον',
    going: 'Πηγαίνουν',
    conversion: 'Μετατροπή',
    reservations: 'Κρατήσεις',
    export: 'Εξαγωγή CSV',
    noData: 'Δεν υπάρχουν δεδομένα',
  },
  en: {
    title: 'Event Performance',
    eventName: 'Event Name',
    reach: 'Reach',
    impressions: 'Impressions',
    interested: 'Interested',
    going: 'Going',
    conversion: 'Conversion',
    reservations: 'Reservations',
    export: 'Export CSV',
    noData: 'No data available',
  },
};

type SortField = 'reach' | 'impressions' | 'interested' | 'going' | 'conversionRate' | 'reservations';

export const EventPerformanceTable = ({ data, language }: EventPerformanceTableProps) => {
  const t = translations[language];
  const [sortField, setSortField] = useState<SortField>('impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data.eventPerformance].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const exportToCSV = () => {
    const headers = [
      t.eventName,
      t.reach,
      t.impressions,
      t.interested,
      t.going,
      t.conversion,
      t.reservations,
    ];
    const rows = data.eventPerformance.map((event) => [
      event.eventTitle,
      event.reach,
      event.impressions,
      event.interested,
      event.going,
      `${event.conversionRate.toFixed(1)}%`,
      event.reservations,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.title}</CardTitle>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          {t.export}
        </Button>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t.noData}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.eventName}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('reach')}>
                    <div className="flex items-center gap-1">
                      {t.reach}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('impressions')}>
                    <div className="flex items-center gap-1">
                      {t.impressions}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('interested')}>
                    <div className="flex items-center gap-1">
                      {t.interested}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('going')}>
                    <div className="flex items-center gap-1">
                      {t.going}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('conversionRate')}>
                    <div className="flex items-center gap-1">
                      {t.conversion}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('reservations')}>
                    <div className="flex items-center gap-1">
                      {t.reservations}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {event.eventTitle}
                    </TableCell>
                    <TableCell>{event.reach.toLocaleString()}</TableCell>
                    <TableCell>{event.impressions.toLocaleString()}</TableCell>
                    <TableCell>{event.interested.toLocaleString()}</TableCell>
                    <TableCell>{event.going.toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={
                          event.conversionRate > 50
                            ? 'text-green-600 dark:text-green-400'
                            : event.conversionRate > 25
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {event.conversionRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{event.reservations.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
