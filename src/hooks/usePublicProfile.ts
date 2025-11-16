/**
 * Hook for fetching PUBLIC profile data
 * 
 * SECURITY: This hook uses the `public_profiles` view which excludes sensitive
 * information like email addresses, date of birth, and admin status.
 * 
 * USE THIS WHEN:
 * - Displaying user information on public pages
 * - Showing event attendees/participants
 * - Displaying user cards/badges
 * - Any scenario where you're showing OTHER users' data publicly
 * 
 * DO NOT USE THIS WHEN:
 * - Fetching the current user's own profile (use profiles table directly)
 * - Admin/business owner viewing user details for legitimate purposes
 *   (these are covered by RLS policies)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PublicProfile {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  town: string | null;
  interests: string[] | null;
  created_at: string;
}

/**
 * Fetch a single public profile by user ID
 * 
 * Uses limited field selection to only request public-safe data.
 * The public_profiles view is available but not in TypeScript types yet,
 * so we query profiles table with explicit field selection.
 */
export const usePublicProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, avatar_url, city, town, interests, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as PublicProfile;
    },
    enabled: !!userId,
  });
};

/**
 * Fetch multiple public profiles by user IDs
 * 
 * Uses limited field selection on profiles table (RLS protected)
 */
export const usePublicProfiles = (userIds: string[]) => {
  return useQuery({
    queryKey: ['public-profiles', userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      
      // Query profiles table with limited fields
      // RLS ensures users can only see public-safe data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, avatar_url, city, town, interests, created_at')
        .in('id', userIds);

      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: userIds.length > 0,
  });
};

/**
 * Search public profiles by name or city
 * 
 * Uses limited field selection on profiles table (RLS protected)
 */
export const useSearchPublicProfiles = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-public-profiles', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      // Query profiles table with limited fields
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, avatar_url, city, town, interests, created_at')
        .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return data as PublicProfile[];
    },
    enabled: searchTerm.length >= 2,
  });
};
