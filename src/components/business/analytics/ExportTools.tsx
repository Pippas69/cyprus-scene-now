import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Mail } from 'lucide-react';
import { AdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { toast } from 'sonner';

interface ExportToolsProps {
  data: AdvancedAnalytics;
  language: 'el' | 'en';
  businessId: string;
}

const translations = {
  el: {
    title: 'Εξαγωγή & Αναφορές',
    exportCSV: 'Εξαγωγή CSV',
    exportPDF: 'Εξαγωγή PDF',
    emailReport: 'Αποστολή Αναφοράς',
    exporting: 'Εξαγωγή...',
    success: 'Η εξαγωγή ολοκληρώθηκε!',
    error: 'Σφάλμα εξαγωγής',
  },
  en: {
    title: 'Export & Reports',
    exportCSV: 'Export CSV',
    exportPDF: 'Export PDF',
    emailReport: 'Email Report',
    exporting: 'Exporting...',
    success: 'Export completed!',
    error: 'Export error',
  },
};

export const ExportTools = ({ data, language, businessId }: ExportToolsProps) => {
  const t = translations[language];

  const exportToCSV = () => {
    try {
      toast.info(t.exporting);

      // Prepare CSV data
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Views', data.overview.totalReach],
        ['Total Impressions', data.overview.totalImpressions],
        ['Engagement Rate', `${data.overview.engagementRate.toFixed(2)}%`],
        ['Conversion Rate', `${data.overview.conversionRate.toFixed(2)}%`],
        ['Current Followers', data.overview.currentFollowers],
        ['Follower Growth', data.overview.followerGrowth],
      ];

      // Add event performance
      if (data.eventPerformance.length > 0) {
        rows.push(['', '']);
        rows.push(['Event Performance', '']);
        rows.push(['Event Name', 'Views', 'Unique Viewers', 'RSVPs Going', 'RSVPs Interested', 'Reservations']);
        
        data.eventPerformance.forEach(event => {
          rows.push([
            event.eventName,
            event.views.toString(),
            event.uniqueViewers.toString(),
            event.rsvpsGoing.toString(),
            event.rsvpsInterested.toString(),
            event.reservations.toString(),
          ]);
        });
      }

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t.success);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t.error);
    }
  };

  const exportToPDF = async () => {
    try {
      toast.info(t.exporting);
      
      // Dynamic import for jsPDF to avoid bundle size issues
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.text('Analytics Report', 20, 20);

      // Add date
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

      // Add overview metrics
      doc.setFontSize(14);
      doc.text('Overview', 20, 45);
      
      doc.setFontSize(10);
      let y = 55;
      doc.text(`Total Views: ${data.overview.totalReach}`, 20, y);
      y += 7;
      doc.text(`Total Impressions: ${data.overview.totalImpressions}`, 20, y);
      y += 7;
      doc.text(`Engagement Rate: ${data.overview.engagementRate.toFixed(2)}%`, 20, y);
      y += 7;
      doc.text(`Conversion Rate: ${data.overview.conversionRate.toFixed(2)}%`, 20, y);
      y += 7;
      doc.text(`Current Followers: ${data.overview.currentFollowers}`, 20, y);
      y += 7;
      doc.text(`Follower Growth: ${data.overview.followerGrowth}`, 20, y);

      // Add event performance if available
      if (data.eventPerformance.length > 0) {
        y += 15;
        doc.setFontSize(14);
        doc.text('Top Events', 20, y);
        
        y += 10;
        doc.setFontSize(10);
        data.eventPerformance.slice(0, 5).forEach(event => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${event.eventName}: ${event.views} views, ${event.rsvpsGoing} going`, 20, y);
          y += 7;
        });
      }

      // Save PDF
      doc.save(`analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t.success);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t.error);
    }
  };

  const emailReport = () => {
    toast.info(language === 'el' ? 'Σύντομα διαθέσιμο' : 'Coming soon');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t.exportCSV}
          </Button>
          
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            {t.exportPDF}
          </Button>
          
          <Button onClick={emailReport} variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            {t.emailReport}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
