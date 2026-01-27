import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

let sessionId: string | null = null;

/**
 * Hard kill-switch for view tracking while the user is browsing their own dashboard-user sections.
 * This is intentionally NOT based only on URL, because some mobile/webview cases can report
 * unexpected path/query values during SPA transitions.
 */
const isUserDashboardNoViewsEnabled = (): boolean => {
  try {
    return (window as any)?.__NO_VIEWS_CONTEXT === 'dashboard_user_sections';
  } catch {
    return false;
  }
};

/**
 * Views must NEVER be counted when the user is browsing from their own dashboard sections
 * (My Events / My Reservations / My Offers / Settings).
 *
 * We enforce this centrally to avoid missing any edge-case component.
 */
const isDashboardUserContext = (): boolean => {
  try {
    // Strongest rule: if the UI explicitly marked this session as "user dashboard sections",
    // do not count ANY views.
    if (isUserDashboardNoViewsEnabled()) return true;

    const path = window.location?.pathname || "";
    // ONLY the *user* dashboard sections must never count as views.
    // Business dashboard analytics must keep working normally.
    if (path.startsWith('/dashboard-user')) return true;

    const src = new URLSearchParams(window.location?.search || "").get('src');
    if (src === 'dashboard_user') return true;

    return false;
  } catch {
    return false;
  }
};

/**
 * ALLOWED SOURCES for view tracking:
 * 
 * EVENT VIEWS:
 * - /ekdiloseis page (public events discovery)
 * - Feed (boosted events only - tracked via BoostedContentSection)
 * - /event/:id page (direct event detail view)
 * 
 * OFFER VIEWS:
 * - /offers page (public offers discovery)
 * - Feed (boosted offers only - tracked via BoostedContentSection)
 * - Offer detail dialog when opened
 * 
 * NOT ALLOWED (must never count as views):
 * - /dashboard-user/* (My Events, My Reservations, My Offers)
 * - /xartis (Map - views are NOT tracked here)
 * - Business profiles (views are NOT tracked here)
 */
const isAllowedEventViewSource = (): boolean => {
  try {
    if (isDashboardUserContext()) return false;
    
    const path = window.location?.pathname || "";
    
    // Allowed: /ekdiloseis page
    if (path === '/ekdiloseis' || path.startsWith('/ekdiloseis')) return true;
    
    // Allowed: /event/:id detail page
    if (path.startsWith('/event/')) return true;
    
    // Allowed: Feed page (root / or /feed)
    if (path === '/' || path === '/feed') return true;
    
    // NOT allowed: Map, business profiles, dashboard sections
    return false;
  } catch {
    return false;
  }
};

const isAllowedOfferViewSource = (): boolean => {
  try {
    if (isDashboardUserContext()) return false;
    
    const path = window.location?.pathname || "";
    
    // Allowed: /offers page
    if (path === '/offers' || path.startsWith('/offers')) return true;
    
    // Allowed: Feed page (root / or /feed) for boosted offers
    if (path === '/' || path === '/feed') return true;
    
    // NOT allowed: Map, business profiles, dashboard sections
    return false;
  } catch {
    return false;
  }
};

const debugLog = (...args: any[]) => {
  // Keep noise out of production builds
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
};

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Track event view - ONLY from allowed sources
export const trackEventView = async (
  eventId: string,
  source: 'feed' | 'map' | 'search' | 'profile' | 'direct'
) => {
  try {
    // Check if this is an allowed source for event views
    if (!isAllowedEventViewSource()) {
      debugLog('[trackEventView] skipped - not allowed source', { 
        eventId, 
        source, 
        path: window.location?.pathname, 
        search: window.location?.search 
      });
      return;
    }

    debugLog('[trackEventView] sending', { eventId, source, path: window.location?.pathname, search: window.location?.search });

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('event_views').insert({
      event_id: eventId,
      user_id: user?.id || null,
      source,
      device_type: getDeviceType(),
      session_id: getSessionId(),
    });

    if (error) {
      console.error('Error tracking event view:', error);
    }
  } catch (error) {
    console.error('Failed to track event view:', error);
  }
};

// Track discount view - ONLY from allowed sources
export const trackDiscountView = async (
  discountId: string,
  source: 'feed' | 'event' | 'profile' | 'direct'
) => {
  try {
    // Check if this is an allowed source for offer views
    if (!isAllowedOfferViewSource()) {
      debugLog('[trackDiscountView] skipped - not allowed source', { 
        discountId, 
        source, 
        path: window.location?.pathname, 
        search: window.location?.search 
      });
      return;
    }

    debugLog('[trackDiscountView] sending', { discountId, source, path: window.location?.pathname, search: window.location?.search });

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('discount_views').insert({
      discount_id: discountId,
      user_id: user?.id || null,
      source,
      device_type: getDeviceType(),
      session_id: getSessionId(),
    });

    if (error) {
      console.error('Error tracking discount view:', error);
    }
  } catch (error) {
    console.error('Failed to track discount view:', error);
  }
};

// Track engagement event (generic)
export const trackEngagement = async (
  businessId: string,
  eventType: string,
  entityType?: 'event' | 'discount' | 'business',
  entityId?: string,
  metadata?: Record<string, any>
) => {
  try {
    // Profile views are a *view metric*. Never count them from user dashboard context.
    if (eventType === 'profile_view' && isDashboardUserContext()) {
      debugLog('[trackEngagement] profile_view skipped', { businessId, entityType, entityId, metadata, path: window.location?.pathname, search: window.location?.search, noViews: (window as any)?.__NO_VIEWS_CONTEXT });
      return;
    }

    if (eventType === 'profile_view') {
      debugLog('[trackEngagement] profile_view sending', { businessId, entityType, entityId, metadata, path: window.location?.pathname, search: window.location?.search, noViews: (window as any)?.__NO_VIEWS_CONTEXT });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('engagement_events').insert({
      business_id: businessId,
      user_id: user?.id || null,
      event_type: eventType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      session_id: getSessionId(),
      metadata: metadata || null,
    });

    if (error) {
      console.error('Failed to track engagement:', {
        eventType,
        businessId,
        entityType,
        entityId,
        error,
      });
    }
  } catch (error) {
    console.error('Failed to track engagement:', error);
  }
};

// Track offer "Redeem" click (interaction intent)
export const trackOfferRedeemClick = async (
  businessId: string,
  discountId: string,
  source: 'offer_card' | 'boosted_section' | 'offer_page' | 'other' = 'other'
) => {
  return trackEngagement(businessId, 'offer_redeem_click', 'discount', discountId, { source });
};

// Track business follow
export const trackBusinessFollow = async (
  businessId: string,
  source: 'profile' | 'event' | 'feed' | 'search' | 'direct'
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('business_followers').insert({
      business_id: businessId,
      user_id: user.id,
      source,
    });
  } catch (error) {
    console.error('Failed to track business follow:', error);
  }
};

// Track business unfollow
export const trackBusinessUnfollow = async (businessId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase
      .from('business_followers')
      .update({ unfollowed_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .is('unfollowed_at', null);
  } catch (error) {
    console.error('Failed to track business unfollow:', error);
  }
};

// Hook for tracking element visibility
export const useViewTracking = (
  elementRef: React.RefObject<HTMLElement>,
  onView: () => void,
  options: IntersectionObserverInit = { threshold: 0.5 }
) => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onView();
          observer.disconnect(); // Track only once
        }
      });
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [elementRef, onView]);
};
