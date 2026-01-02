import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type EntityType = 'event' | 'business' | 'discount';

export interface Report {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string | null;
  reporter?: {
    name: string | null;
    avatar_url: string | null;
  };
  entity_details?: {
    title?: string;
    name?: string;
    content?: string;
  };
}

export interface ReportFilters {
  status: ReportStatus | 'all';
  entityType: EntityType | 'all';
  search: string;
}

export function useAdminReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ReportFilters>({
    status: 'all',
    entityType: 'all',
    search: '',
  });

  // Fetch all reports with reporter info
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_user_id_fkey(name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch entity details for each report
      const reportsWithDetails = await Promise.all(
        (data || []).map(async (report) => {
          let entity_details = {};
          
          if (report.entity_type === 'event') {
            const { data: event } = await supabase
              .from('events')
              .select('title, description')
              .eq('id', report.entity_id)
              .single();
            entity_details = { title: event?.title, content: event?.description };
          } else if (report.entity_type === 'business') {
            const { data: business } = await supabase
              .from('businesses')
              .select('name, description')
              .eq('id', report.entity_id)
              .single();
            entity_details = { name: business?.name, content: business?.description };
          } else if (report.entity_type === 'discount') {
            const { data: discount } = await supabase
              .from('discounts')
              .select('title, description')
              .eq('id', report.entity_id)
              .single();
            entity_details = { title: discount?.title, content: discount?.description };
          }

          return {
            ...report,
            entity_details,
            reporter: report.reporter as { name: string | null; avatar_url: string | null } | undefined,
            status: report.status as ReportStatus,
            entity_type: report.entity_type as EntityType,
          } as Report;
        })
      );

      return reportsWithDetails;
    },
  });

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.status !== 'all' && report.status !== filters.status) return false;
      if (filters.entityType !== 'all' && report.entity_type !== filters.entityType) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesReason = report.reason.toLowerCase().includes(search);
        const matchesDescription = report.description?.toLowerCase().includes(search);
        const matchesReporter = report.reporter?.name?.toLowerCase().includes(search);
        if (!matchesReason && !matchesDescription && !matchesReporter) return false;
      }
      return true;
    });
  }, [reports, filters]);

  // Stats for quick overview
  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    underReview: reports.filter(r => r.status === 'under_review').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  }), [reports]);

  // Update report status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      adminNotes 
    }: { 
      reportId: string; 
      status: ReportStatus; 
      adminNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      // Log to audit
      await supabase.from('admin_audit_log').insert({
        admin_user_id: user?.id,
        action_type: `report_${status}`,
        entity_type: 'report',
        entity_id: reportId,
        new_value: { status, admin_notes: adminNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Report updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating report', description: error.message, variant: 'destructive' });
    },
  });

  // Delete reported content (for events/businesses)
  const deleteContentMutation = useMutation({
    mutationFn: async ({ report }: { report: Report }) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (report.entity_type === 'event') {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', report.entity_id);
        if (error) throw error;
      } else if (report.entity_type === 'business') {
        // For businesses, we might want to just unverify instead of delete
        const { error } = await supabase
          .from('businesses')
          .update({ verified: false })
          .eq('id', report.entity_id);
        if (error) throw error;
      }

      // Mark report as resolved
      await supabase
        .from('reports')
        .update({
          status: 'resolved',
          admin_notes: 'Content deleted/hidden by admin',
          reviewed_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      // Audit log
      await supabase.from('admin_audit_log').insert({
        admin_user_id: user?.id,
        action_type: 'content_deleted',
        entity_type: report.entity_type,
        entity_id: report.entity_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Content removed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error removing content', description: error.message, variant: 'destructive' });
    },
  });

  return {
    reports: filteredReports,
    allReports: reports,
    stats,
    isLoading,
    filters,
    setFilters,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    deleteContent: deleteContentMutation.mutate,
    isDeleting: deleteContentMutation.isPending,
  };
}
