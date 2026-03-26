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
  brought_by_user_id: string | null;
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
  brought_by_name: string | null;
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

      // Fetch guests + stats in parallel
      const [guestsRes, statsRes] = await Promise.all([
        supabase
          .from("crm_guests")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_crm_guest_stats", { p_business_id: businessId }),
      ]);

      if (guestsRes.error) throw guestsRes.error;
      if (statsRes.error) throw statsRes.error;

      const guests = guestsRes.data || [];
      if (guests.length === 0) return [];

      // Now fetch tag assignments for these guests
      const guestIds = guests.map((g) => g.id);
      // Fetch brought_by profile names for ghosts
      const broughtByIds = [...new Set(
        guests.filter((g: any) => g.brought_by_user_id).map((g: any) => g.brought_by_user_id as string)
      )];

      const [tagAssignmentsRes, notesDataRes, broughtByRes] = await Promise.all([
        supabase
          .from("crm_guest_tag_assignments")
          .select("guest_id, crm_guest_tags(id, name, color, emoji, is_system)")
          .in("guest_id", guestIds),
        supabase
          .from("crm_guest_notes")
          .select("guest_id")
          .eq("business_id", businessId),
        // Resolve booker names from crm_guests (same business) instead of profiles to avoid RLS issues
        broughtByIds.length > 0
          ? supabase.from("crm_guests").select("user_id, guest_name").eq("business_id", businessId).in("user_id", broughtByIds).eq("profile_type", "registered")
          : Promise.resolve({ data: [] as { user_id: string | null; guest_name: string }[] }),
      ]);

      const tagAssignments = tagAssignmentsRes.data;
      const notesData = notesDataRes.data;

      const broughtByNameMap = new Map<string, string>();
      if (broughtByRes.data) {
        for (const p of broughtByRes.data) {
          if (p.user_id) {
            broughtByNameMap.set(p.user_id, p.guest_name || "Unknown");
          }
        }
      }

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
        const broughtById = (g as any).brought_by_user_id as string | null;
        return {
          ...g,
          custom_fields: (g.custom_fields as Record<string, unknown>) || {},
          brought_by_user_id: broughtById || null,
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
          brought_by_name: broughtById ? (broughtByNameMap.get(broughtById) || null) : null,
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
      // Allowlist: only send columns that exist on crm_guests table
      const allowedKeys = [
        "guest_name", "phone", "email", "birthday", "anniversary",
        "dietary_preferences", "drink_preferences", "music_preferences",
        "company", "instagram_handle", "relationship_notes",
        "internal_rating", "vip_level_override",
        "allergies", "seating_preferences", "food_preferences",
      ];
      const dbUpdates: Record<string, unknown> = {};
      for (const key of allowedKeys) {
        if (key in updates) {
          dbUpdates[key] = updates[key];
        }
      }

      // If guest_name changed, propagate to reservation_guests for stats consistency
      if (dbUpdates.guest_name && businessId) {
        // Get the current name before updating
        const { data: currentGuest } = await supabase
          .from("crm_guests")
          .select("guest_name, business_id")
          .eq("id", id)
          .single();

        if (currentGuest && currentGuest.guest_name !== dbUpdates.guest_name) {
          await supabase.rpc("propagate_crm_guest_rename", {
            p_business_id: currentGuest.business_id,
            p_old_name: currentGuest.guest_name,
            p_new_name: dbUpdates.guest_name as string,
          });
        }
      }

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
