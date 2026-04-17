/**
 * Hooks για τα tracking links του Promoter.
 * - Λίστα ενεργών events ανά εγκεκριμένη συνεργασία
 * - Δημιουργία / ανάκτηση μοναδικού link ανά (promoter, event)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PromoterLink {
  id: string;
  promoter_user_id: string;
  business_id: string;
  event_id: string | null;
  tracking_code: string;
  clicks_count: number;
  conversions_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoterEventItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  cover_image_url: string | null;
  location: string;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  link?: PromoterLink | null;
}

/**
 * Επιστρέφει όλα τα ενεργά / μελλοντικά events των επιχειρήσεων για τις οποίες
 * ο χρήστης έχει εγκεκριμένη συνεργασία ως PR, μαζί με τυχόν ήδη υπάρχον link.
 */
export const usePromoterEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['promoter-events', userId],
    queryFn: async (): Promise<PromoterEventItem[]> => {
      if (!userId) return [];

      // 1. Βρες accepted businesses
      const { data: apps, error: appsErr } = await supabase
        .from('promoter_applications')
        .select('business_id')
        .eq('promoter_user_id', userId)
        .eq('status', 'accepted');
      if (appsErr) throw appsErr;
      const businessIds = (apps || []).map((a) => a.business_id);
      if (businessIds.length === 0) return [];

      // 2. Φέρε events αυτών των businesses (μελλοντικά / σε εξέλιξη)
      const nowIso = new Date().toISOString();
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select(
          `
          id, title, start_at, end_at, cover_image_url, location, business_id,
          businesses!events_business_id_fkey ( id, name, logo_url )
        `,
        )
        .in('business_id', businessIds)
        .gte('end_at', nowIso)
        .order('start_at', { ascending: true });
      if (evErr) throw evErr;

      // 3. Φέρε υπάρχοντα links του χρήστη
      const eventIds = (events || []).map((e: any) => e.id);
      let links: PromoterLink[] = [];
      if (eventIds.length > 0) {
        const { data: linksData, error: linksErr } = await supabase
          .from('promoter_links')
          .select('*')
          .eq('promoter_user_id', userId)
          .in('event_id', eventIds);
        if (linksErr) throw linksErr;
        links = (linksData || []) as PromoterLink[];
      }

      return (events || []).map((e: any) => {
        const link = links.find((l) => l.event_id === e.id) || null;
        return {
          id: e.id,
          title: e.title,
          start_at: e.start_at,
          end_at: e.end_at,
          cover_image_url: e.cover_image_url,
          location: e.location,
          business_id: e.business_id,
          business_name: e.businesses?.name || '',
          business_logo: e.businesses?.logo_url || null,
          link,
        } as PromoterEventItem;
      });
    },
    enabled: !!userId,
  });
};

/**
 * Δημιουργεί (ή επιστρέφει υπάρχον) tracking link για συγκεκριμένο event.
 * Ο tracking_code παράγεται server-side μέσω της RPC `generate_promoter_tracking_code`.
 */
export const useCreatePromoterLink = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId,
      eventId,
    }: {
      businessId: string;
      eventId: string;
    }): Promise<PromoterLink> => {
      if (!userId) throw new Error('Not authenticated');

      // Έλεγχος αν υπάρχει ήδη
      const { data: existing } = await supabase
        .from('promoter_links')
        .select('*')
        .eq('promoter_user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
      if (existing) return existing as PromoterLink;

      // Δημιούργησε νέο tracking code
      const { data: codeData, error: codeErr } = await supabase.rpc(
        'generate_promoter_tracking_code',
        { _promoter_user_id: userId },
      );
      if (codeErr) throw codeErr;
      const tracking_code = codeData as string;

      const { data, error } = await supabase
        .from('promoter_links')
        .insert({
          promoter_user_id: userId,
          business_id: businessId,
          event_id: eventId,
          tracking_code,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PromoterLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoter-events', userId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Σφάλμα',
        description: err?.message || 'Δεν ήταν δυνατή η δημιουργία του link.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Δημιουργεί το πλήρες public URL που θα μοιραστεί ο PR.
 */
export const buildPromoterShareUrl = (eventId: string, trackingCode: string) => {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://fomo.com.cy';
  return `${origin}/event/${eventId}?ref=${trackingCode}`;
};
