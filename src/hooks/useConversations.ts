import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_participant: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
}

export const useConversations = () => {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all conversations the user participates in
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map(p => p.conversation_id);
      const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]));

      // Get conversation details
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      if (!conversations?.length) return [];

      // Get other participants for each conversation
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id);

      if (allPartError) throw allPartError;

      const otherParticipantMap = new Map<string, string>();
      allParticipants?.forEach(p => {
        otherParticipantMap.set(p.conversation_id, p.user_id);
      });

      // Get profiles for other participants
      const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', otherUserIds);

      if (profError) throw profError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get last message for each conversation
      const { data: messages, error: msgError } = await supabase
        .from('direct_messages')
        .select('conversation_id, body, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      const lastMessageMap = new Map<string, typeof messages[0]>();
      messages?.forEach(m => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, m);
        }
      });

      // Count unread messages per conversation
      const unreadCountMap = new Map<string, number>();
      messages?.forEach(m => {
        const lastRead = lastReadMap.get(m.conversation_id);
        if (m.sender_id !== user.id && new Date(m.created_at) > new Date(lastRead || '1970-01-01')) {
          unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) || 0) + 1);
        }
      });

      return conversations.map(conv => {
        const otherUserId = otherParticipantMap.get(conv.id);
        const profile = otherUserId ? profileMap.get(otherUserId) : null;
        const lastMessage = lastMessageMap.get(conv.id);

        return {
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          other_participant: {
            id: otherUserId || '',
            name: profile?.name || null,
            avatar_url: profile?.avatar_url || null,
          },
          last_message: lastMessage ? {
            body: lastMessage.body,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id,
          } : null,
          unread_count: unreadCountMap.get(conv.id) || 0,
        };
      });
    },
  });
};

export const useStartConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};
