import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventPricingDisplay {
  stripeFeeBearer: 'buyer' | 'business';
  showProcessingFee: boolean;
  showPlatformFee: boolean;
  platformFeeLabel: string;
  revenueModel: 'commission' | 'fixed_fee' | null;
  fixedFeeBearer: 'buyer' | 'business';
  fixedFeeTicketCents: number;
  fixedFeeReservationCents: number;
  fixedFeeHybridTicketCents: number;
  fixedFeeHybridReservationCents: number;
}

const DEFAULT_DISPLAY: EventPricingDisplay = {
  stripeFeeBearer: 'buyer',
  showProcessingFee: true,
  showPlatformFee: false,
  platformFeeLabel: '',
  revenueModel: null,
  fixedFeeBearer: 'business',
  fixedFeeTicketCents: 0,
  fixedFeeReservationCents: 0,
  fixedFeeHybridTicketCents: 0,
  fixedFeeHybridReservationCents: 0,
};

/**
 * Fetch pricing display info for an event's business.
 * Used by checkout components to determine which fee lines to show.
 */
export const useEventPricingProfile = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['event-pricing-display', businessId],
    queryFn: async (): Promise<EventPricingDisplay> => {
      if (!businessId) return DEFAULT_DISPLAY;

      const { data, error } = await supabase
        .from('business_pricing_profiles')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error || !data) return DEFAULT_DISPLAY;

      const stripeFeeBearer = data.stripe_fee_bearer as 'buyer' | 'business';
      const revenueEnabled = data.platform_revenue_enabled;
      const revenueModel = revenueEnabled ? (data.revenue_model as 'commission' | 'fixed_fee') : null;
      const fixedFeeBearer = data.fixed_fee_bearer as 'buyer' | 'business';

      // Show processing fee line only if buyer pays Stripe fees
      const showProcessingFee = stripeFeeBearer === 'buyer';

      // Show platform fee line only if fixed_fee model AND buyer pays
      const showPlatformFee = revenueModel === 'fixed_fee' && fixedFeeBearer === 'buyer';

      return {
        stripeFeeBearer,
        showProcessingFee,
        showPlatformFee,
        platformFeeLabel: showPlatformFee ? 'Χρέωση υπηρεσίας' : '',
        revenueModel,
        fixedFeeBearer,
        fixedFeeTicketCents: data.fixed_fee_ticket_cents || 0,
        fixedFeeReservationCents: data.fixed_fee_reservation_cents || 0,
        fixedFeeHybridTicketCents: data.fixed_fee_hybrid_ticket_cents || 0,
        fixedFeeHybridReservationCents: data.fixed_fee_hybrid_reservation_cents || 0,
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
};
