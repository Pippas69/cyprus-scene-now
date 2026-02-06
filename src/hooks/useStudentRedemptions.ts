import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentRedemption {
  id: string;
  student_verification_id: string;
  business_id: string;
  scanned_by: string | null;
  original_price_cents: number;
  discounted_price_cents: number;
  discount_amount_cents: number;
  item_description: string | null;
  created_at: string;
  student?: {
    id: string;
    university_name: string;
    user: {
      name: string;
      avatar_url: string | null;
    };
  };
  business?: {
    name: string;
    logo_url: string | null;
  };
}

export function useStudentRedemptions(businessId?: string) {
  return useQuery({
    queryKey: ['student-redemptions', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('student_discount_redemptions')
        .select(`
          *,
          student:student_verifications(
            id,
            university_name,
            user:profiles!student_verifications_user_id_fkey(name, avatar_url)
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StudentRedemption[];
    },
    enabled: !!businessId,
  });
}

export function useMyStudentRedemptions(userId?: string) {
  return useQuery({
    queryKey: ['my-student-redemptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // First get user's verification
      const { data: verification } = await supabase
        .from('student_verifications')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .maybeSingle();
      
      if (!verification) return [];
      
      const { data, error } = await supabase
        .from('student_discount_redemptions')
        .select(`
          *,
          business:businesses(name, logo_url)
        `)
        .eq('student_verification_id', verification.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StudentRedemption[];
    },
    enabled: !!userId,
  });
}

export function useCreateStudentRedemption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      studentVerificationId,
      businessId,
      scannedBy,
      originalPriceCents,
      discountedPriceCents,
      itemDescription,
      redemptionId,
    }: {
      studentVerificationId: string;
      businessId: string;
      scannedBy?: string;
      originalPriceCents: number;
      discountedPriceCents: number;
      itemDescription?: string;
      redemptionId?: string;
    }) => {
      const payload = {
        scanned_by: scannedBy || null,
        original_price_cents: originalPriceCents,
        discounted_price_cents: discountedPriceCents,
        discount_amount_cents: originalPriceCents - discountedPriceCents,
        item_description: itemDescription || null,
      };

      // If a redemption already exists (created at scan-time), update it instead of inserting a new visit.
      if (redemptionId) {
        const { data, error } = await supabase
          .from('student_discount_redemptions')
          .update(payload)
          .eq('id', redemptionId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('student_discount_redemptions')
        .insert({
          student_verification_id: studentVerificationId,
          business_id: businessId,
          ...payload,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-redemptions', variables.businessId] });
      toast.success('Discount recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record discount');
      console.error(error);
    },
  });
}

export function useBusinessRedemptionStats(businessId?: string) {
  return useQuery({
    queryKey: ['student-redemption-stats', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('student_discount_redemptions')
        .select('discount_amount_cents')
        .eq('business_id', businessId)
        .gte('created_at', monthStart.toISOString());
      
      if (error) throw error;
      
      const totalRedemptions = data?.length || 0;
      const totalSubsidyCents = data?.reduce((sum, r) => sum + r.discount_amount_cents, 0) || 0;
      
      return {
        totalRedemptions,
        totalSubsidyCents,
      };
    },
    enabled: !!businessId,
  });
}
