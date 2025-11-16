import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type UserPreferences = Tables<'user_preferences'>;
type UserPreferencesInsert = TablesInsert<'user_preferences'>;
type UserPreferencesUpdate = TablesUpdate<'user_preferences'>;

export const useUserPreferences = (userId: string) => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: insertError } = await supabase
            .from('user_preferences')
            .insert({ user_id: userId })
            .select()
            .single();

          if (insertError) throw insertError;
          return newPrefs;
        }
        throw error;
      }

      return data;
    },
    enabled: !!userId,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: UserPreferencesUpdate) => {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', userId] });
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};
