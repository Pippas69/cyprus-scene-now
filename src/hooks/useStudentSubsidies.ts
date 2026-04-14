import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentSubsidyInvoice {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  total_redemptions: number;
  total_subsidy_cents: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
  created_at: string;
  business?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function useStudentSubsidyInvoices(status?: string) {
  return useQuery({
    queryKey: ['student-subsidy-invoices', status],
    queryFn: async () => {
      let query = supabase
        .from('student_subsidy_invoices')
        .select(`
          *,
          business:businesses(id, name, logo_url)
        `)
        .order('period_end', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StudentSubsidyInvoice[];
    },
  });
}

export function useBusinessSubsidyInvoices(businessId?: string) {
  return useQuery({
    queryKey: ['business-subsidy-invoices', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('student_subsidy_invoices')
        .select('*')
        .eq('business_id', businessId)
        .order('period_end', { ascending: false });
      
      if (error) throw error;
      return data as StudentSubsidyInvoice[];
    },
    enabled: !!businessId,
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('student_subsidy_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-subsidy-invoices'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error) => {
      toast.error('Failed to update invoice');
      console.error(error);
    },
  });
}

export function useGenerateMonthlyInvoices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Get all redemptions from last month grouped by business
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('student_discount_redemptions')
        .select('business_id, discount_amount_cents')
        .gte('created_at', lastMonth.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());
      
      if (redemptionsError) throw redemptionsError;
      
      // Group by business
      const businessTotals = new Map<string, { count: number; total: number }>();
      for (const r of redemptions || []) {
        const existing = businessTotals.get(r.business_id) || { count: 0, total: 0 };
        businessTotals.set(r.business_id, {
          count: existing.count + 1,
          total: existing.total + r.discount_amount_cents,
        });
      }
      
      // Create invoices
      const invoices = Array.from(businessTotals.entries()).map(([businessId, stats]) => ({
        business_id: businessId,
        period_start: lastMonth.toISOString().split('T')[0],
        period_end: lastMonthEnd.toISOString().split('T')[0],
        total_redemptions: stats.count,
        total_subsidy_cents: stats.total,
        status: 'pending' as const,
      }));
      
      if (invoices.length > 0) {
        const { error } = await supabase
          .from('student_subsidy_invoices')
          .insert(invoices);
        
        if (error) throw error;
      }
      
      return invoices.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['student-subsidy-invoices'] });
      toast.success(`Generated ${count} invoice(s)`);
    },
    onError: (error) => {
      toast.error('Failed to generate invoices');
      console.error(error);
    },
  });
}
