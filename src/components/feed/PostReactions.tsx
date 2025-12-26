import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactionType } from '@/hooks/usePostReactions';

interface PostReactionsProps {
  reactions: {
    like: number;
    love: number;
    fire: number;
    laugh: number;
  };
  userReaction: string | null;
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  fire: '🔥',
  laugh: '😂',
};

export function PostReactions({ reactions, userReaction, onReact, disabled }: PostReactionsProps) {
  const reactionTypes: ReactionType[] = ['like', 'love', 'fire', 'laugh'];

  return (
    <div className="flex items-center gap-1">
      {reactionTypes.map((type) => {
        const count = reactions[type];
        const isActive = userReaction === type;
        
        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => onReact(type)}
            disabled={disabled}
            className={cn(
              'h-8 px-2 gap-1 text-sm transition-all',
              isActive && 'bg-primary/10 text-primary'
            )}
          >
            <span className={cn(
              'text-base transition-transform',
              isActive && 'scale-110'
            )}>
              {REACTION_EMOJIS[type]}
            </span>
            {count > 0 && (
              <span className="text-xs font-medium">{count}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
