import { useEventRSVPs } from '@/hooks/useEventRSVPs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, CheckCircle, Radio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EventAttendeesProps {
  eventId: string;
}

export const EventAttendees = ({ eventId }: EventAttendeesProps) => {
  const { data, isLoading } = useEventRSVPs(eventId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendees
            </CardTitle>
            <Badge variant="secondary" className="gap-1.5">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalAttendees = (data?.interested.length || 0) + (data?.going.length || 0);

  if (totalAttendees === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendees
            </CardTitle>
            <Badge variant="secondary" className="gap-1.5">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No public attendees yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees ({totalAttendees})
          </CardTitle>
          <Badge variant="secondary" className="gap-1.5">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="going" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="going" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Going ({data?.going.length || 0})
            </TabsTrigger>
            <TabsTrigger value="interested" className="gap-2">
              <Heart className="h-4 w-4" />
              Interested ({data?.interested.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="going" className="space-y-3 mt-4">
            {data?.going.map(attendee => (
              <AttendeeItem key={attendee.user_id} attendee={attendee} />
            ))}
            {data?.going.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No one confirmed yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="interested" className="space-y-3 mt-4">
            {data?.interested.map(attendee => (
              <AttendeeItem key={attendee.user_id} attendee={attendee} />
            ))}
            {data?.interested.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No interested users yet
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const AttendeeItem = ({ attendee }: { attendee: any }) => {
  const displayName = attendee.name || 'Anonymous';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={attendee.avatar_url || undefined} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
        {attendee.city && (
          <p className="text-xs text-muted-foreground truncate">
            {attendee.city}{attendee.town && `, ${attendee.town}`}
          </p>
        )}
      </div>
    </div>
  );
};
