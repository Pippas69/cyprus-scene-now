import { useState } from 'react';
import { useUserRSVPs } from '@/hooks/useUserRSVPs';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock } from 'lucide-react';

interface MyRSVPsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyRSVPs = ({ userId, language }: MyRSVPsProps) => {
  const { interested, going, pastInterested, pastGoing, loading } = useUserRSVPs(userId);
  const [showHistory, setShowHistory] = useState(false);

  const text = {
    el: {
      title: 'Οι Κρατήσεις Μου',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα Πάω',
      noInterested: 'Δεν έχετε σημειώσει ενδιαφέρον για καμία εκδήλωση',
      noGoing: 'Δεν έχετε επιβεβαιώσει συμμετοχή σε καμία εκδήλωση',
      history: 'Ιστορικό',
      pastEvents: 'Παρελθοντικές Εκδηλώσεις',
      noHistory: 'Δεν υπάρχει ιστορικό ακόμα',
      eventEnded: 'Ολοκληρώθηκε',
      showHistory: 'Εμφάνιση Ιστορικού',
      hideHistory: 'Απόκρυψη Ιστορικού',
    },
    en: {
      title: 'My RSVPs',
      interested: 'Interested',
      going: "I'm Going",
      noInterested: "You haven't marked interest in any events",
      noGoing: "You haven't confirmed attendance to any events",
      history: 'History',
      pastEvents: 'Past Events',
      noHistory: 'No history yet',
      eventEnded: 'Ended',
      showHistory: 'Show History',
      hideHistory: 'Hide History',
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

  const hasPastEvents = pastInterested.length > 0 || pastGoing.length > 0;

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

      {hasPastEvents && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory} className="mt-8">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">
                  {t.history} ({pastInterested.length + pastGoing.length})
                </span>
              </div>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Tabs defaultValue="past-going" className="w-full">
              <TabsList>
                <TabsTrigger value="past-going">
                  {t.going} ({pastGoing.length})
                </TabsTrigger>
                <TabsTrigger value="past-interested">
                  {t.interested} ({pastInterested.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="past-going" className="mt-6">
                {pastGoing.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t.noHistory}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastGoing.map(rsvp => (
                      <div key={rsvp.id} className="relative opacity-70 hover:opacity-90 transition-opacity">
                        <EventCard event={rsvp.event} language={language} user={{ id: userId }} />
                        <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur">
                          <Clock className="h-3 w-3 mr-1" />
                          {t.eventEnded}
                        </Badge>
                        {rsvp.notes && (
                          <Badge variant="outline" className="absolute top-2 left-2 max-w-[70%] bg-background/80 backdrop-blur">
                            Note: {rsvp.notes}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="past-interested" className="mt-6">
                {pastInterested.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t.noHistory}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastInterested.map(rsvp => (
                      <div key={rsvp.id} className="relative opacity-70 hover:opacity-90 transition-opacity">
                        <EventCard event={rsvp.event} language={language} user={{ id: userId }} />
                        <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur">
                          <Clock className="h-3 w-3 mr-1" />
                          {t.eventEnded}
                        </Badge>
                        {rsvp.notes && (
                          <Badge variant="outline" className="absolute top-2 left-2 max-w-[70%] bg-background/80 backdrop-blur">
                            Note: {rsvp.notes}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
