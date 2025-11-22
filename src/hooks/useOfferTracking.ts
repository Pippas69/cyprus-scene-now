import { useEffect } from 'react';
import { trackDiscountView } from '@/lib/analyticsTracking';

interface UseOfferTrackingOptions {
  offerId: string;
  source: 'feed' | 'event' | 'profile' | 'direct';
  enabled?: boolean;
}

export const useOfferTracking = ({ 
  offerId, 
  source, 
  enabled = true 
}: UseOfferTrackingOptions) => {
  useEffect(() => {
    if (!enabled || !offerId) return;

    // Track view once when component mounts
    trackDiscountView(offerId, source);
  }, [offerId, source, enabled]);
};
