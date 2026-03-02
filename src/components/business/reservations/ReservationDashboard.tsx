import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReservationSlotManager } from './ReservationSlotManager';
import { ReservationStaffControls } from './ReservationStaffControls';
import { DirectReservationsList } from './DirectReservationsList';
import { supabase } from '@/integrations/supabase/client';


interface ReservationDashboardProps {
  businessId: string;
  language: 'el' | 'en';
}

export const ReservationDashboard = ({ businessId, language }: ReservationDashboardProps) => {
  const [activeTab, setActiveTab] = useState('list');
  const [isTicketLinked, setIsTicketLinked] = useState(false);
  const [reservationCount, setReservationCount] = useState(0);

  const text = useMemo(
    () => ({
      el: {
        reservations: 'Κρατήσεις',
        staffControl: 'Έλεγχος',
        settings: 'Ρυθμίσεις',
        list: 'Διαχείριση',
        description: 'Διαχειριστείτε τις κρατήσεις από το προφίλ και τις προσφορές σας'
      },
      en: {
        reservations: 'Reservations',
        staffControl: 'Staff Control',
        settings: 'Settings',
        list: 'Reservation List',
        description: 'Manage reservations from your profile and offers'
      }
    }),
    []
  );

  const t = text[language];

  useEffect(() => {
    const checkLinked = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('ticket_reservation_linked')
        .eq('id', businessId)
        .single();
      setIsTicketLinked(!!data?.ticket_reservation_linked);
    };
    checkLinked();
  }, [businessId]);

  return (
    <div className="p-4 md:p-6 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate">
          {t.reservations}
          {isTicketLinked && (
            <span className="text-muted-foreground font-normal text-lg md:text-xl ml-2">({reservationCount})</span>
          )}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
        {/* Tabs: compact + never overflow the page */}
        <TabsList className="w-full flex gap-2 p-1 overflow-x-hidden">
          <TabsTrigger value="list" className="gap-2 flex-1 min-w-0">
            <span className="truncate">{t.list}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 flex-1 min-w-0">
            <span className="truncate">{t.staffControl}</span>
          </TabsTrigger>
          {!isTicketLinked && (
            <TabsTrigger value="settings" className="gap-2 flex-1 min-w-0">
              <span className="truncate">{t.settings}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <DirectReservationsList
            businessId={businessId}
            language={language}
            onReservationCountChange={isTicketLinked ? setReservationCount : undefined}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <ReservationStaffControls businessId={businessId} language={language} />
        </TabsContent>

        {!isTicketLinked && (
          <TabsContent value="settings" className="mt-4">
            <ReservationSlotManager businessId={businessId} language={language} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
