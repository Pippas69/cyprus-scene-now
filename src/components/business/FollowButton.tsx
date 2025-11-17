import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowButtonProps {
  businessId: string;
  language: 'el' | 'en';
}

export function FollowButton({ businessId, language }: FollowButtonProps) {
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
    fetchFollowerData();
  }, [businessId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchFollowerData = async () => {
    // Get follower count
    const { data: countData } = await supabase.rpc('get_business_follower_count', {
      business_id_param: businessId,
    });

    setFollowerCount(countData || 0);

    // Check if current user is following
    if (userId) {
      const { data } = await supabase
        .from('business_followers')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
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
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('business_followers')
        .insert({
          business_id: businessId,
          user_id: userId,
        });

      if (!error) {
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      } else if (error.code === '23505') {
        // Already following
        setIsFollowing(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isFollowing ? 'secondary' : 'default'}
        onClick={handleToggleFollow}
        disabled={loading}
        className="gap-2"
      >
        <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
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
