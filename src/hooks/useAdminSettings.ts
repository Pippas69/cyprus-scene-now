import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FeaturedContent {
  id: string;
  entity_type: 'event' | 'business';
  entity_id: string;
  start_date: string;
  end_date: string;
  weight: number | null;
  created_by: string | null;
  created_at: string;
  entity_name?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_name?: string;
}

export function useAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch featured content
  const { data: featuredContent = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['admin-featured-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_content')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Enrich with entity names
      const enriched = await Promise.all(
        (data || []).map(async (item) => {
          let entity_name = 'Unknown';
          
          if (item.entity_type === 'event') {
            const { data: event } = await supabase
              .from('events')
              .select('title')
              .eq('id', item.entity_id)
              .single();
            entity_name = event?.title || 'Unknown Event';
          } else if (item.entity_type === 'business') {
            const { data: business } = await supabase
              .from('businesses')
              .select('name')
              .eq('id', item.entity_id)
              .single();
            entity_name = business?.name || 'Unknown Business';
          }

          return { ...item, entity_name } as FeaturedContent;
        })
      );

      return enriched;
    },
  });

  // Add featured content
  const addFeaturedMutation = useMutation({
    mutationFn: async (content: Omit<FeaturedContent, 'id' | 'created_at' | 'entity_name'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('featured_content')
        .insert({
          ...content,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content added' });
    },
    onError: (error) => {
      toast({ title: 'Error adding featured content', description: error.message, variant: 'destructive' });
    },
  });

  // Remove featured content
  const removeFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('featured_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-content'] });
      toast({ title: 'Featured content removed' });
    },
    onError: (error) => {
      toast({ title: 'Error removing', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with admin names
      const adminIds = [...new Set((data || []).map(log => log.admin_user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', adminIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      return (data || []).map(log => ({
        ...log,
        admin_name: log.admin_user_id ? profileMap.get(log.admin_user_id) || 'Unknown' : 'System',
      })) as AuditLogEntry[];
    },
  });

  // Search events/businesses for featured content selection
  const searchEntities = async (type: 'event' | 'business', query: string) => {
    if (type === 'event') {
      const { data } = await supabase
        .from('events')
        .select('id, title')
        .ilike('title', `%${query}%`)
        .limit(10);
      return data?.map(e => ({ id: e.id, name: e.title })) || [];
    } else {
      const { data } = await supabase
        .from('businesses')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(10);
      return data?.map(b => ({ id: b.id, name: b.name })) || [];
    }
  };

  return {
    featuredContent,
    isLoadingFeatured,
    addFeatured: addFeaturedMutation.mutate,
    isAddingFeatured: addFeaturedMutation.isPending,
    removeFeatured: removeFeaturedMutation.mutate,
    isRemovingFeatured: removeFeaturedMutation.isPending,
    auditLogs,
    isLoadingAudit,
    searchEntities,
  };
}
