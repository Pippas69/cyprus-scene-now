import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmGuest {
  id: string;
  business_id: string;
  user_id: string | null;
  guest_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  anniversary: string | null;
  dietary_preferences: string[] | null;
  drink_preferences: string | null;
  music_preferences: string | null;
  company: string | null;
  instagram_handle: string | null;
  relationship_notes: string | null;
  internal_rating: number | null;
  vip_level_override: string | null;
  profile_type: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Computed stats
  total_visits: number;
  total_spend_cents: number;
  total_no_shows: number;
  total_cancellations: number;
  first_visit: string | null;
  last_visit: string | null;
  avg_party_size: number;
  favorite_table: string | null;
  total_reservations: number;
  // Joined data
  tags: CrmGuestTag[];
  notes_count: number;
}

export interface CrmGuestTag {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  is_system: boolean;
}

export interface CrmGuestNote {
  id: string;
  guest_id: string;
  author_id: string;
  content: string;
  category: string;
  is_pinned: boolean;
  is_private: boolean;
  is_alert: boolean;
  created_at: string;
  updated_at: string;
}

export function useCrmGuests(businessId: string | null) {
  const queryClient = useQueryClient();

  const guestsQuery = useQuery({
    queryKey: ["crm-guests", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      if (!businessId) return [];

      // Fetch guests + their tag assignments + stats in parallel
      const [guestsRes, statsRes, tagAssignRes] = await Promise.all([
        supabase
          .from("crm_guests")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_crm_guest_stats", { p_business_id: businessId }),
        supabase
          .from("crm_guest_tag_assignments")
          .select("guest_id, crm_guest_tags(id, name, color, emoji, is_system)")
          .in(
            "guest_id",
            [] // will be populated after
          ),
      ]);

      if (guestsRes.error) throw guestsRes.error;
      const guests = guestsRes.data || [];
      if (guests.length === 0) return [];

      // Now fetch tag assignments for these guests
      const guestIds = guests.map((g) => g.id);
      const { data: tagAssignments } = await supabase
        .from("crm_guest_tag_assignments")
        .select("guest_id, crm_guest_tags(id, name, color, emoji, is_system)")
        .in("guest_id", guestIds);

      // Fetch notes count per guest
      const { data: notesData } = await supabase
        .from("crm_guest_notes")
        .select("guest_id")
        .eq("business_id", businessId);

      const statsMap = new Map<string, Record<string, unknown>>();
      if (statsRes.data) {
        for (const s of statsRes.data) {
          statsMap.set(s.guest_id, s);
        }
      }

      const tagMap = new Map<string, CrmGuestTag[]>();
      if (tagAssignments) {
        for (const ta of tagAssignments) {
          const tag = ta.crm_guest_tags as unknown as CrmGuestTag;
          if (!tag) continue;
          const existing = tagMap.get(ta.guest_id) || [];
          existing.push(tag);
          tagMap.set(ta.guest_id, existing);
        }
      }

      const notesCountMap = new Map<string, number>();
      if (notesData) {
        for (const n of notesData) {
          notesCountMap.set(n.guest_id, (notesCountMap.get(n.guest_id) || 0) + 1);
        }
      }

      return guests.map((g): CrmGuest => {
        const stats = statsMap.get(g.id) || {};
        return {
          ...g,
          custom_fields: (g.custom_fields as Record<string, unknown>) || {},
          total_visits: Number(stats.total_visits || 0),
          total_spend_cents: Number(stats.total_spend_cents || 0),
          total_no_shows: Number(stats.total_no_shows || 0),
          total_cancellations: Number(stats.total_cancellations || 0),
          first_visit: (stats.first_visit as string) || null,
          last_visit: (stats.last_visit as string) || null,
          avg_party_size: Number(stats.avg_party_size || 0),
          favorite_table: (stats.favorite_table as string) || null,
          total_reservations: Number(stats.total_reservations || 0),
          tags: tagMap.get(g.id) || [],
          notes_count: notesCountMap.get(g.id) || 0,
        };
      });
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (guest: {
      business_id: string;
      guest_name: string;
      phone?: string;
      email?: string;
      profile_type?: string;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("crm_guests")
        .insert(guest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-guests", businessId] });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { tags, notes_count, total_visits, total_spend_cents, total_no_shows, total_cancellations, first_visit, last_visit, avg_party_size, favorite_table, total_reservations, ...dbUpdates } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("crm_guests")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-guests", businessId] });
    },
  });

  return {
    guests: guestsQuery.data || [],
    isLoading: guestsQuery.isLoading,
    error: guestsQuery.error,
    addGuest: addGuestMutation.mutateAsync,
    updateGuest: updateGuestMutation.mutateAsync,
    refetch: guestsQuery.refetch,
  };
}

export function useCrmGuestNotes(guestId: string | null, businessId: string | null) {
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["crm-guest-notes", guestId],
    enabled: !!guestId && !!businessId,
    queryFn: async () => {
      if (!guestId || !businessId) return [];
      const { data, error } = await supabase
        .from("crm_guest_notes")
        .select("*")
        .eq("guest_id", guestId)
        .eq("business_id", businessId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmGuestNote[];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: {
      guest_id: string;
      business_id: string;
      author_id: string;
      content: string;
      category?: string;
      is_pinned?: boolean;
      is_alert?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("crm_guest_notes")
        .insert(note)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-guest-notes", guestId] });
      queryClient.invalidateQueries({ queryKey: ["crm-guests"] });
    },
  });

  return {
    notes: notesQuery.data || [],
    isLoading: notesQuery.isLoading,
    addNote: addNoteMutation.mutateAsync,
  };
}
