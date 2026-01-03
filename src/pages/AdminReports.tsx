import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminReports, Report, ReportStatus, EntityType } from '@/hooks/useAdminReports';
import { ReportsTable } from '@/components/admin/ReportsTable';
import { ReportDetailDialog } from '@/components/admin/ReportDetailDialog';
import { AdminOceanHeader } from '@/components/admin/AdminOceanHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle,
  Search,
} from 'lucide-react';

export const AdminReports = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const {
    reports,
    stats,
    isLoading,
    filters,
    setFilters,
    updateStatus,
    isUpdating,
    deleteContent,
    isDeleting,
  } = useAdminReports();

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handleUpdateStatus = (reportId: string, status: ReportStatus, adminNotes?: string) => {
    updateStatus({ reportId, status, adminNotes });
    setSelectedReport(null);
  };

  const handleDeleteContent = (report: Report) => {
    if (confirm(language === 'el' ? 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το περιεχόμενο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.' : 'Are you sure you want to delete this content? This action cannot be undone.')) {
      deleteContent({ report });
      setSelectedReport(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminOceanHeader
        title={t.reports.title}
        subtitle={t.reports.subtitle}
      />

      <div className="max-w-7xl mx-auto px-4 pb-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-t-2 border-[hsl(var(--aegean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.reports.stats.total}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--aegean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--soft-aegean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.reports.stats.pending}</CardTitle>
              <Clock className="h-4 w-4 text-[hsl(var(--soft-aegean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--soft-aegean))]">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--ocean))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.reports.stats.underReview}</CardTitle>
              <Eye className="h-4 w-4 text-[hsl(var(--ocean))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--ocean))]">{stats.underReview}</div>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-[hsl(var(--seafoam))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.reports.stats.resolved}</CardTitle>
              <CheckCircle className="h-4 w-4 text-[hsl(var(--seafoam))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--seafoam))]">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.common.search + "..."}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value as ReportStatus | 'all' })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t.reports.filters.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.reports.filters.allStatuses}</SelectItem>
                  <SelectItem value="pending">{t.reports.status.pending}</SelectItem>
                  <SelectItem value="under_review">{t.reports.status.underReview}</SelectItem>
                  <SelectItem value="resolved">{t.reports.status.resolved}</SelectItem>
                  <SelectItem value="dismissed">{t.reports.status.dismissed}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters({ ...filters, entityType: value as EntityType | 'all' })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t.reports.filters.entityType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.reports.filters.allTypes}</SelectItem>
                  <SelectItem value="event">{t.reports.entityTypes.event}</SelectItem>
                  <SelectItem value="business">{t.reports.entityTypes.business}</SelectItem>
                  <SelectItem value="discount">{t.reports.entityTypes.discount}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <ReportsTable
          reports={reports}
          isLoading={isLoading}
          onViewReport={handleViewReport}
        />

        {/* Report Detail Dialog */}
        <ReportDetailDialog
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
          onUpdateStatus={handleUpdateStatus}
          onDeleteContent={handleDeleteContent}
          isUpdating={isUpdating || isDeleting}
        />
      </div>
    </div>
  );
};

export default AdminReports;
