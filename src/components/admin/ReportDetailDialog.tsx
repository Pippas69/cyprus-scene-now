import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Report, ReportStatus } from '@/hooks/useAdminReports';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Eye,
  User,
  Calendar,
  FileText,
  MessageSquare,
} from 'lucide-react';

interface ReportDetailDialogProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (reportId: string, status: ReportStatus, adminNotes?: string) => void;
  onDeleteContent: (report: Report) => void;
  isUpdating: boolean;
}

const statusConfig: Record<ReportStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-500' },
  under_review: { icon: Eye, color: 'bg-blue-500' },
  resolved: { icon: CheckCircle, color: 'bg-green-500' },
  dismissed: { icon: XCircle, color: 'bg-muted' },
};

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onUpdateStatus,
  onDeleteContent,
  isUpdating,
}: ReportDetailDialogProps) {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [adminNotes, setAdminNotes] = useState(report?.admin_notes || '');

  if (!report) return null;

  const StatusIcon = statusConfig[report.status].icon;
  const entityTitle = report.entity_details?.title || report.entity_details?.name || 'Unknown';

  const handleStatusUpdate = (status: ReportStatus) => {
    onUpdateStatus(report.id, status, adminNotes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t.reports.preview.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {t.reports.status[report.status.replace('_', '') as keyof typeof t.reports.status] || report.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(report.created_at), 'PPp')}
            </span>
          </div>

          <Separator />

          {/* Reporter Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={report.reporter?.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {t.reports.preview.reportedBy}
              </p>
            <p className="text-sm text-muted-foreground">
                {report.reporter?.name || 'Anonymous'}
              </p>
            </div>
          </div>

          {/* Report Details */}
          <div className="grid gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.reports.preview.reason}</p>
                <p className="text-sm text-muted-foreground">{report.reason}</p>
              </div>
            </div>

            {report.description && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t.reports.preview.description}</p>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reported Content Preview */}
          <div className="p-4 rounded-lg border">
            <p className="text-sm font-medium mb-2">{t.reports.preview.content}</p>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{report.entity_type}</Badge>
              <span className="font-medium">{entityTitle}</span>
            </div>
            {report.entity_details?.content && (
              <p className="text-sm text-muted-foreground line-clamp-4">
                {report.entity_details.content}
              </p>
            )}
          </div>

          {/* Admin Notes */}
          <div>
            <label className="text-sm font-medium">{t.reports.preview.adminNotes}</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t.reports.preview.addNotes}
              className="mt-2"
              rows={3}
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {report.status === 'pending' && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('under_review')}
                disabled={isUpdating}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t.reports.actions.markReviewing}
              </Button>
            )}

            <Button
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => handleStatusUpdate('dismissed')}
              disabled={isUpdating}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t.reports.actions.dismiss}
            </Button>

            <Button
              variant="outline"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
              onClick={() => handleStatusUpdate('resolved')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>

            {(report.entity_type === 'event' || report.entity_type === 'business') && (
              <Button
                variant="destructive"
                onClick={() => onDeleteContent(report)}
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.reports.actions.deleteContent}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
