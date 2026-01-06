import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MyEvents } from '@/components/user/MyEvents';
import { MyReservations } from '@/components/user/MyReservations';
import { MyOffers } from '@/components/user/MyOffers';
import { ProfileSettings } from '@/components/user/ProfileSettings';
import { Compass, Map, Ticket, Percent, GraduationCap } from 'lucide-react';
import { UserAccountSettings } from '@/components/user/UserAccountSettings';
import { useLanguage } from '@/hooks/useLanguage';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { MyTickets } from '@/components/tickets/MyTickets';
import { StudentVerificationForm } from '@/components/user/StudentVerificationForm';
import { StudentVerificationStatus } from '@/components/user/StudentVerificationStatus';
import { StudentQRCard } from '@/components/user/StudentQRCard';
import { useStudentVerification } from '@/hooks/useStudentVerification';

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
    setActiveTab(tab);
  }, [searchParams]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is a business
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'business') {
      navigate('/dashboard-business');
      return;
    }

    setUser(user);
    setLoading(false);
  };

  const text = {
    el: {
      welcome: 'Καλώς ήρθατε',
      dashboard: 'Πίνακας Ελέγχου',
      myEvents: 'Οι Εκδηλώσεις Μου',
      reservations: 'Κρατήσεις',
      offers: 'Προσφορές',
      tickets: 'Τα Εισιτήριά μου',
      profile: 'Προφίλ',
      settings: 'Ρυθμίσεις',
      browseEvents: 'Ανακάλυψε Εκδηλώσεις',
      exploreMap: 'Εξερεύνησε Χάρτη',
      studentDiscount: 'Φοιτητική Έκπτωση',
    },
    en: {
      welcome: 'Welcome',
      dashboard: 'Dashboard',
      myEvents: 'My Events',
      reservations: 'Reservations',
      offers: 'Offers',
      tickets: 'My Tickets',
      profile: 'Profile',
      settings: 'Settings',
      browseEvents: 'Browse Events',
      exploreMap: 'Explore Map',
      studentDiscount: 'Student Discount',
    },
  };

  const t = text[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get the current section title based on active tab
  const getSectionTitle = () => {
    const titles: Record<string, string> = {
      events: t.myEvents,
      reservations: t.reservations,
      offers: t.offers,
      tickets: t.tickets,
      profile: t.profile,
      settings: t.settings,
      student: t.studentDiscount,
    };
    return titles[activeTab] || t.dashboard;
  };

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{getSectionTitle()}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          {language === 'el' ? 'Διαχειριστείτε τα δεδομένα σας' : 'Manage your data'}
        </p>
      </div>

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

        <TabsContent value="reservations" className="mt-6 animate-fade-in">
          <MyReservations userId={user.id} language={language} />
        </TabsContent>

                <TabsContent value="offers" className="mt-6 animate-fade-in">
                  <MyOffers userId={user.id} language={language} />
                </TabsContent>

                <TabsContent value="tickets" className="mt-6 animate-fade-in">
                  <MyTickets />
                </TabsContent>

                <TabsContent value="profile" className="mt-6 animate-fade-in">
                  <ProfileSettings userId={user.id} language={language} />
                </TabsContent>

                <TabsContent value="settings" className="mt-6 animate-fade-in">
                  <UserAccountSettings userId={user.id} language={language} />
                </TabsContent>

                <TabsContent value="student" className="mt-6 animate-fade-in">
                  <StudentDashboard userId={user.id} language={language} />
                </TabsContent>
      </Tabs>

      {/* Quick Actions FAB */}
      <FloatingActionButton
        icon={<Compass size={24} />}
        onClick={() => navigate('/feed')}
        actions={[
          {
            icon: <Compass size={20} />,
            label: t.browseEvents,
            onClick: () => navigate('/feed')
          },
          {
            icon: <Map size={20} />,
            label: t.exploreMap,
            onClick: () => navigate('/xartis')
          },
          {
            icon: <Ticket size={20} />,
            label: t.tickets,
            onClick: () => {
              setActiveTab('tickets');
              navigate('/dashboard-user?tab=tickets', { replace: true });
            }
          },
          {
            icon: <Percent size={20} />,
            label: t.offers,
            onClick: () => {
              setActiveTab('offers');
              navigate('/dashboard-user?tab=offers', { replace: true });
            }
          }
        ]}
        position="bottom-right"
        size="large"
        variant="primary"
      />
    </div>
  );
};

// Student Dashboard Component
function StudentDashboard({ userId, language }: { userId: string; language: 'el' | 'en' }) {
  const { data: verification, isLoading } = useStudentVerification(userId);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // No verification yet - show form
  if (!verification) {
    return <StudentVerificationForm userId={userId} language={language} />;
  }
  
  // Pending or rejected - show status
  if (verification.status === 'pending' || verification.status === 'rejected') {
    return <StudentVerificationStatus verification={verification} language={language} />;
  }
  
  // Approved - show QR card
  return <StudentQRCard verification={verification} language={language} />;
}

export default DashboardUser;
