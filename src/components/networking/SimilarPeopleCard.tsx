import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionButton } from './ConnectionButton';
import { MapPin, Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface SimilarPersonProps {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  interests: string[] | null;
  similarityScore: number;
  connectionStatus: string | null;
  currentUserId: string;
  showFullCard?: boolean;
}

export const SimilarPeopleCard = ({
  userId,
  name,
  avatarUrl,
  city,
  interests,
  similarityScore,
  currentUserId,
  showFullCard = false
}: SimilarPersonProps) => {
  const { language } = useLanguage();
  const displayName = name || (language === 'el' ? 'Ανώνυμος' : 'Anonymous');
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Get match level based on similarity score
  const getMatchLevel = (score: number) => {
    if (score >= 70) return { label: language === 'el' ? 'Εξαιρετικό' : 'Great', color: 'bg-green-500' };
    if (score >= 40) return { label: language === 'el' ? 'Καλό' : 'Good', color: 'bg-blue-500' };
    return { label: language === 'el' ? 'Κάποιο' : 'Some', color: 'bg-yellow-500' };
  };

  const matchLevel = getMatchLevel(similarityScore);

  if (showFullCard) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <Badge variant="secondary" className={`text-xs text-white ${matchLevel.color}`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {matchLevel.label}
                </Badge>
              </div>
              
              {city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {city}
                </p>
              )}
              
              {interests && interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {interests.slice(0, 3).map((interest, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {interests.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{interests.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              <ConnectionButton 
                currentUserId={currentUserId} 
                targetUserId={userId}
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version for lists
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{displayName}</p>
          <div className={`w-2 h-2 rounded-full ${matchLevel.color}`} title={`${similarityScore}% match`} />
        </div>
        {city && (
          <p className="text-xs text-muted-foreground truncate">{city}</p>
        )}
      </div>
      
      <ConnectionButton 
        currentUserId={currentUserId} 
        targetUserId={userId}
        size="icon"
        variant="ghost"
      />
    </div>
  );
};
