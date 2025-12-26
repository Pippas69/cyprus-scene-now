import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PostType = 'announcement' | 'photo' | 'video' | 'poll' | 'behind_the_scenes' | 'story';
export type PostVisibility = 'public' | 'followers' | 'private';

export interface BusinessPost {
  id: string;
  business_id: string;
  post_type: PostType;
  content: string | null;
  media_urls: string[];
  visibility: PostVisibility;
  is_pinned: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  hashtags: string[];
  poll_question: string | null;
  poll_options: { text: string }[];
  poll_ends_at: string | null;
  poll_multiple_choice: boolean;
  views_count: number;
  likes_count: number;
  shares_count: number;
  created_at: string;
}

export interface CreatePostData {
  business_id: string;
  post_type: PostType;
  content?: string;
  media_urls?: string[];
  visibility?: PostVisibility;
  scheduled_at?: string;
  expires_at?: string;
  hashtags?: string[];
  poll_question?: string;
  poll_options?: { text: string }[];
  poll_ends_at?: string;
  poll_multiple_choice?: boolean;
}

export function useBusinessPosts(businessId: string | null) {
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['business-posts', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('business_posts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BusinessPost[];
    },
    enabled: !!businessId,
  });

  const createPost = useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const { data, error } = await supabase
        .from('business_posts')
        .insert({
          ...postData,
          published_at: postData.scheduled_at ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-posts', businessId] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('business_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-posts', businessId] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('business_posts')
        .update({ is_pinned: isPinned })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-posts', businessId] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
    createPost,
    deletePost,
    togglePin,
  };
}
