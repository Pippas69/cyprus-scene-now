import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { language } = useLanguage();
  
  const translations = {
    el: {
      addToFavorites: 'Προσθήκη στα αγαπημένα',
      removeFromFavorites: 'Αφαίρεση από αγαπημένα'
    },
    en: {
      addToFavorites: 'Add to favorites',
      removeFromFavorites: 'Remove from favorites'
    }
  };
  
  const t = translations[language];
  
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
      aria-label={isFavorited ? t.removeFromFavorites : t.addToFavorites}
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
