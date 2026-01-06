import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentDiscountPartner {
  id: string;
  business_id: string;
  discount_percent: number;
  is_active: boolean;
  joined_at: string;
  notes: string | null;
  created_at: string;
  business?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string;
  };
}

export function useStudentPartner(businessId?: string) {
  return useQuery({
    queryKey: ['student-partner', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from('student_discount_partners')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      
      if (error) throw error;
      return data as StudentDiscountPartner | null;
    },
    enabled: !!businessId,
  });
}

export function useAllStudentPartners() {
  return useQuery({
    queryKey: ['student-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_discount_partners')
        .select(`
          *,
          business:businesses(id, name, logo_url, city)
        `)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data as StudentDiscountPartner[];
    },
  });
}

export function useCreateStudentPartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      businessId, 
      discountPercent, 
      notes 
    }: { 
      businessId: string; 
      discountPercent: number; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('student_discount_partners')
        .insert({
          business_id: businessId,
          discount_percent: discountPercent,
          notes: notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-partners'] });
      toast.success('Partner added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add partner');
      console.error(error);
    },
  });
}

export function useUpdateStudentPartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      partnerId, 
      discountPercent, 
      isActive, 
      notes 
    }: { 
      partnerId: string; 
      discountPercent?: number; 
      isActive?: boolean; 
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (discountPercent !== undefined) updates.discount_percent = discountPercent;
      if (isActive !== undefined) updates.is_active = isActive;
      if (notes !== undefined) updates.notes = notes;
      
      const { error } = await supabase
        .from('student_discount_partners')
        .update(updates)
        .eq('id', partnerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-partners'] });
      toast.success('Partner updated');
    },
    onError: (error) => {
      toast.error('Failed to update partner');
      console.error(error);
    },
  });
}

export function useDeleteStudentPartner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from('student_discount_partners')
        .delete()
        .eq('id', partnerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-partners'] });
      toast.success('Partner removed');
    },
    onError: (error) => {
      toast.error('Failed to remove partner');
      console.error(error);
    },
  });
}
