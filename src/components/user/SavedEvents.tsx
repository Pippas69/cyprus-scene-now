import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedEventCard } from '@/components/feed/UnifiedEventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SavedEventsProps {
  userId: string;
  language: 'el' | 'en';
}

export const SavedEvents = ({ userId, language }: SavedEventsProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'added' | 'date' | 'popular'>('added');

  useEffect(() => {
    fetchSavedEvents();
  }, [userId]);

  const fetchSavedEvents = async () => {
    setLoading(true);
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
      setEvents(eventsData);
    }
    setLoading(false);
  };

  const upcomingEvents = events.filter(e => new Date(e.start_at) > new Date());
  const pastEvents = events.filter(e => new Date(e.start_at) <= new Date());

  const text = {
    el: {
      title: 'Αποθηκευμένα Εκδηλώσεις',
      upcoming: 'Επερχόμενα',
      past: 'Παρελθόντα',
      filterCategory: 'Κατηγορία',
      sortBy: 'Ταξινόμηση',
      addedDate: 'Ημερομηνία Προσθήκης',
      eventDate: 'Ημερομηνία Εκδήλωσης',
      popularity: 'Δημοφιλία',
      empty: 'Δεν έχετε αποθηκευμένες εκδηλώσεις ακόμα.',
      explore: 'Εξερευνήστε εκδηλώσεις και πατήστε την καρδιά για να αποθηκεύσετε!',
    },
    en: {
      title: 'Saved Events',
      upcoming: 'Upcoming',
      past: 'Past',
      filterCategory: 'Category',
      sortBy: 'Sort By',
      addedDate: 'Date Added',
      eventDate: 'Event Date',
      popularity: 'Popularity',
      empty: "You haven't saved any events yet.",
      explore: 'Explore events and tap the heart icon to save!',
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

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-2xl font-semibold mb-4">{t.empty}</h3>
        <p className="text-muted-foreground">{t.explore}</p>
      </div>
    );
  }

  const renderEvents = (eventsList: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {eventsList.map(event => (
        <div key={event.id}>
          {/* Mobile: mobileFixed matches MyOffers card, Desktop: full */}
          <div className="md:hidden">
            <UnifiedEventCard event={event} language={language} size="mobileFixed" />
          </div>
          <div className="hidden md:block">
            <UnifiedEventCard event={event} language={language} size="full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-3xl font-bold">{t.title}</h2>
        <div className="flex gap-3">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="added">{t.addedDate}</SelectItem>
              <SelectItem value="date">{t.eventDate}</SelectItem>
              <SelectItem value="popular">{t.popularity}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            {t.upcoming} ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            {t.past} ({pastEvents.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming saved events</p>
          ) : (
            renderEvents(upcomingEvents)
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {pastEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No past saved events</p>
          ) : (
            renderEvents(pastEvents)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
