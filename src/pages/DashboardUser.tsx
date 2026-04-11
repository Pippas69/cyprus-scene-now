import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MyEvents } from '@/components/user/MyEvents';
import { MyReservations } from '@/components/user/MyReservations';
import { MyOffers } from '@/components/user/MyOffers';
import { useLanguage } from '@/hooks/useLanguage';
import { UserSettings } from '@/components/user/UserSettings';
import { MyTickets } from '@/components/tickets';

const DashboardUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'events');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'events';
    if (tab === 'profile' || tab === 'account') {
      navigate('/dashboard-user?tab=settings', { replace: true });
      return;
    }
    setActiveTab(tab);
  }, [searchParams, navigate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/login');
      return;
    }

    setUser(user);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          navigate(`/dashboard-user?tab=${value}`, { replace: true });
        }}
        className="w-full"
      >
        <TabsContent value="events" forceMount className={`animate-fade-in ${activeTab !== 'events' ? 'hidden' : ''}`}>
          <MyEvents userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="tickets" forceMount className={`mt-4 animate-fade-in ${activeTab !== 'tickets' ? 'hidden' : ''}`}>
          <MyTickets />
        </TabsContent>

        <TabsContent value="reservations" forceMount className={`mt-4 animate-fade-in ${activeTab !== 'reservations' ? 'hidden' : ''}`}>
          <MyReservations userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="offers" forceMount className={`mt-4 animate-fade-in ${activeTab !== 'offers' ? 'hidden' : ''}`}>
          <MyOffers userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="settings" forceMount className={`mt-4 animate-fade-in ${activeTab !== 'settings' ? 'hidden' : ''}`}>
          <UserSettings userId={user.id} language={language} />
        </TabsContent>
      </Tabs>

      {/* Quick Actions FAB - REMOVED per user request */}
    </div>);

};

export default DashboardUser;