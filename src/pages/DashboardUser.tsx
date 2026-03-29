import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MyEvents } from '@/components/user/MyEvents';
import { MyReservations } from '@/components/user/MyReservations';
import { MyOffers } from '@/components/user/MyOffers';
import { useLanguage } from '@/hooks/useLanguage';
import { UserSettings } from '@/components/user/UserSettings';
import { forceLocalSignOut } from '@/lib/authSession';

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
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        await forceLocalSignOut();
        navigate('/login', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'business') {
        navigate('/dashboard-business', { replace: true });
        return;
      }

      setUser(user);
      setLoading(false);
    } catch (error) {
      console.warn('Dashboard user auth check failed:', error);
      await forceLocalSignOut();
      navigate('/login', { replace: true });
    }
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
        <TabsContent value="events" className="animate-fade-in">
          <MyEvents userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="reservations" className="mt-4 animate-fade-in">
          <MyReservations userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="offers" className="mt-4 animate-fade-in">
          <MyOffers userId={user.id} language={language} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 animate-fade-in">
          <UserSettings userId={user.id} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardUser;
