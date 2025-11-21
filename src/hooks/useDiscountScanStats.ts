import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiscountScanStats {
  discount_id: string;
  title: string;
  business_id: string;
  total_views: number;
  total_verifications: number;
  total_redemptions: number;
  total_scans: number;
  unique_scanners: number;
  last_scanned_at: string | null;
  scans_last_24h: number;
  scans_last_7d: number;
}

export const useDiscountScanStats = (businessId: string | undefined) => {
  const [stats, setStats] = useState<DiscountScanStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    fetchStats();
  }, [businessId]);

  const fetchStats = async () => {
    if (!businessId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('discount_scan_stats')
      .select('*')
      .eq('business_id', businessId)
      .order('total_scans', { ascending: false });

    if (error) {
      console.error('Error fetching scan stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load QR scan statistics',
        variant: 'destructive',
      });
    } else {
      setStats(data || []);
    }
    setLoading(false);
  };

  const trackScan = async (
    discountId: string,
    scanType: 'view' | 'verify' | 'redeem',
    success: boolean = true
  ) => {
    const { error } = await supabase.from('discount_scans').insert({
      discount_id: discountId,
      scan_type: scanType,
      success,
    });

    if (error) {
      console.error('Error tracking scan:', error);
    }
  };

  return {
    stats,
    loading,
    refetch: fetchStats,
    trackScan,
  };
};
