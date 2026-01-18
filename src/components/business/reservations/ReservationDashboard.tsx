import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { Settings2, Power, List } from 'lucide-react';

interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');

  const text = {
    el: {
      reservations: 'Κρατήσεις',
      staffControl: 'Έλεγχος Staff',
      settings: 'Ρυθμίσεις',
      list: 'Λίστα Κρατήσεων',
      description: 'Διαχειριστείτε τις κρατήσεις από το προφίλ και τις προσφορές σας',
    },
    en: {
      reservations: 'Reservations',
      staffControl: 'Staff Control',
      settings: 'Settings',
      list: 'Reservation List',
      description: 'Manage reservations from your profile and offers',
    },
  };

  const t = text[language];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t.reservations}</h1>
        <p className="text-muted-foreground mt-1">{t.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">{t.list}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Power className="h-4 w-4" />
            <span className="hidden sm:inline">{t.staffControl}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <DirectReservationsList businessId={businessId} language={language} />
        </TabsContent>

        <TabsContent value="staff" className="mt-0">
          <ReservationStaffControls businessId={businessId} language={language} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <ReservationSlotManager businessId={businessId} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
