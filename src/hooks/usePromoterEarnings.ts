/**
 * Hook για τα earnings (attributions) ενός PR.
 * Επιστρέφει αναλυτικές γραμμές + aggregated totals (συνολικά clicks, πωλήσεις, κέρδη).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoterAttributionRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  event_id: string | null;
  event_title: string | null;
  business_name: string | null;
  order_amount_cents: number;
  commission_earned_cents: number;
  status: string;
  created_at: string;
}

export interface PromoterTotals {
  totalClicks: number;
  totalSales: number;
  totalEarningsCents: number;
}

export const usePromoterAttributions = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['promoter-attributions', userId],
    queryFn: async (): Promise<PromoterAttributionRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('promoter_attributions')
        .select(`
          id, customer_name, customer_email, event_id,
          order_amount_cents, commission_earned_cents, status, created_at,
          events:event_id ( title ),
          businesses:business_id ( name )
        `)
        .eq('promoter_user_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        event_id: r.event_id,
        event_title: r.events?.title || null,
        business_name: r.businesses?.name || null,
        order_amount_cents: r.order_amount_cents || 0,
        commission_earned_cents: r.commission_earned_cents || 0,
        status: r.status,
        created_at: r.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const usePromoterTotals = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['promoter-totals', userId],
    queryFn: async (): Promise<PromoterTotals> => {
      if (!userId) return { totalClicks: 0, totalSales: 0, totalEarningsCents: 0 };

      // Sum clicks/conversions από links
      const { data: links, error: linksErr } = await supabase
        .from('promoter_links')
        .select('clicks_count, conversions_count')
        .eq('promoter_user_id', userId);
      if (linksErr) throw linksErr;

      const totalClicks = (links || []).reduce((s, l) => s + (l.clicks_count || 0), 0);
      const totalSales = (links || []).reduce((s, l) => s + (l.conversions_count || 0), 0);

      // Sum earnings από attributions (όχι cancelled)
      const { data: attrs, error: attrsErr } = await supabase
        .from('promoter_attributions')
        .select('commission_earned_cents')
        .eq('promoter_user_id', userId)
        .neq('status', 'cancelled');
      if (attrsErr) throw attrsErr;

      const totalEarningsCents = (attrs || []).reduce(
        (s, a) => s + (a.commission_earned_cents || 0),
        0,
      );

      return { totalClicks, totalSales, totalEarningsCents };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
