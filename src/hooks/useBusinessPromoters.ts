/**
 * Hooks για διαχείριση Promoters από την πλευρά της επιχείρησης (Phase 2).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type {
  PromoterApplicationStatus,
  PromoterCommissionType,
} from './usePromoter';

interface PromoterProfilePreview {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  city?: string | null;
  email?: string | null;
}

export interface BusinessPromoterApplication {
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
  promoter?: {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    city: string | null;
    email?: string | null;
  } | null;
}

const attachPromoterProfiles = async (
  applications: BusinessPromoterApplication[],
): Promise<BusinessPromoterApplication[]> => {
  const promoterIds = [...new Set(applications.map((a) => a.promoter_user_id).filter(Boolean))];

  if (promoterIds.length === 0) {
    return applications.map((application) => ({ ...application, promoter: null }));
  }

  // Use SECURITY DEFINER RPC because RLS on `profiles` blocks businesses
  // from reading other users' rows. The RPC returns only promoters who
  // applied to a business owned by the current user.
  const businessId = applications[0]?.business_id;
  let promoters: Array<{
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    city: string | null;
    email: string | null;
  }> | null = null;

  if (businessId) {
    const { data, error } = await supabase.rpc(
      'get_promoter_applicants_for_business' as never,
      { _business_id: businessId } as never,
    );
    if (error) {
      console.warn('[promoters] failed to load promoter profiles via RPC', error);
    } else {
      promoters = (data as typeof promoters) ?? null;
    }
  }

  const promoterMap = new Map<string, BusinessPromoterApplication['promoter']>(
    (promoters || []).map((promoter) => [
      promoter.id,
      {
        id: promoter.id,
        name: promoter.name ?? null,
        first_name: promoter.first_name ?? null,
        last_name: promoter.last_name ?? null,
        avatar_url: promoter.avatar_url ?? null,
        city: promoter.city ?? null,
        email: (promoter as { email?: string | null }).email ?? null,
      },
    ]),
  );

  return applications.map((application) => ({
    ...application,
    promoter: promoterMap.get(application.promoter_user_id) ?? null,
  }));
};

/**
 * Όλες οι αιτήσεις PR για μια επιχείρηση (pending + accepted + declined + revoked).
 */
export const useBusinessPromoterApplications = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['business-promoter-applications', businessId],
    queryFn: async () => {
      if (!businessId) return [] as BusinessPromoterApplication[];

      const { data, error } = await supabase
        .from('promoter_applications')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return await attachPromoterProfiles((data || []) as BusinessPromoterApplication[]);
    },
    enabled: !!businessId,
  });
};

interface UpdateStatusPayload {
  applicationId: string;
  status: 'accepted' | 'declined' | 'revoked';
  declineReason?: string;
  /** Αμοιβές την ώρα του accept (προαιρετικά — μπορεί να οριστούν αργότερα). */
  commissionType?: PromoterCommissionType;
  commissionFixedTicketCents?: number;
  commissionFixedReservationCents?: number;
  commissionPercent?: number;
}

/**
 * Accept / Decline / Revoke μιας αίτησης + αυτόματη ειδοποίηση + email.
 */
