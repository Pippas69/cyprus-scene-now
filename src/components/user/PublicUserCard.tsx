/**
 * PublicUserCard Component
 * 
 * Example component demonstrating how to display user information publicly
 * using the usePublicProfile hook which excludes sensitive data.
 * 
 * This component is safe to use in:
 * - Event attendee lists
 * - User search results
 * - Public user directories
 * - Comment/post author displays
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar } from 'lucide-react';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicUserCardProps {
  userId: string;
  showDetails?: boolean;
}

export const PublicUserCard = ({ userId, showDetails = true }: PublicUserCardProps) => {
  const { data: profile, isLoading } = usePublicProfile(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  const displayName = profile.name || 
                      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                      'Anonymous User';
  
  const initials = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <div className="font-medium">{displayName}</div>
            
            {showDetails && (
              <div className="space-y-1">
                {profile.city && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{profile.city}{profile.town && `, ${profile.town}`}</span>
                  </div>
                )}
                
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.interests.slice(0, 3).map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                    {profile.interests.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.interests.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NOTE: No email is displayed - it's not available in public profiles */}
            {/* This is by design for privacy protection */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
