import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminReports, Report, ReportStatus, EntityType } from '@/hooks/useAdminReports';
import { ReportsTable } from '@/components/admin/ReportsTable';
import { ReportDetailDialog } from '@/components/admin/ReportDetailDialog';
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
  XCircle,
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
    if (confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      deleteContent({ report });
      setSelectedReport(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.reports.title}</h1>
        <p className="text-muted-foreground mt-1">
          Review and moderate reported content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
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
                placeholder="Search reports..."
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
                <SelectItem value="all">All Statuses</SelectItem>
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
                <SelectItem value="discount">Discount</SelectItem>
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
  );
};

export default AdminReports;
