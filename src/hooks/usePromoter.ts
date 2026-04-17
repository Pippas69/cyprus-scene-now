/**
 * Hook for Promoter (PR) functionality — Phase 1
 *
 * Provides:
 * - Status check: is the user an active PR for any business?
 * - List of PR applications by current user
 * - Mutations to apply / revoke applications
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Realtime: ακούει αλλαγές στον πίνακα promoter_applications για τον τρέχοντα
 * χρήστη και κάνει invalidate τα queries ώστε το UI να ενημερώνεται άμεσα
 * μόλις ο επιχειρηματίας εγκρίνει/απορρίψει το αίτημα.
 */
export const usePromoterApplicationsRealtime = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`promoter-applications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promoter_applications',
          filter: `promoter_user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['promoter-applications', userId] });
          queryClient.invalidateQueries({ queryKey: ['is-active-promoter', userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};

export type PromoterApplicationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type PromoterCommissionType = 'fixed' | 'percent';

export interface PromoterApplication {
  id: string;
  promoter_user_id: string;
  business_id: string;
  status: PromoterApplicationStatus;
  message: string | null;
  commission_type: PromoterCommissionType | null;
  commission_fixed_ticket_cents: number | null;
  commission_fixed_reservation_cents: number | null;
  commission_percent: number | null;
  decided_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  business?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string;
    category: string[];
  };
}

/**
 * Fetch current user's PR applications (with business info).
 */
export const usePromoterApplications = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['promoter-applications', userId],
    queryFn: async () => {
      if (!userId) return [] as PromoterApplication[];

      const { data, error } = await supabase
        .from('promoter_applications')
        .select(
          `
          *,
          business:businesses!promoter_applications_business_id_fkey (
            id, name, logo_url, city, category
          )
        `
        )
        .eq('promoter_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PromoterApplication[];
    },
    enabled: !!userId,
  });
};

/**
 * Returns true if the user has at least one accepted PR application.
 */
export const useIsActivePromoter = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['is-active-promoter', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { count, error } = await supabase
        .from('promoter_applications')
        .select('id', { count: 'exact', head: true })
        .eq('promoter_user_id', userId)
        .eq('status', 'accepted');
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!userId,
  });
};

/**
 * Apply to become a PR for a specific business.
 */
export const useApplyAsPromoter = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, message }: { businessId: string; message?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('promoter_applications')
        .insert({
          promoter_user_id: userId,
          business_id: businessId,
          message: message || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoter-applications', userId] });
      queryClient.invalidateQueries({ queryKey: ['is-active-promoter', userId] });
    },
    onError: (err: any) => {
      const msg = err?.message?.includes('duplicate')
        ? 'Έχεις ήδη στείλει αίτημα σε αυτή την επιχείρηση.'
        : err?.message || 'Σφάλμα κατά την αποστολή του αιτήματος.';
      toast({ title: 'Σφάλμα', description: msg, variant: 'destructive' });
    },
  });
};

/**
 * Revoke (delete) a pending PR application.
 */
export const useRevokePromoterApplication = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('promoter_applications')
        .delete()
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoter-applications', userId] });
      queryClient.invalidateQueries({ queryKey: ['is-active-promoter', userId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Σφάλμα',
        description: err?.message || 'Δεν ήταν δυνατή η ακύρωση.',
        variant: 'destructive',
      });
    },
  });
};
