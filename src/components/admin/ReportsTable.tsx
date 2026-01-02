import { format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Report, ReportStatus, EntityType } from '@/hooks/useAdminReports';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Building2,
  Ticket,
  Tag,
} from 'lucide-react';

interface ReportsTableProps {
  reports: Report[];
  isLoading: boolean;
  onViewReport: (report: Report) => void;
}

const statusConfig: Record<ReportStatus, { icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { icon: Clock, variant: 'default', label: 'Pending' },
  under_review: { icon: Eye, variant: 'secondary', label: 'Under Review' },
  resolved: { icon: CheckCircle, variant: 'outline', label: 'Resolved' },
  dismissed: { icon: XCircle, variant: 'outline', label: 'Dismissed' },
};

const entityIcons: Record<EntityType, React.ElementType> = {
  event: Ticket,
  business: Building2,
  discount: Tag,
};

export function ReportsTable({ reports, isLoading, onViewReport }: ReportsTableProps) {
  const { language } = useLanguage();
  const t = adminTranslations[language];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No reports found</p>
        <p className="text-sm text-muted-foreground/70">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.reports.table.reporter}</TableHead>
            <TableHead>{t.reports.table.entityType}</TableHead>
            <TableHead>{t.reports.table.entity}</TableHead>
            <TableHead>{t.reports.table.reason}</TableHead>
            <TableHead>{t.reports.table.date}</TableHead>
            <TableHead>{t.reports.table.status}</TableHead>
            <TableHead className="w-[100px]">{t.reports.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const status = statusConfig[report.status];
            const StatusIcon = status.icon;
            const EntityIcon = entityIcons[report.entity_type] || Tag;

            return (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={report.reporter?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {report.reporter?.name || 'Anonymous'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <EntityIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{report.entity_type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium line-clamp-1">
                    {report.entity_details?.title || report.entity_details?.name || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {report.reason}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(report.created_at), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewReport(report)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
