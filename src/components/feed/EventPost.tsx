import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostReactions } from './PostReactions';
import { EventPost as EventPostType } from '@/hooks/useEventPosts';
import { ReactionType } from '@/hooks/usePostReactions';
import { User, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface EventPostProps {
  post: EventPostType;
  currentUserId?: string;
  onDelete: (postId: string) => Promise<boolean>;
  onReact: (postId: string, type: ReactionType, currentReaction: string | null) => void;
  language: 'el' | 'en';
}

export function EventPost({ post, currentUserId, onDelete, onReact, language }: EventPostProps) {
  const [deleting, setDeleting] = useState(false);
  
  const isOwner = currentUserId === post.user_id;
  const userName = [post.profiles.first_name, post.profiles.last_name]
    .filter(Boolean)
    .join(' ') || 'User';

  const t = {
    el: { delete: 'Διαγραφή' },
    en: { delete: 'Delete' },
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(post.id);
    setDeleting(false);
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: language === 'el' ? el : enUS,
  });

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={post.profiles.avatar_url || ''} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{userName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t[language].delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img 
            src={post.image_url} 
            alt="" 
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Reactions */}
      <PostReactions
        reactions={post.reactions}
        userReaction={post.userReaction}
        onReact={(type) => onReact(post.id, type, post.userReaction)}
        disabled={!currentUserId}
      />
    </div>
  );
}
