import { supabase } from '@/integrations/supabase/client';

export type ReactionType = 'like' | 'love' | 'fire' | 'laugh';

export function usePostReactions(userId: string | undefined) {
  const toggleReaction = async (postId: string, reactionType: ReactionType, currentReaction: string | null) => {
    if (!userId) return false;

    try {
      if (currentReaction === reactionType) {
        // Remove reaction
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
      } else if (currentReaction) {
        // Update reaction (delete old, insert new)
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          });

        if (error) throw error;
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return false;
    }
  };

  return { toggleReaction };
}