export const useUpdatePromoterApplicationStatus = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateStatusPayload) => {
      const updateFields: Record<string, unknown> = {
        status: payload.status,
        decided_at: new Date().toISOString(),
      };

      if (payload.status === 'declined') {
        updateFields.decline_reason = payload.declineReason || null;
      }

      if (payload.status === 'accepted') {
        if (payload.commissionType) updateFields.commission_type = payload.commissionType;
        if (typeof payload.commissionFixedTicketCents === 'number') {
          updateFields.commission_fixed_ticket_cents = payload.commissionFixedTicketCents;
        }
        if (typeof payload.commissionFixedReservationCents === 'number') {
          updateFields.commission_fixed_reservation_cents = payload.commissionFixedReservationCents;
        }
        if (typeof payload.commissionPercent === 'number') {
          updateFields.commission_percent = payload.commissionPercent;
        }
      }

      let updateQuery = supabase
        .from('promoter_applications')
        .update(updateFields)
        .eq('id', payload.applicationId);

      if (businessId) {
        updateQuery = updateQuery.eq('business_id', businessId);
      }

      const { data, error } = await updateQuery
        .select('id, promoter_user_id, business_id')
        .single();

      if (error) throw error;

      const [promoterResult, businessResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, first_name, last_name, email')
          .eq('id', data.promoter_user_id)
          .maybeSingle(),
        supabase
          .from('businesses')
          .select('id, name')
          .eq('id', data.business_id)
          .maybeSingle(),
      ]);

      if (promoterResult.error) {
        console.warn('[promoters] failed to load promoter email/details', promoterResult.error);
      }

      if (businessResult.error) {
        console.warn('[promoters] failed to load business details', businessResult.error);
      }

      return {
        ...data,
        promoter: (promoterResult.data as PromoterProfilePreview | null) ?? null,
        business: businessResult.data ?? null,
      };
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-promoter-applications', businessId] });

      try {
        const promoterUserId: string | undefined = data?.promoter_user_id;
        const promoter = data?.promoter;
        const business = data?.business;

        if (promoterUserId && business) {
          const isAccepted = variables.status === 'accepted';
          const title = isAccepted
            ? 'Η αίτησή σου εγκρίθηκε! 🎉'
            : variables.status === 'declined'
              ? 'Η αίτησή σου απορρίφθηκε'
              : 'Η συνεργασία τερματίστηκε';
          const message = isAccepted
            ? `Είσαι πλέον επίσημος Promoter στην επιχείρηση "${business.name}".`
            : variables.status === 'declined'
              ? `Η αίτησή σου ως Promoter για την "${business.name}" απορρίφθηκε.${
                  variables.declineReason ? ` Λόγος: ${variables.declineReason}` : ''
                }`
              : `Η ιδιότητά σου ως Promoter στην "${business.name}" ανακλήθηκε.`;

          await supabase.from('notifications').insert({
            user_id: promoterUserId,
            title,
            message,
            type: isAccepted ? 'success' : 'info',
            entity_type: 'promoter_application',
            entity_id: data.id,
            deep_link: '/dashboard-user?tab=settings',
            event_type: `promoter_application_${variables.status}`,
          });

          if (variables.status === 'accepted' || variables.status === 'declined') {
            const recipientEmail = promoter?.email;
            if (recipientEmail) {
              const fullName =
                promoter?.name ||
                [promoter?.first_name, promoter?.last_name].filter(Boolean).join(' ') ||
                null;

              await supabase.functions.invoke('send-transactional-email', {
                body: {
                  templateName:
                    variables.status === 'accepted'
                      ? 'promoter-application-accepted'
                      : 'promoter-application-declined',
                  recipientEmail,
                  idempotencyKey: `promoter-${variables.status}-${data.id}`,
                  templateData: {
                    name: fullName,
                    businessName: business.name,
                    declineReason: variables.declineReason || null,
                  },
                },
              });
            }
          }
        }
      } catch (notifyErr) {
        console.warn('[promoter] notify/email failed', notifyErr);
      }

      toast({
        title:
          variables.status === 'accepted'
            ? 'Η αίτηση εγκρίθηκε'
            : variables.status === 'declined'
              ? 'Η αίτηση απορρίφθηκε'
              : 'Η συνεργασία τερματίστηκε',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Σφάλμα',
        description: err?.message || 'Δεν ήταν δυνατή η ενέργεια.',
        variant: 'destructive',
      });
    },
  });
};

interface UpdateCommissionPayload {
  applicationId: string;
  commissionType: PromoterCommissionType;
  commissionFixedTicketCents?: number;
  commissionFixedReservationCents?: number;
  commissionPercent?: number;
}

/**
 * Ενημέρωση ρύθμισης αμοιβής για ήδη εγκεκριμένο PR.
 */
export const useUpdatePromoterCommission = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateCommissionPayload) => {
      const { error } = await supabase
        .from('promoter_applications')
        .update({
          commission_type: payload.commissionType,
          commission_fixed_ticket_cents: payload.commissionFixedTicketCents ?? 0,
          commission_fixed_reservation_cents: payload.commissionFixedReservationCents ?? 0,
          commission_percent: payload.commissionPercent ?? 0,
        })
        .eq('id', payload.applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-promoter-applications', businessId] });
      toast({ title: 'Η αμοιβή ενημερώθηκε' });
    },
    onError: (err: any) => {
      toast({
        title: 'Σφάλμα',
        description: err?.message || 'Δεν ήταν δυνατή η ενημέρωση.',
        variant: 'destructive',
      });
    },
  });
};
