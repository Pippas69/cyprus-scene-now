import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onClick: () => void;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const FavoriteButton = ({ 
  isFavorited, 
  onClick, 
  loading = false,
  className,
  size = 'default'
}: FavoriteButtonProps) => {
  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'default'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={loading}
      className={cn(
        "transition-all hover:scale-110",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          isFavorited && "fill-red-500 text-red-500"
        )}
      />
    </Button>
  );
};
