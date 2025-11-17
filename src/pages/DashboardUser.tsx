import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavedEvents } from '@/components/user/SavedEvents';
import { MyRSVPs } from '@/components/user/MyRSVPs';
import { MyReservations } from '@/components/user/MyReservations';
import { ProfileSettings } from '@/components/user/ProfileSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, User, CalendarCheck, Settings, ArrowLeft } from 'lucide-react';
import { UserAccountSettings } from '@/components/user/UserAccountSettings';
import { Button } from '@/components/ui/button';

const DashboardUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language] = useState<'el' | 'en'>('en');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'rsvps');

  useEffect(() => {
    checkUser();
  }, []);

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
    gr: {
      welcome: 'Καλώς ήρθατε',
      dashboard: 'Πίνακας Ελέγχου',
      rsvps: 'Οι Κρατήσεις Μου',
      reservations: 'Κρατήσεις',
      saved: 'Αποθηκευμένα',
      profile: 'Προφίλ',
      settings: 'Ρυθμίσεις',
    },
    en: {
      welcome: 'Welcome',
      dashboard: 'Dashboard',
      rsvps: 'My RSVPs',
      reservations: 'Reservations',
      saved: 'Saved Events',
      profile: 'Profile',
      settings: 'Settings',
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">
                {t.welcome}!
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard-user')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Feed
              </Button>
            </div>
          </CardHeader>
        </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="rsvps" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t.rsvps}
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                {t.reservations}
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {t.saved}
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t.profile}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t.settings}
              </TabsTrigger>
            </TabsList>

          <TabsContent value="rsvps" className="mt-6">
            <MyRSVPs userId={user.id} language={language} />
          </TabsContent>

          <TabsContent value="reservations" className="mt-6">
            <MyReservations userId={user.id} language={language} />
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <SavedEvents userId={user.id} language={language} />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings userId={user.id} language={language} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <UserAccountSettings userId={user.id} language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardUser;
