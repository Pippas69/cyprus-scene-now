import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEngagement } from '@/lib/analyticsTracking';

interface FollowButtonProps {
  businessId: string;
  language: 'el' | 'en';
  source?: 'profile' | 'event' | 'feed' | 'search' | 'direct';
  variant?: 'default' | 'compact';
}

export function FollowButton({ businessId, language, source = 'profile', variant = 'default' }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const translations = {
    el: {
      follow: 'Ακολουθήστε',
      following: 'Ακολουθείτε',
      followers: 'Ακόλουθοι',
      loginRequired: 'Συνδεθείτε για να ακολουθήσετε',
    },
    en: {
      follow: 'Follow',
      following: 'Following',
      followers: 'Followers',
      loginRequired: 'Login to follow',
    },
  };

  const t = translations[language];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchFollowerData();
    }
  }, [businessId, userId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchFollowerData = async () => {
    // Get follower count using direct query
    const { count } = await supabase
      .from('business_followers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .is('unfollowed_at', null);

    setFollowerCount(count || 0);

    // Check if current user is following
    if (userId) {
      const { data } = await supabase
        .from('business_followers')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .is('unfollowed_at', null)
        .maybeSingle();

      setIsFollowing(!!data);
    }
  };

  const handleToggleFollow = async () => {
    if (!userId) {
      toast.error(t.loginRequired);
      return;
    }

    setLoading(true);

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('business_followers')
        .delete()
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (!error) {
        setIsFollowing(false);
        setFollowerCount((prev) => prev - 1);
        
        // Track unfollow
        trackEngagement(businessId, 'unfavorite', 'business', businessId);
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('business_followers')
        .insert({
          business_id: businessId,
          user_id: userId,
          source,
        });

      if (!error) {
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        
        // Track follow
        trackEngagement(businessId, 'favorite', 'business', businessId, { source });
      } else if (error.code === '23505') {
        // Already following
        setIsFollowing(true);
      }
    }

    setLoading(false);
  };

  // Compact variant - icon with follower count
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFollow}
          disabled={loading}
          className={`h-8 w-8 rounded-full transition-all ${
            isFollowing 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
          }`}
          title={isFollowing ? t.following : t.follow}
        >
          <Heart className={`h-4 w-4 transition-all ${isFollowing ? 'fill-current scale-110' : ''}`} />
        </Button>
        {followerCount > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {followerCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isFollowing ? 'secondary' : 'default'}
        onClick={handleToggleFollow}
        disabled={loading}
        className={`gap-2 transition-all ${isFollowing ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
      >
        <Heart className={`h-4 w-4 transition-all ${isFollowing ? 'fill-current' : ''}`} />
        {isFollowing ? t.following : t.follow}
      </Button>
      {followerCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {followerCount} {t.followers}
        </span>
      )}
    </div>
  );
}
