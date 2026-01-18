import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { QRScanner } from '../QRScanner';
import { Settings2, Power, List } from 'lucide-react';

interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const text = useMemo(
    () => ({
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
    }),
    []
  );

  const t = text[language];

  return (
    <div className="p-4 md:p-6 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header: title + QR scan on the same row */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{t.reservations}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{t.description}</p>
        </div>

        {activeTab === 'list' ? (
          <div className="shrink-0">
            <QRScanner
              businessId={businessId}
              language={language}
              onReservationVerified={() => setRefreshNonce((n) => n + 1)}
            />
          </div>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
        {/* Tabs: compact + never overflow the page */}
        <TabsList className="w-full flex gap-2 p-1 overflow-x-hidden">
          <TabsTrigger value="list" className="gap-2 flex-1 min-w-0">
            <List className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.list}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 flex-1 min-w-0">
            <Power className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.staffControl}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 flex-1 min-w-0">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.settings}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <DirectReservationsList businessId={businessId} language={language} refreshNonce={refreshNonce} />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <ReservationStaffControls businessId={businessId} language={language} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <ReservationSlotManager businessId={businessId} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

