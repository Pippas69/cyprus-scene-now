import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { spring, reducedMotion } from '@/lib/motion';
import { MyEvents } from '@/components/user/MyEvents';
import { MyReservations } from '@/components/user/MyReservations';
import { MyOffers } from '@/components/user/MyOffers';
import { useLanguage } from '@/hooks/useLanguage';
import { UserSettings } from '@/components/user/UserSettings';
import { CalendarDays, Ticket, Tag, Settings } from 'lucide-react';

type Tab = 'events' | 'reservations' | 'offers' | 'settings';

// Content tabs shown in the bar — Settings is accessed via gear icon
const CONTENT_TABS: Tab[] = ['events', 'reservations', 'offers'];

const DashboardUser = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'events'
  );

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    setUser({ id: user.id });
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single();
    setFirstName(profile?.first_name || null);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'events';
    if (tab === 'profile' || tab === 'account') {
      navigate('/dashboard-user?tab=settings', { replace: true });
      return;
    }
    setActiveTab(tab as Tab);
  }, [searchParams, navigate]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    navigate(`/dashboard-user?tab=${tab}`, { replace: true });
  }, [navigate]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = CONTENT_TABS.indexOf(activeTab as typeof CONTENT_TABS[number]);
    if (idx === -1) return;
    if (e.key === 'ArrowRight') handleTabChange(CONTENT_TABS[(idx + 1) % CONTENT_TABS.length]);
    if (e.key === 'ArrowLeft') handleTabChange(CONTENT_TABS[(idx - 1 + CONTENT_TABS.length) % CONTENT_TABS.length]);
  };

  const text = {
    el: { events: 'Εκδηλώσεις', reservations: 'Κρατήσεις', offers: 'Προσφορές', hey: 'Γεια σου' },
    en: { events: 'Events', reservations: 'Reservations', offers: 'Offers', hey: 'Hey' },
  };
  const t = text[language];

  const tabConfig = [
    { id: 'events' as Tab, label: t.events, icon: CalendarDays },
    { id: 'reservations' as Tab, label: t.reservations, icon: Ticket },
    { id: 'offers' as Tab, label: t.offers, icon: Tag },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-seafoam" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="w-full max-w-full px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">

      {/* Welcome header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          {firstName && (
            <motion.p
              initial={reducedMotion ? {} : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
              className="font-urbanist font-black text-2xl sm:text-3xl text-white"
            >
              {t.hey}, {firstName}!
            </motion.p>
          )}
        </div>

        {/* Gear icon — opens Settings */}
        <motion.button
          onClick={() => handleTabChange('settings')}
          aria-label={language === 'el' ? 'Ρυθμίσεις' : 'Settings'}
          whileTap={reducedMotion ? {} : { scale: 0.92 }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors mt-0.5 border ${
            activeTab === 'settings'
              ? 'bg-seafoam/15 border-seafoam/30 text-seafoam'
              : 'bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white/70'
          }`}
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Pill tab bar — Events · Reservations · Offers only */}
      <div
        role="tablist"
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-hide"
      >
        {tabConfig.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(id)}
              className={`relative flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seafoam/50 ${
                isActive
                  ? 'text-seafoam'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
              {isActive && (
                <motion.div
                  layoutId="dashboard-tab-pill"
                  className="absolute inset-0 rounded-full bg-seafoam/12 border border-seafoam/25 -z-10"
                  transition={spring.smooth}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className={activeTab !== 'events' ? 'hidden' : ''}>
        <MyEvents userId={user.id} language={language} />
      </div>
      <div className={activeTab !== 'reservations' ? 'hidden' : ''}>
        <MyReservations userId={user.id} language={language} />
      </div>
      <div className={activeTab !== 'offers' ? 'hidden' : ''}>
        <MyOffers userId={user.id} language={language} />
      </div>
      <div className={activeTab !== 'settings' ? 'hidden' : ''}>
        <UserSettings userId={user.id} language={language} />
      </div>
    </div>
  );
};

export default DashboardUser;
