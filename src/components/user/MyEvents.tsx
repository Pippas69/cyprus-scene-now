import { useState } from 'react';
import { useUserRSVPs } from '@/hooks/useUserRSVPs';
import { supabase } from '@/integrations/supabase/client';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, Heart, CalendarCheck, Star } from 'lucide-react';
import { useEffect } from 'react';

interface MyEventsProps {
  userId: string;
  language: 'el' | 'en';
}

export const MyEvents = ({ userId, language }: MyEventsProps) => {
  const { interested, going, pastInterested, pastGoing, loading: rsvpLoading } = useUserRSVPs(userId);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchSavedEvents();
  }, [userId]);

  const fetchSavedEvents = async () => {
    setSavedLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        created_at,
        event:events(
          *,
          business:businesses(id, name, logo_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const eventsData = data.map(f => ({
        ...f.event,
        favorited_at: f.created_at
      }));
      setSavedEvents(eventsData);
    }
    setSavedLoading(false);
  };

  const upcomingSaved = savedEvents.filter(e => new Date(e.start_at) > new Date());
  const pastSaved = savedEvents.filter(e => new Date(e.start_at) <= new Date());

  const text = {
    el: {
      title: 'Οι Εκδηλώσεις Μου',
      going: 'Θα Πάω',
      interested: 'Ενδιαφέρομαι',
      saved: 'Αποθηκευμένα',
      noGoing: 'Δεν έχετε επιβεβαιώσει συμμετοχή σε καμία εκδήλωση',
      noInterested: 'Δεν έχετε σημειώσει ενδιαφέρον για καμία εκδήλωση',
      noSaved: 'Δεν έχετε αποθηκευμένες εκδηλώσεις',
      history: 'Ιστορικό',
      eventEnded: 'Ολοκληρώθηκε',
      noHistory: 'Δεν υπάρχει ιστορικό ακόμα',
    },
    en: {
      title: 'My Events',
      going: "Going",
      interested: 'Interested',
      saved: 'Saved',
      noGoing: "You haven't confirmed attendance to any events",
      noInterested: "You haven't marked interest in any events",
      noSaved: "You haven't saved any events",
      history: 'History',
      eventEnded: 'Ended',
      noHistory: 'No history yet',
    },
  };

  const t = text[language];
  const loading = rsvpLoading || savedLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const renderEvents = (eventsList: any[], emptyMessage: string, isRsvp = false) => {
    if (eventsList.length === 0) {
      return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventsList.map(item => {
          const event = isRsvp ? item.event : item;
          const key = isRsvp ? item.id : event.id;
          return (
            <div key={key} className="relative">
              <EventCard event={event} language={language} user={{ id: userId }} />
              {isRsvp && item.notes && (
                <Badge variant="secondary" className="absolute top-2 left-2 max-w-[90%]">
                  Note: {item.notes}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPastEvents = (eventsList: any[], isRsvp = false) => {
    if (eventsList.length === 0) {
      return <p className="text-center text-muted-foreground py-8">{t.noHistory}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventsList.map(item => {
          const event = isRsvp ? item.event : item;
          const key = isRsvp ? item.id : event.id;
          return (
            <div key={key} className="relative opacity-70 hover:opacity-90 transition-opacity">
              <EventCard event={event} language={language} user={{ id: userId }} />
              <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur">
                <Clock className="h-3 w-3 mr-1" />
                {t.eventEnded}
              </Badge>
              {isRsvp && item.notes && (
                <Badge variant="outline" className="absolute top-2 left-2 max-w-[70%] bg-background/80 backdrop-blur">
                  Note: {item.notes}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const hasPastEvents = pastInterested.length > 0 || pastGoing.length > 0 || pastSaved.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t.title}</h2>

      <Tabs defaultValue="going" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="going" className="flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4" />
            {t.going} ({going.length})
          </TabsTrigger>
          <TabsTrigger value="interested" className="flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            {t.interested} ({interested.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" />
            {t.saved} ({upcomingSaved.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="going" className="mt-6">
          {renderEvents(going, t.noGoing, true)}
        </TabsContent>
        <TabsContent value="interested" className="mt-6">
          {renderEvents(interested, t.noInterested, true)}
        </TabsContent>
        <TabsContent value="saved" className="mt-6">
          {renderEvents(upcomingSaved, t.noSaved, false)}
        </TabsContent>
      </Tabs>

      {hasPastEvents && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory} className="mt-8">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">
                  {t.history} ({pastGoing.length + pastInterested.length + pastSaved.length})
                </span>
              </div>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Tabs defaultValue="past-going" className="w-full">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="past-going" className="flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4" />
                  {t.going} ({pastGoing.length})
                </TabsTrigger>
                <TabsTrigger value="past-interested" className="flex items-center gap-1.5">
                  <Star className="h-4 w-4" />
                  {t.interested} ({pastInterested.length})
                </TabsTrigger>
                <TabsTrigger value="past-saved" className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  {t.saved} ({pastSaved.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="past-going" className="mt-6">
                {renderPastEvents(pastGoing, true)}
              </TabsContent>
              <TabsContent value="past-interested" className="mt-6">
                {renderPastEvents(pastInterested, true)}
              </TabsContent>
              <TabsContent value="past-saved" className="mt-6">
                {renderPastEvents(pastSaved, false)}
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};