import { useSimilarUsers } from '@/hooks/useSimilarUsers';
import { SimilarPeopleCard } from './SimilarPeopleCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface PeopleYouMayKnowProps {
  limit?: number;
  showTitle?: boolean;
  variant?: 'card' | 'inline';
}

export const PeopleYouMayKnow = ({ 
  limit = 5, 
  showTitle = true,
  variant = 'card'
}: PeopleYouMayKnowProps) => {
  const { language } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getUser();
  }, []);

  const { data: similarUsers, isLoading, error } = useSimilarUsers(currentUserId, limit);

  if (!currentUserId) return null;

  if (isLoading) {
    return variant === 'card' ? (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {language === 'el' ? 'Άτομα που ίσως γνωρίζεις' : 'People you may know'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !similarUsers || similarUsers.length === 0) {
    if (variant === 'inline') return null;
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {language === 'el' ? 'Άτομα που ίσως γνωρίζεις' : 'People you may know'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {language === 'el' 
              ? 'Προσθέστε ενδιαφέροντα στο προφίλ σας για να βρείτε παρόμοια άτομα!' 
              : 'Add interests to your profile to find similar people!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="space-y-1">
      {similarUsers.map((user) => (
        <SimilarPeopleCard
          key={user.user_id}
          userId={user.user_id}
          name={user.name}
          avatarUrl={user.avatar_url}
          city={user.city}
          interests={user.interests}
          similarityScore={user.similarity_score}
          connectionStatus={user.connection_status}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            {language === 'el' ? 'Άτομα που ίσως γνωρίζεις' : 'People you may know'}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-4'}>
        {content}
      </CardContent>
    </Card>
  );
};
