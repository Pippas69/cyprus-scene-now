import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout, Layers, CalendarDays, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { el as elLocale, enUS } from 'date-fns/locale';
import { FloorPlanEventLayouts } from './FloorPlanEventLayouts';
import { FloorPlanTemplateManager } from './FloorPlanTemplateManager';

interface FloorPlanPageProps {
  businessId: string;
}

interface FloorPlanEvent {
  id: string;
  title: string;
  start_at: string;
}

const translations = {
  el: {
    eventLayouts: 'Εκδηλώσεις',
    templates: 'Πρότυπα',
    selectEvent: 'Επιλέξτε εκδήλωση...',
    noEvents: 'Δεν υπάρχουν εκδηλώσεις',
  },
  en: {
    eventLayouts: 'Events',
    templates: 'Templates',
    selectEvent: 'Select event...',
    noEvents: 'No events',
  },
};

export function FloorPlanPage({ businessId }: FloorPlanPageProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<FloorPlanEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true);
      const { data } = await supabase
        .from('events')
        .select('id, title, start_at')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('start_at', { ascending: true });

      const loaded = (data || []) as FloorPlanEvent[];
      setEvents(loaded);
      if (loaded.length > 0) {
        setSelectedEventId(loaded[0].id);
      }
      setLoadingEvents(false);
    };
    loadEvents();
  }, [businessId]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList className="grid grid-cols-2 w-[240px] bg-card/60 border border-border/20 flex-shrink-0">
            <TabsTrigger value="events" className="gap-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Layout className="h-3.5 w-3.5" />
              {t.eventLayouts}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Layers className="h-3.5 w-3.5" />
              {t.templates}
            </TabsTrigger>
          </TabsList>

          {/* Event selector — inline with tabs, only when events tab is active */}
          {activeTab === 'events' && !loadingEvents && events.length > 0 && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={selectedEventId || ''} onValueChange={(val) => setSelectedEventId(val)}>
                <SelectTrigger className="h-9 text-xs bg-card/80 border-border/30 flex-1 min-w-0">
                  <SelectValue placeholder={t.selectEvent} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id} className="text-xs">
                      {format(new Date(ev.start_at), 'EEE d MMM', { locale: language === 'el' ? elLocale : enUS })} · {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'events' && loadingEvents && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <TabsContent value="events" className="mt-4">
          {!loadingEvents && events.length === 0 ? (
            <div className="border-2 border-dashed border-border/40 rounded-xl py-16 flex flex-col items-center justify-center gap-3">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t.noEvents}</p>
            </div>
          ) : (
            <FloorPlanEventLayouts businessId={businessId} selectedEventId={selectedEventId} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <FloorPlanTemplateManager businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
