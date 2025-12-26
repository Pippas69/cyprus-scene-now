import { useEventPosts } from '@/hooks/useEventPosts';
import { usePostReactions, ReactionType } from '@/hooks/usePostReactions';
import { CreatePostForm } from './CreatePostForm';
import { EventPost } from './EventPost';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

interface LiveEventFeedProps {
  eventId: string;
  userId?: string;
  userAvatar?: string | null;
  userName?: string | null;
  language: 'el' | 'en';
}

export function LiveEventFeed({ 
  eventId, 
  userId, 
  userAvatar, 
  userName,
  language 
}: LiveEventFeedProps) {
  const { posts, loading, sending, sendPost, deletePost } = useEventPosts(eventId, userId);
  const { toggleReaction } = usePostReactions(userId);

  const t = {
    el: {
      emptyTitle: 'Δεν υπάρχουν δημοσιεύσεις ακόμα',
      emptyText: 'Γίνε ο πρώτος που θα μοιραστεί κάτι!',
    },
    en: {
      emptyTitle: 'No posts yet',
      emptyText: 'Be the first to share something!',
    },
  };

  const text = t[language];

  const handleReact = async (postId: string, type: ReactionType, currentReaction: string | null) => {
    await toggleReaction(postId, type, currentReaction);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Post Form */}
      {userId && (
        <CreatePostForm
          onSubmit={sendPost}
          sending={sending}
          userAvatar={userAvatar}
          userName={userName}
          language={language}
        />
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">{text.emptyTitle}</h3>
          <p className="text-muted-foreground">{text.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <EventPost
              key={post.id}
              post={post}
              currentUserId={userId}
              onDelete={deletePost}
              onReact={handleReact}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}
