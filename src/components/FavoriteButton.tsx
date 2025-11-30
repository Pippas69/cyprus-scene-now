import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { trackEngagement } from '@/lib/analyticsTracking';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onClick: () => void;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  businessId?: string;
  eventId?: string;
}

export const FavoriteButton = ({ 
  isFavorited, 
  onClick, 
  loading = false,
  className,
  size = 'default',
  businessId,
  eventId
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
  
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    
    // Track engagement
    if (businessId && eventId) {
      trackEngagement(
        businessId, 
        isFavorited ? 'unfavorite' : 'favorite',
        'event',
        eventId
      );
    }
    
    onClick();
  };
  
  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'default'}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "transition-all duration-300 ease-out",
        "hover:scale-110 hover:bg-red-50 dark:hover:bg-red-950/20",
        "active:scale-95",
        isAnimating && "animate-heart-pop",
        className
      )}
      aria-label={isFavorited ? t.removeFromFavorites : t.addToFavorites}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all duration-300",
          isFavorited && "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]",
          isAnimating && "scale-110"
        )}
      />
    </Button>
  );
};
