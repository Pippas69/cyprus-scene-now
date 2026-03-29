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
...
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

      // Check if user is a business
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

  const text = {
    el: {
      welcome: 'Καλώς ήρθατε',
      dashboard: 'Πίνακας Ελέγχου',
      myEvents: 'Οι Εκδηλώσεις Μου',
      reservations: 'Οι Κρατήσεις Μου',
      offers: 'Οι Προσφορές Μου',
      settings: 'Ρυθμίσεις',
      browseEvents: 'Ανακάλυψε Εκδηλώσεις',
      exploreMap: 'Εξερεύνησε Χάρτη'
    },
    en: {
      welcome: 'Welcome',
      dashboard: 'Dashboard',
      myEvents: 'My Events',
      reservations: 'My Reservations',
      offers: 'My Offers',
      settings: 'Settings',
      browseEvents: 'Browse Events',
      exploreMap: 'Explore Map'
    }
  };

  const t = text[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>);

  }

  // Get the current section title based on active tab
  const getSectionTitle = () => {
    const titles: Record<string, string> = {
      events: t.myEvents,
      reservations: t.reservations,
      offers: t.offers,
      settings: t.settings
    };
    return titles[activeTab] || t.dashboard;
  };

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
      {/* Welcome Header removed - no content needed */}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          navigate(`/dashboard-user?tab=${value}`, { replace: true });
        }}
        className="w-full">

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

      {/* Quick Actions FAB - REMOVED per user request */}
    </div>);

};

export default DashboardUser;