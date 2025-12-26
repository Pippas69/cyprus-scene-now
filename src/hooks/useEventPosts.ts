import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventPost {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  reactions: {
    like: number;
    love: number;
    fire: number;
    laugh: number;
  };
  userReaction: string | null;
}

export function useEventPosts(eventId: string | undefined, userId: string | undefined) {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!eventId) return;

    try {
      // Fetch posts with user profiles
      const { data: postsData, error: postsError } = await supabase
        .from('event_posts')
        .select(`
          *,
          profiles!event_posts_user_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch all reactions for these posts
      const postIds = postsData.map(p => p.id);
      const { data: reactionsData } = await supabase
        .from('post_reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      // Process posts with reaction counts
      const processedPosts: EventPost[] = postsData.map(post => {
        const postReactions = reactionsData?.filter(r => r.post_id === post.id) || [];
        
        const reactions = {
          like: postReactions.filter(r => r.reaction_type === 'like').length,
          love: postReactions.filter(r => r.reaction_type === 'love').length,
          fire: postReactions.filter(r => r.reaction_type === 'fire').length,
          laugh: postReactions.filter(r => r.reaction_type === 'laugh').length,
        };

        const userReaction = userId 
          ? postReactions.find(r => r.user_id === userId)?.reaction_type || null
          : null;

        return {
          ...post,
          profiles: post.profiles,
          reactions,
          userReaction,
        };
      });

      setPosts(processedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-posts-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_posts',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchPosts]);

  const sendPost = async (content: string, imageUrl?: string) => {
    if (!eventId || !userId || !content.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase
        .from('event_posts')
        .insert({
          event_id: eventId,
          user_id: userId,
          content: content.trim(),
          image_url: imageUrl || null,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending post:', error);
      return false;
    } finally {
      setSending(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('event_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  };

  return { posts, loading, sending, sendPost, deletePost, refetch: fetchPosts };
}
