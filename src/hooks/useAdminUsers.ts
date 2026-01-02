import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: 'user' | 'business' | 'admin';
  created_at: string;
  updated_at: string;
  suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  has_business: boolean;
  business_name: string | null;
  business_id: string | null;
}

interface UseAdminUsersOptions {
  search?: string;
  role?: string;
  city?: string;
  suspended?: boolean | null;
  page?: number;
  pageSize?: number;
}

export const useAdminUsers = (options: UseAdminUsersOptions = {}) => {
  const { search = '', role = '', city = '', suspended = null, page = 1, pageSize = 20 } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', search, role, city, suspended, page, pageSize],
    queryFn: async () => {
      // Build query for profiles with business info
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          name,
          city,
          avatar_url,
          role,
          created_at,
          updated_at,
          suspended,
          suspended_at,
          suspension_reason
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,name.ilike.%${search}%`);
      }
      
      if (role && role !== 'all') {
        query = query.eq('role', role as 'user' | 'business' | 'admin');
      }
      
      if (city) {
        query = query.eq('city', city);
      }
      
      if (suspended !== null) {
        query = query.eq('suspended', suspended);
      }

      const { data: profiles, error: profilesError, count } = await query;
      
      if (profilesError) throw profilesError;

      // Get businesses for these users
      const userIds = profiles?.map(p => p.id) || [];
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, user_id, name')
        .in('user_id', userIds);

      // Merge business info
      const usersWithBusiness: AdminUser[] = (profiles || []).map(profile => {
        const business = businesses?.find(b => b.user_id === profile.id);
        return {
          ...profile,
          has_business: !!business,
          business_name: business?.name || null,
          business_id: business?.id || null,
        };
      });

      return {
        users: usersWithBusiness,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });

  // Get unique cities for filter dropdown
  const { data: cities } = useQuery({
    queryKey: ['admin-users-cities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('city')
        .not('city', 'is', null)
        .order('city');
      
      const uniqueCities = [...new Set(data?.map(p => p.city).filter(Boolean))];
      return uniqueCities as string[];
    },
  });

  // Suspend user mutation
  const suspendUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('admin_set_user_suspension', {
        target_user_id: userId,
        is_suspended: true,
        reason,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User suspended successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to suspend user: ${error.message}`);
    },
  });

  // Unsuspend user mutation
  const unsuspendUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('admin_set_user_suspension', {
        target_user_id: userId,
        is_suspended: false,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User unsuspended successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unsuspend user: ${error.message}`);
    },
  });

  // Get user activity stats
  const getUserStats = async (userId: string) => {
    const [rsvps, favorites, reservations, redemptions] = await Promise.all([
      supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('redemptions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    return {
      rsvps: rsvps.count || 0,
      favorites: favorites.count || 0,
      reservations: reservations.count || 0,
      redemptions: redemptions.count || 0,
    };
  };

  return {
    users: data?.users || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refetch,
    cities: cities || [],
    suspendUser,
    unsuspendUser,
    getUserStats,
  };
};

export const useExportUsers = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          name,
          city,
          role,
          created_at,
          suspended
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Display Name', 'City', 'Role', 'Created At', 'Suspended'];
      const rows = data.map(user => [
        user.id,
        user.email || '',
        user.first_name || '',
        user.last_name || '',
        user.name || '',
        user.city || '',
        user.role,
        new Date(user.created_at).toLocaleDateString(),
        user.suspended ? 'Yes' : 'No',
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success('Users exported successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to export users: ${error.message}`);
    },
  });
};
