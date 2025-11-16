/**
 * Hook for fetching the CURRENT USER'S complete profile
 * 
 * SECURITY: This hook uses the `profiles` table directly and is protected
 * by RLS policies that ensure users can only see their own complete profile
 * (including sensitive data like email).
 * 
 * USE THIS WHEN:
 * - Fetching the logged-in user's own profile
 * - Displaying user settings/account information
 * - Any scenario where the user needs to see their own email/sensitive data
 * 
 * DO NOT USE THIS WHEN:
 * - Displaying OTHER users' profiles publicly
 *   (use public_profiles view or usePublicProfile hook instead)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  city: string | null;
  town: string | null;
  interests: string[] | null;
  dob_month: number | null;
  dob_year: number | null;
  age: number | null;
  role: 'user' | 'business' | 'admin';
  is_admin: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the current user's complete profile
 */
export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
  });
};

/**
 * Update the current user's profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
};
