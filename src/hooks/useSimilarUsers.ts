import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface SimilarUser {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
  similarity_score: number;
  connection_status: string | null;
}

export const useSimilarUsers = (userId: string | undefined, limit: number = 10) => {
  return useQuery({
    queryKey: ['similar-users', userId, limit],
    queryFn: async (): Promise<SimilarUser[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_similar_users', {
        target_user_id: userId,
        limit_count: limit
      });

      if (error) {
        console.error('Error fetching similar users:', error);
        throw error;
      }
      
      return (data || []) as SimilarUser[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

interface EventAttendeeWithSimilarity {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  interests: string[] | null;
  rsvp_status: string;
  similarity_score: number;
  connection_status: string | null;
}

export const useEventAttendeesWithSimilarity = (eventId: string, currentUserId: string | undefined) => {
  return useQuery({
    queryKey: ['event-attendees-similarity', eventId, currentUserId],
    queryFn: async (): Promise<EventAttendeeWithSimilarity[]> => {
      const { data, error } = await supabase.rpc('get_event_attendees_with_similarity', {
        event_id_param: eventId,
        current_user_id: currentUserId || null
      });

      if (error) {
        console.error('Error fetching event attendees with similarity:', error);
        throw error;
      }
      
      return (data || []) as EventAttendeeWithSimilarity[];
    },
    enabled: !!eventId,
  });
};
