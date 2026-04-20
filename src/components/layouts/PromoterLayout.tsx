import { ReactNode, useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PromoterSidebar } from '@/components/promoter/PromoterSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import { UserAccountDropdown } from '@/components/UserAccountDropdown';
import { SidebarMobileClose } from '@/components/SidebarMobileClose';
import type { User } from '@supabase/supabase-js';

interface PromoterLayoutProps {
  children: ReactNode;
}

interface PromoterContextValue {
  userId: string | undefined;
}

const PromoterContext = createContext<PromoterContextValue>({ userId: undefined });

export const usePromoterContext = () => useContext(PromoterContext);

export function PromoterLayout({ children }: PromoterLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof (el as any).scrollTo === 'function') {
      (el as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.search]);

  // Prefetch όλων των promoter queries μόλις γνωρίζουμε τον userId
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    // Applications
    queryClient.prefetchQuery({
      queryKey: ['promoter-applications', uid],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('promoter_applications')
          .select(`*, business:businesses!promoter_applications_business_id_fkey(id, name, logo_url, city, category)`)
          .eq('promoter_user_id', uid)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });

    // Totals (clicks / sales / earnings)
    queryClient.prefetchQuery({
      queryKey: ['promoter-totals', uid],
      queryFn: async () => {
        const { data: links } = await supabase
          .from('promoter_links')
          .select('clicks_count, conversions_count')
          .eq('promoter_user_id', uid);
        const { data: attrs } = await supabase
          .from('promoter_attributions')
          .select('commission_earned_cents')
          .eq('promoter_user_id', uid)
          .neq('status', 'cancelled');
        return {
          totalClicks: (links || []).reduce((s, l: any) => s + (l.clicks_count || 0), 0),
          totalSales: (links || []).reduce((s, l: any) => s + (l.conversions_count || 0), 0),
          totalEarningsCents: (attrs || []).reduce((s, a: any) => s + (a.commission_earned_cents || 0), 0),
        };
      },
      staleTime: 2 * 60 * 1000,
    });

    // Attributions list
    queryClient.prefetchQuery({
      queryKey: ['promoter-attributions', uid],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('promoter_attributions')
          .select(`id, customer_name, customer_email, event_id, order_amount_cents, commission_earned_cents, status, created_at, events:event_id(title), businesses:business_id(name)`)
          .eq('promoter_user_id', uid)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          event_id: r.event_id,
          event_title: r.events?.title || null,
          business_name: r.businesses?.name || null,
          order_amount_cents: r.order_amount_cents || 0,
          commission_earned_cents: r.commission_earned_cents || 0,
          status: r.status,
          created_at: r.created_at,
        }));
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [user?.id, queryClient]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      setUserName(profile?.name || user.email?.split('@')[0] || 'User');
      setUserAvatarUrl(profile?.avatar_url || null);
    };

    load();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        navigate('/');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Μόνο ενημέρωσε το state, ΜΗΝ ξανατρέχεις profile fetch αν ήδη υπάρχει
        if (!user) load();
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <PromoterContext.Provider value={{ userId: user?.id }}>
      <SidebarProvider>
        <SidebarMobileClose />
        <div className="min-h-screen flex flex-col w-full bg-background">
          <header className="h-12 sm:h-14 border-b flex items-center px-2 sm:px-4 bg-background sticky top-0 z-50 overflow-visible">
            <SidebarTrigger className="mr-2 sm:mr-4 shrink-0" />
            <button onClick={() => navigate('/')} className="shrink-0">
              <Logo size="sm" />
            </button>

            <div className="ml-auto flex items-center">
              <div className="mr-1 sm:mr-2 shrink-0">
                <LanguageToggle />
              </div>
              {user && (
                <UserAccountDropdown
                  userId={user.id}
                  userName={userName}
                  avatarUrl={userAvatarUrl || user?.user_metadata?.avatar_url}
                />
              )}
            </div>
          </header>

          <div className="flex flex-1 w-full min-h-0">
            <PromoterSidebar />
            <main
              data-scroll-container
              ref={(node) => { scrollRef.current = node as unknown as HTMLElement | null; }}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background relative z-10 max-w-full [-webkit-overflow-scrolling:touch]"
            >
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PromoterContext.Provider>
  );
}
