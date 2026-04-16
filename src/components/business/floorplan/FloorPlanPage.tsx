import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout, Layers } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { FloorPlanEventLayouts } from './FloorPlanEventLayouts';
import { FloorPlanTemplateManager } from './FloorPlanTemplateManager';

interface FloorPlanPageProps {
  businessId: string;
}

const translations = {
  el: {
    eventLayouts: 'Εκδηλώσεις',
    templates: 'Πρότυπα',
  },
  en: {
    eventLayouts: 'Events',
    templates: 'Templates',
  },
};

export function FloorPlanPage({ businessId }: FloorPlanPageProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[340px] bg-card/60 border border-border/20">
          <TabsTrigger value="events" className="gap-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Layout className="h-3.5 w-3.5" />
            {t.eventLayouts}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Layers className="h-3.5 w-3.5" />
            {t.templates}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          <FloorPlanEventLayouts businessId={businessId} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <FloorPlanTemplateManager businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
