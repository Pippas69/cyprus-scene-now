import { useUserRSVPs } from '@/hooks/useUserRSVPs';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface MyRSVPsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyRSVPs = ({ userId, language }: MyRSVPsProps) => {
  const { interested, going, loading } = useUserRSVPs(userId);

  const text = {
    gr: {
      title: 'Οι Κρατήσεις Μου',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα Πάω',
      noInterested: 'Δεν έχετε σημειώσει ενδιαφέρον για καμία εκδήλωση',
      noGoing: 'Δεν έχετε επιβεβαιώσει συμμετοχή σε καμία εκδήλωση',
    },
    en: {
      title: 'My RSVPs',
      interested: 'Interested',
      going: "I'm Going",
      noInterested: "You haven't marked interest in any events",
      noGoing: "You haven't confirmed attendance to any events",
    },
  };

  const t = text[language];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  const renderEvents = (eventsList: any[], emptyMessage: string) => {
    if (eventsList.length === 0) {
      return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventsList.map(rsvp => (
          <div key={rsvp.id} className="relative">
            <EventCard event={rsvp.event} language={language} user={{ id: userId }} />
            {rsvp.notes && (
              <Badge variant="secondary" className="absolute top-2 left-2 max-w-[90%]">
                Note: {rsvp.notes}
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t.title}</h2>

      <Tabs defaultValue="going" className="w-full">
        <TabsList>
          <TabsTrigger value="going">
            {t.going} ({going.length})
          </TabsTrigger>
          <TabsTrigger value="interested">
            {t.interested} ({interested.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="going" className="mt-6">
          {renderEvents(going, t.noGoing)}
        </TabsContent>
        <TabsContent value="interested" className="mt-6">
          {renderEvents(interested, t.noInterested)}
        </TabsContent>
      </Tabs>
    </div>
  );
};
