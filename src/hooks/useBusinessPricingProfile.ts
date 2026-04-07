import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FeeBearerType = 'buyer' | 'business';
export type RevenueModelType = 'commission' | 'fixed_fee';

export interface BusinessPricingProfile {
  id: string;
  business_id: string;
  stripe_fee_bearer: FeeBearerType;
  platform_revenue_enabled: boolean;
  revenue_model: RevenueModelType;
  commission_percent: number;
  fixed_fee_bearer: FeeBearerType;
  fixed_fee_ticket_cents: number;
  fixed_fee_reservation_cents: number;
  fixed_fee_hybrid_ticket_cents: number;
  fixed_fee_hybrid_reservation_cents: number;
  created_at: string;
  updated_at: string;
}

export const useBusinessPricingProfile = (businessId: string | null) => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['business-pricing-profile', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from('business_pricing_profiles')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data as BusinessPricingProfile | null;
    },
    enabled: !!businessId,
  });

  const upsertProfile = useMutation({
    mutationFn: async (updates: Partial<BusinessPricingProfile> & { business_id: string }) => {
      const { data: existing } = await supabase
        .from('business_pricing_profiles')
        .select('id')
        .eq('business_id', updates.business_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('business_pricing_profiles')
          .update(updates)
          .eq('business_id', updates.business_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_pricing_profiles')
          .insert({
            business_id: updates.business_id,
            stripe_fee_bearer: updates.stripe_fee_bearer || 'buyer',
            platform_revenue_enabled: updates.platform_revenue_enabled || false,
            revenue_model: updates.revenue_model || 'commission',
            commission_percent: updates.commission_percent || 0,
            fixed_fee_bearer: updates.fixed_fee_bearer || 'business',
            fixed_fee_ticket_cents: updates.fixed_fee_ticket_cents || 0,
            fixed_fee_reservation_cents: updates.fixed_fee_reservation_cents || 0,
            fixed_fee_hybrid_ticket_cents: updates.fixed_fee_hybrid_ticket_cents || 0,
            fixed_fee_hybrid_reservation_cents: updates.fixed_fee_hybrid_reservation_cents || 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-pricing-profile', variables.business_id] });
      toast.success('Ρυθμίσεις τιμολόγησης αποθηκεύτηκαν');
    },
    onError: (error: Error) => {
      toast.error(`Σφάλμα: ${error.message}`);
    },
  });

  return { profile, isLoading, upsertProfile };
};

// Bulk fetch for admin table
export const useAllBusinessPricingProfiles = (businessIds: string[]) => {
  return useQuery({
    queryKey: ['all-business-pricing-profiles', businessIds.sort().join(',')],
    queryFn: async () => {
      if (businessIds.length === 0) return {};
      const { data, error } = await supabase
        .from('business_pricing_profiles')
        .select('*')
        .in('business_id', businessIds);
      if (error) throw error;
      const map: Record<string, BusinessPricingProfile> = {};
      (data || []).forEach((p) => {
        map[p.business_id] = p as BusinessPricingProfile;
      });
      return map;
    },
    enabled: businessIds.length > 0,
  });
};
