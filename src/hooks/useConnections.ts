import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

interface ConnectionWithProfile extends Connection {
  requester_profile?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  receiver_profile?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
}

export const useConnections = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['connections', userId],
    queryFn: async () => {
      if (!userId) return { sent: [], received: [], accepted: [] };
      
      // Get all connections where user is involved
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) throw error;

      const connections = (data || []) as Connection[];
      
      return {
        sent: connections.filter(c => c.requester_id === userId && c.status === 'pending'),
        received: connections.filter(c => c.receiver_id === userId && c.status === 'pending'),
        accepted: connections.filter(c => c.status === 'accepted'),
        all: connections
      };
    },
    enabled: !!userId,
  });
};

export const useConnectionStatus = (userId: string | undefined, targetUserId: string | undefined) => {
  return useQuery({
    queryKey: ['connection-status', userId, targetUserId],
    queryFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return null;
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`and(requester_id.eq.${userId},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${userId})`)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      const connection = data as Connection;
      
      return {
        status: connection.status,
        isRequester: connection.requester_id === userId,
        connection
      };
    },
    enabled: !!userId && !!targetUserId && userId !== targetUserId,
  });
};

export const useSendConnectionRequest = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async ({ requesterId, receiverId }: { requesterId: string; receiverId: string }) => {
      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: requesterId,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['similar-users'] });
      toast.success(language === 'el' ? 'Το αίτημα σύνδεσης εστάλη!' : 'Connection request sent!');
    },
    onError: (error) => {
      console.error('Error sending connection request:', error);
      toast.error(language === 'el' ? 'Αποτυχία αποστολής αιτήματος' : 'Failed to send request');
    }
  });
};

export const useRespondToConnection = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async ({ connectionId, response }: { connectionId: string; response: 'accepted' | 'declined' }) => {
      const { data, error } = await supabase
        .from('user_connections')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['similar-users'] });
      
      if (variables.response === 'accepted') {
        toast.success(language === 'el' ? 'Η σύνδεση έγινε αποδεκτή!' : 'Connection accepted!');
      } else {
        toast.success(language === 'el' ? 'Το αίτημα απορρίφθηκε' : 'Request declined');
      }
    },
    onError: (error) => {
      console.error('Error responding to connection:', error);
      toast.error(language === 'el' ? 'Αποτυχία απάντησης' : 'Failed to respond');
    }
  });
};

export const useRemoveConnection = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['similar-users'] });
      toast.success(language === 'el' ? 'Η σύνδεση αφαιρέθηκε' : 'Connection removed');
    },
    onError: (error) => {
      console.error('Error removing connection:', error);
      toast.error(language === 'el' ? 'Αποτυχία αφαίρεσης σύνδεσης' : 'Failed to remove connection');
    }
  });
};
